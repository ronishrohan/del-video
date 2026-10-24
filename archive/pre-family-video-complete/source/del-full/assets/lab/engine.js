const LAB = window.LAB = {vars:[], register(v){this.vars.push(v)}};
// ---------- deterministic helpers (port 1:1) ----------
LAB.rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
LAB.hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
LAB.noise = (x, y, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const h = LAB.hash; const a = h(xi, yi, s), b = h(xi + 1, yi, s), c = h(xi, yi + 1, s), d = h(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
LAB.BAYER8 = (() => { const m = [0, 2, 3, 1], out = new Float32Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0; for (let b = 0; b < 3; b++) v = v * 4 + m[(((x >> (2 - b)) & 1)) + (((y >> (2 - b)) & 1) << 1)]; out[y * 8 + x] = (v + 0.5) / 64; } return out; })();
LAB.THEMES = {
  dark:  { bg: [11, 12, 14],   fg: [214, 218, 224], ac: [150, 176, 204] },
  paper: { bg: [233, 230, 223], fg: [20, 21, 24],   ac: [62, 92, 130] },
};
LAB.CODEX = [86, 148, 255]; LAB.CLAUDE = [232, 124, 64];
LAB.css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
LAB.FONT = 'ui-monospace,SFMono-Regular,Menlo,monospace';
// glyph atlas: one row of chars, colored, cached per (chars, color, cell size)
const atlasCache = new Map();
LAB.atlas = (chars, color, cw, ch) => {
  const key = chars + '|' + color + '|' + cw + 'x' + ch;
  let a = atlasCache.get(key); if (a) return a;
  const c = document.createElement('canvas'); c.width = cw * chars.length; c.height = ch;
  const x = c.getContext('2d'); x.fillStyle = color; x.textBaseline = 'middle'; x.textAlign = 'center';
  x.font = `${Math.round(ch * 0.86)}px ${LAB.FONT}`;
  for (let i = 0; i < chars.length; i++) x.fillText(chars[i], i * cw + cw / 2, ch / 2 + 0.5);
  a = { canvas: c, cw, ch, key: color, index: new Map([...chars].map((k, i) => [k, i])) };
  if (atlasCache.size > 200) atlasCache.clear();
  atlasCache.set(key, a); return a;
};
// draw a string with an atlas at cell coords (no per-frame fillText)
LAB.text = (ctx, a, str, x, y) => { for (let i = 0; i < str.length; i++) { const k = a.index.get(str[i]); if (k !== undefined && str[i] !== ' ') ctx.drawImage(a.canvas, k * a.cw, 0, a.cw, a.ch, x + i * a.cw, y, a.cw, a.ch); } };
// whole-line bitmap cache: one drawImage per row for scrolling text (lines are pure functions of their index)
const lineCache = new Map();
LAB.line = (ctx, a, str, x, y) => {
  if (!str) return;
  const key = a.canvas.width + '|' + a.ch + '|' + a.key + '|' + str;
  let c = lineCache.get(key);
  if (!c) {
    if (lineCache.size > 4000) lineCache.clear();
    c = document.createElement('canvas'); c.width = Math.max(1, str.length * a.cw); c.height = a.ch;
    LAB.text(c.getContext('2d'), a, str, 0, 0); lineCache.set(key, c);
  }
  ctx.drawImage(c, x, y);
};

// ---------- shared WebGL (one context for all shader tiles) ----------
const glc = document.createElement('canvas');
const gl = glc.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false });
const PRELUDE = `precision highp float;
uniform vec2 uRes; uniform float uTime, uSeed; uniform vec3 uBg, uFg, uAc;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + uSeed*0.013); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+17.1; a*=.5; } return s; }
float bayer2(vec2 a){ a=floor(a); return fract(a.x/2. + a.y*a.y*.75); }
float bayer4(vec2 a){ return bayer2(.5*a)*.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(.5*a)*.25 + bayer2(a); }
vec3 ink(float on){ return on > .5 ? uFg : uBg; }
`;
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';
function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(v) {
  if (v._prog) return v._prog;
  const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, PRELUDE + v.frag)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; for (const n of ['uRes', 'uTime', 'uSeed', 'uBg', 'uFg', 'uAc', 'uP']) u[n] = gl.getUniformLocation(p, n);
  return (v._prog = { p, u });
}
const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
function renderGL(v, ctx, W, H, t, seed, th) {
  if (glc.width !== W || glc.height !== H) { glc.width = W; glc.height = H; }
  const { p, u } = program(v); gl.viewport(0, 0, W, H); gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uTime, t); gl.uniform1f(u.uSeed, seed);
  const c = (k) => gl.uniform3f(u[k], th[k.slice(1).toLowerCase()][0] / 255, th[k.slice(1).toLowerCase()][1] / 255, th[k.slice(1).toLowerCase()][2] / 255);
  c('uBg'); c('uFg'); c('uAc');
  if (u.uP && v.params) gl.uniform4fv(u.uP, v.params(t, seed));
  gl.drawArrays(gl.TRIANGLES, 0, 3); ctx.drawImage(glc, 0, 0);
}

