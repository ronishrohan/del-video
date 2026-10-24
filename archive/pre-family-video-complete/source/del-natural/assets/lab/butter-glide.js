// 13 Butter glide: the one long unbroken camera move across an endless plane of live panes.
// Camera is a smooth function of t, snapped to whole pixels; dither is anchored to world pixels so nothing swims.
LAB.register({
  name: 'Butter glide',
  tech: 'GLSL: world of split panes + pseudo-glyph text, continuous eased glide (translation only), world-anchored Bayer',
  beat: '39.4-42.8 s "Smooth like butter. Every frame." the one long continuous move',
  seed: 13,
  px: 1,
  maxW: 1920,
  frag: `
const float UNITS = 1.7; // world units per screen height (constant: no zoom)
float h1(float a, float b){ return hash(vec2(a, b)); }
void main(){
  float px = UNITS / uRes.y;
  // glide: velocity eases in over 1.5 s and keeps a gentle drift; integrated position (pure f(t))
  float t = uTime;
  vec2 cam = vec2(0.42 * t + 0.6 * sin(t * 0.23), 0.16 * t + 0.35 * sin(t * 0.17 + 1.0));
  cam -= vec2(0.42, 0.16) * 1.5 * (1.0 - exp(-t / 1.5)); // soft start
  vec2 camPx = floor(cam / px);
  vec2 wpx = gl_FragCoord.xy + camPx;             // world pixel coordinate
  vec2 p = wpx * px;                               // world units

  // big cells, each split into 2-4 panes by hashes
  vec2 cell = floor(p), f = p - cell;
  float r1 = h1(cell.x, cell.y), r2 = h1(cell.y + 7.1, cell.x), r3 = h1(cell.x + 3.3, cell.y - 9.4);
  float sx = 0.3 + 0.4 * r1, sy = 0.3 + 0.4 * r2;
  vec2 lo = vec2(0.0), hi = vec2(1.0); float id = 0.0;
  if (f.x < sx) { hi.x = sx; id = 1.0; } else { lo.x = sx; id = 2.0; if (r3 > 0.35) { if (f.y < sy) { hi.y = sy; id = 3.0; } else lo.y = sy; } }
  if (id == 1.0 && r3 < 0.5) { float s2 = 0.35 + 0.3 * r3; if (f.y < s2) { hi.y = s2; id = 4.0; } else lo.y = s2; }
  float pid = id + cell.x * 7.0 + cell.y * 131.0;
  vec2 q = f - lo, sz = hi - lo;
  float gap = 2.0 * px;
  float on = 0.0;
  // pane frame (1 px world-anchored lines) inset by a gap
  vec2 dq = min(q, sz - q);
  bool inside = dq.x > gap && dq.y > gap;
  bool edge = inside && (dq.x < gap + px || dq.y < gap + px);
  if (edge) on = 1.0;
  // title bar (top in world = high y): dithered 50%
  float rowH = 0.028, titleH = rowH * 1.4;
  if (inside && !edge && sz.y - q.y < titleH + gap) on = step(bayer8(wpx), 0.5);
  // text: rows scroll at a pane-specific rate; glyph blocks with gaps
  if (inside && !edge && sz.y - q.y >= titleH + gap) {
    float speed = 0.5 + 2.5 * h1(pid, 2.0);
    float yy = (sz.y - q.y) + t * speed * rowH;
    float row = floor(yy / rowH), ry = fract(yy / rowH);
    float cwid = rowH * 0.55, col = floor((q.x - rowH * 0.6) / cwid), rx = fract((q.x - rowH * 0.6) / cwid);
    float len = (0.2 + 0.8 * h1(row, pid)) * (sz.x / cwid - 3.0);
    float indent = floor(h1(row + 0.5, pid) * 4.0) * 2.0;
    bool glyph = col >= indent && col < len && h1(col, row + pid) > 0.22 && rx < 0.72 && ry > 0.2 && ry < 0.8;
    if (h1(row, pid + 9.0) < 0.12) glyph = false; // blank lines
    if (glyph) on = 1.0;
    // light field: sparse world-anchored dither in pane bodies
    else on = step(bayer8(wpx), 0.12 * smoothstep(0.35, 0.9, fbm(p * 0.6 + 3.0)));
  }
  vec3 col = ink(on);
  // provider pip in some title bars (tiny signal)
  if (inside && !edge && sz.y - q.y < titleH + gap && q.x < rowH * 1.1 && q.x > rowH * 0.4 && sz.y - q.y > rowH * 0.45 && sz.y - q.y < rowH * 1.05) {
    float k = h1(pid, 5.0);
    if (k < 0.25) col = vec3(0.84); else if (k < 0.5) col = vec3(0.84);
  }
  gl_FragColor = vec4(col, 1.0);
}`,
});
