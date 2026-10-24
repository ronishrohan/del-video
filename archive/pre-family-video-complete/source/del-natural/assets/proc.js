/* Del v3 procedural engine.
   Every frame is a pure function of time: seeded hashes, closed-form noise, no accumulators.
   Scenes paint greyscale into a low-res "paint" canvas; a Bayer 8x8 ordered dither quantizes it
   to 2 or 3 tones on the visible canvas, which is upscaled with hard pixels. */
(function () {
  const INK = [11, 11, 13], MID = [42, 43, 47], LIGHT = [217, 220, 225], HI = [244, 246, 248];

  // ---------- stop-motion stepping ----------
  // Poses hold 5 then 4 frames at 60 fps (alternating); step sizes follow an exponential curve.
  const FPS = 60;
  const STEP = {
    hold: (k) => ((k % 2 === 0) ? 5 : 4) / FPS,
    // progress after k of n steps; r < 1 = big jumps then small, r > 1 = small then big
    prog(k, n, r = 0.5) { if (k <= 0) return 0; if (k >= n) return 1; return r === 1 ? k / n : (1 - Math.pow(r, k)) / (1 - Math.pow(r, n)); },
    // pose index reached dt seconds after a move starts
    index(dt) { if (dt < 0) return 0; let t = 0, k = 0; while (t + STEP.hold(k) <= dt + 1e-6) { t += STEP.hold(k); k++; } return k; },
    at(dt, n, r) { return STEP.prog(STEP.index(dt), n, r); },
    // quantise procedural time to the pose grid (~12 poses per second)
    q(t) { return Math.floor(t * FPS / 4.5) * 4.5 / FPS; },
    GRID: 0.075,
    // quantise a global time onto the film-wide pose grid
    qg(g) { return Math.floor(g / 0.075 + 1e-6) * 0.075; },
    // snap every instant change (zero-duration set) in a timeline onto the global pose grid
    snap(tl, actStart) {
      tl.getChildren(false, true, false).forEach((ch) => {
        if (ch.duration() !== 0) return;
        const g = actStart + ch.startTime();
        ch.startTime(Math.max(0, Math.round(g / 0.075) * 0.075 - actStart));
      });
    },
    // stepped tween on numeric props via tl.set poses
    to(tl, target, from, to, at, n = 6, r = 0.5) {
      let t = at;
      for (let k = 0; k <= n; k++) {
        const p = STEP.prog(k, n, r), v = {};
        for (const key in to) v[key] = from[key] + (to[key] - from[key]) * p;
        tl.set(target, v, t);
        t += STEP.hold(k);
      }
      return t;
    },
    // stepped typing: chars revealed in exponential chunks, one pose per 4-5 frames
    type(tl, spans, at, n, r = 0.7) {
      n = n || Math.max(2, Math.ceil(spans.length / 3));
      let t = at, shown = 0;
      for (let k = 1; k <= n; k++) {
        const target = Math.round(spans.length * STEP.prog(k, n, r));
        for (let i = shown; i < target; i++) tl.set(spans[i], { display: "inline" }, t);
        shown = target;
        t += STEP.hold(k);
      }
      return t;
    },
    // stepped text replacement on a node's textContent
    typeText(tl, el, text, at, n, r = 0.7) {
      n = n || Math.max(2, Math.ceil(text.length / 3));
      let t = at;
      for (let k = 1; k <= n; k++) { tl.set(el, { textContent: text.slice(0, Math.round(text.length * STEP.prog(k, n, r))) }, t); t += STEP.hold(k); }
      return t;
    },
  };

  // ---------- hashing / noise ----------
  function hash(x, y, s) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 2147483647;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // 3D value noise via two 2D slices blended on z
  function noise3(x, y, z, s) {
    const zi = Math.floor(z), zf = fade(z - zi);
    return vnoise(x, y, s + zi * 131) * (1 - zf) + vnoise(x, y, s + (zi + 1) * 131) * zf;
  }
  function fbm(x, y, z, s, oct = 4) {
    let a = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { a += amp * noise3(x * f, y * f, z * f * 0.7, s + i * 17); n += amp; amp *= 0.5; f *= 2; }
    return a / n;
  }
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const ease = {
    out: (t) => 1 - Math.pow(1 - clamp(t), 3),
    inOut: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    spring: (t) => { t = clamp(t); return 1 - Math.exp(-7 * t) * Math.cos(10 * t); },
  };
  const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map((v) => (v + 0.5) / 64);

  // ---------- terminal text ----------
  const LINES = [
    "$ cargo test --workspace", "running 214 tests", "test pty::resize ... ok", "test queue::reorder ... ok", "   Compiling del-terminal v0.1.0",
    "● Read(src/search.rs)", "  ⎿ 14 passed; 0 failed", "codex › patch applied src/upload.rs (+6 -2)", "● Update(src/cache.rs) +31 -12",
    "$ git status --short", " M crates/app/src/main.rs", "?? crates/terminal/tests/split.rs", "warning: unused variable `tab`",
    "  --> crates/app/src/sidebar.rs:212:9", "claude › reading 3 files", "$ rg -n 'backoff' src/", "src/upload.rs:43: let delay = BASE * 2u32.pow(n);",
    "> steer: use the existing Toggle component", "thinking…", "$ npm run build", "✓ built in 812ms", "$ ssh deploy@edge-2", "Last login: Thu on ttys004",
    "acp › session ready", "$ cargo bench --bench cache", "cache/insert  time: [212 µs]", "  peak RSS 412 MB → 198 MB", "$ zig build -Doptimize=ReleaseFast",
    "test search::terminal_scrollback ... ok", "$ docker compose up -d", "✓ Container db  Started", "$ tail -f /var/log/app.log", "GET /health 200 1ms",
    "retry with exponential backoff and jitter", "$ make lint", "0 warnings", "● Bash(cargo clippy -- -D warnings)", "$ ls", "Cargo.toml  crates  scripts  README.md",
  ];
  const lineAt = (seed, i) => LINES[Math.floor(hash(i, 7, seed) * LINES.length)];

  // ---------- layer ----------
  function layer(canvas, opts = {}) {
    const w = opts.w || 480, h = opts.h || 270;
    canvas.width = w; canvas.height = h;
    canvas.style.imageRendering = "pixelated";
    const out = canvas.getContext("2d");
    const paint = document.createElement("canvas");
    paint.width = w; paint.height = h;
    const ctx = paint.getContext("2d", { willReadFrequently: true });
    const outImg = out.createImageData(w, h);
    const L = {
      w, h, ctx, tones: opts.tones || 2, spread: opts.spread == null ? 1 : opts.spread,
      palette: opts.palette || [INK, LIGHT], draw: null, invert: false,
      render(t) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        L.marks = [];
        if (L.draw) L.draw(t, ctx, L);
        L.dither();
        // colour survives the dither: tiny provider squares recorded during draw
        for (const m of L.marks) { out.fillStyle = m.c; out.fillRect(m.x, m.y, m.w, m.h); }
        if (L.post) L.post(t, out, L);
      },
      dither() {
        const src = ctx.getImageData(0, 0, w, h).data, dst = outImg.data;
        const pal = L.palette, tones = L.tones, sp = L.spread, inv = L.invert;
        for (let y = 0; y < h; y++) {
          const by = (y & 7) * 8;
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            let v = (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255;
            if (inv) v = 1 - v;
            const b = (BAYER[by + (x & 7)] - 0.5) * sp;
            let k;
            if (tones === 2) k = v + b > 0.5 ? 1 : 0;
            else { k = Math.floor(v * (tones - 1) + 0.5 + b); k = k < 0 ? 0 : k > tones - 1 ? tones - 1 : k; }
            const c = pal[k];
            dst[i] = c[0]; dst[i + 1] = c[1]; dst[i + 2] = c[2]; dst[i + 3] = 255;
          }
        }
        out.putImageData(outImg, 0, 0);
      },
    };
    return L;
  }

  // Seek-safe driver: a tweened property whose setter repaints (gsap seek suppresses onUpdate).
  function drive(tl, scenes, actDur, actStart = 0) {
    const driver = { _t: -1 };
    const paint = (t) => {
      for (const s of scenes) {
        if (t >= s.start - 1e-6 && t < s.start + s.dur + 1e-6) s.layer.render(s.smooth ? t - s.start : Math.max(0, STEP.qg(actStart + t) - actStart - s.start));
      }
    };
    Object.defineProperty(driver, "t", { get() { return this._t; }, set(v) { this._t = v; paint(v); } });
    tl.fromTo(driver, { t: 0 }, { t: actDur, duration: actDur, ease: "none" }, 0);
    paint(0);
  }

  // ---------- generators (draw greyscale into ctx) ----------
  const G = {};
  // Full-field noise, brightness mapped by fbm
  G.noise = (ctx, L, t, o = {}) => {
    const img = ctx.getImageData(0, 0, L.w, L.h), d = img.data;
    const sc = o.scale || 0.012, sp = o.speed || 0.25, gain = o.gain == null ? 1 : o.gain, bias = o.bias || 0, seed = o.seed || 1;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const n = fbm(x * sc + (o.dx || 0) * t, y * sc + (o.dy || 0) * t, t * sp, seed, o.oct || 4);
      const v = clamp((n - 0.5) * 2.2 * gain + 0.5 + bias) * 255;
      const i = (y * L.w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  // Vertical gradient helper
  G.gradient = (ctx, L, a, b, dir = "v") => {
    const g = dir === "v" ? ctx.createLinearGradient(0, 0, 0, L.h) : ctx.createLinearGradient(0, 0, L.w, 0);
    g.addColorStop(0, `rgb(${a},${a},${a})`); g.addColorStop(1, `rgb(${b},${b},${b})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, L.w, L.h);
  };
  // Scrolling terminal output inside a rect
  G.stream = (ctx, L, t, r, o = {}) => {
    const fs = o.size || 9, lh = Math.round(fs * 1.45), seed = o.seed || 3, speed = o.speed == null ? 6 : o.speed;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.font = `${fs}px "Geist Mono", monospace`;
    ctx.textBaseline = "top";
    const scroll = t * speed * lh;
    const first = Math.floor(scroll / lh);
    const rows = Math.ceil(r.h / lh) + 1;
    const top = o.headerH || 0;
    for (let k = 0; k < rows; k++) {
      const li = first + k;
      const y = r.y + top + (r.h - top) - (k + 1) * lh + (scroll % lh) - lh;
      const yy = r.y + top + k * lh - (scroll % lh);
      const txt = lineAt(seed, li);
      const bright = o.bright || 200;
      const v = Math.round(bright * (0.55 + 0.45 * hash(li, 3, seed)));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillText(txt, r.x + 4, yy);
      void y;
    }
    // live line with cursor at the bottom
    if (o.cursor !== false) {
      const cy = r.y + r.h - lh - 2;
      ctx.fillStyle = "#000"; ctx.fillRect(r.x, cy - 2, r.w, lh + 4);
      ctx.fillStyle = "rgb(235,235,235)";
      ctx.fillText("$ ", r.x + 4, cy);
      if (Math.floor(t * 2.2) % 2 === 0) ctx.fillRect(r.x + 4 + fs * 1.25, cy, Math.round(fs * 0.6), fs + 1);
    }
    ctx.restore();
  };
  // Falling glyph rain
  G.rain = (ctx, L, t, o = {}) => {
    const fs = o.size || 10, cols = Math.ceil(L.w / (fs * 0.62)), seed = o.seed || 5, chars = "01$>_{}[]#/\\|=+-*:;abcdefxyz";
    ctx.font = `${fs}px "Geist Mono", monospace`; ctx.textBaseline = "top";
    for (let c = 0; c < cols; c++) {
      const sp = 40 + hash(c, 1, seed) * 140, off = hash(c, 2, seed) * 400, len = 6 + Math.floor(hash(c, 3, seed) * 18);
      const head = ((t * sp + off) % (L.h + len * fs)) - len * fs * 0.2;
      for (let k = 0; k < len; k++) {
        const y = head - k * fs;
        if (y < -fs || y > L.h) continue;
        const v = Math.round(255 * Math.pow(1 - k / len, 1.6) * (o.gain || 1));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        const ch = chars[Math.floor(hash(c * 31 + k, Math.floor(t * 12 + k), seed) * chars.length)];
        ctx.fillText(ch, c * fs * 0.62, y);
      }
    }
  };
  // Pixel-sort style horizontal smears over a noise base
  G.sort = (ctx, L, t, o = {}) => {
    G.noise(ctx, L, t, { scale: 0.02, speed: 0.4, seed: o.seed || 9 });
    const img = ctx.getImageData(0, 0, L.w, L.h), d = img.data;
    const thr = 0.45 + 0.15 * Math.sin(t * 2);
    for (let y = 0; y < L.h; y++) {
      let run = 0, val = 0;
      const dirShift = Math.floor(hash(y, 4, 2) * 40 + t * 160 * (0.4 + hash(y, 5, 2)));
      for (let x = 0; x < L.w; x++) {
        const sx = (x + dirShift) % L.w;
        const i = (y * L.w + sx) * 4;
        const v = d[i] / 255;
        if (v > thr) { if (run === 0) val = v; run++; const o2 = Math.min(1, val + run * 0.004); d[i] = d[i + 1] = d[i + 2] = o2 * 255; } else run = 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
  // Cellular grid growing outward from centre
  G.cells = (ctx, L, t, o = {}) => {
    const cs = o.cell || 6, cx = L.w / 2, cy = L.h / 2, seed = o.seed || 11;
    const R = t * (o.rate || 260);
    for (let y = 0; y < L.h; y += cs) for (let x = 0; x < L.w; x += cs) {
      const dd = Math.hypot(x - cx, y - cy) + hash(x, y, seed) * 40;
      if (dd < R) {
        const age = (R - dd) / 60;
        const on = hash(x / cs, y / cs + Math.floor(t * 8), seed) > 0.45 - Math.min(0.3, age * 0.1);
        const v = on ? 140 + Math.min(115, age * 60) : 20;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x + 1, y + 1, cs - 1, cs - 1);
      }
    }
  };
  // Halftone dot field driven by noise; collapse (0..1) pulls dots onto the centre line
  G.halftone = (ctx, L, t, o = {}) => {
    const step = o.step || 8, seed = o.seed || 13, col = o.collapse || 0;
    ctx.fillStyle = "#fff";
    for (let y = step / 2; y < L.h; y += step) for (let x = step / 2; x < L.w; x += step) {
      const n = fbm(x * 0.01, y * 0.01, t * 0.3, seed, 3);
      let r = clamp((n - 0.3) * 1.6) * step * 0.6;
      const py = y + (L.h / 2 - y) * ease.inOut(clamp(col * 1.2 - hash(x, y, seed) * 0.2));
      if (col > 0) r *= 1 - col * 0.6;
      if (r < 0.4) continue;
      ctx.beginPath(); ctx.arc(x, py, r, 0, Math.PI * 2); ctx.fill();
    }
  };
  // Flow-field particles: closed-form paths
  G.flow = (ctx, L, t, o = {}) => {
    const n = o.count || 900, seed = o.seed || 21, chars = o.chars || ".:-=+*#%@>_$";
    const fs = o.size || 8;
    ctx.font = `${fs}px "Geist Mono", monospace`; ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const x0 = hash(i, 1, seed) * L.w * 1.4 - L.w * 0.2, y0 = hash(i, 2, seed) * L.h;
      const sp = 18 + hash(i, 3, seed) * 60;
      const trail = o.trail || 6;
      for (let k = trail - 1; k >= 0; k--) {
        const tt = t - k * 0.045;
        const x = ((x0 + tt * sp) % (L.w * 1.4)) - L.w * 0.2;
        const y = y0 + Math.sin(x * 0.012 + hash(i, 4, seed) * 6 + tt * 0.6) * 22 + Math.sin(x * 0.031 + tt) * 6;
        const v = Math.round((90 + 165 * hash(i, 5, seed)) * (1 - k / trail));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillText(k === 0 ? chars[i % chars.length] : "·", x, y);
      }
    }
  };
  // Recursive pane split layout. Returns rects at time t. splits: [{at, dir, idx, pos}]
  G.panes = (L, t, splits, area) => {
    let rects = [{ x: area.x, y: area.y, w: area.w, h: area.h, born: -1, id: 0 }];
    let nextId = 1;
    for (const s of splits) {
      if (t < s.at) break;
      const p = STEP.at(t - s.at, 4, 0.45);
      const r = rects[s.idx];
      if (!r) continue;
      let a, b;
      if (s.dir === "v") {
        const cut = r.w * (s.pos || 0.5);
        const cw = r.w + (cut - r.w) * p;
        a = { x: r.x, y: r.y, w: cw, h: r.h, born: r.born, id: r.id };
        b = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h, born: s.at, id: nextId++ };
      } else {
        const cut = r.h * (s.pos || 0.5);
        const ch = r.h + (cut - r.h) * p;
        a = { x: r.x, y: r.y, w: r.w, h: ch, born: r.born, id: r.id };
        b = { x: r.x, y: r.y + ch, w: r.w, h: r.h - ch, born: s.at, id: nextId++ };
      }
      rects.splice(s.idx, 1, a, b);
    }
    return rects;
  };
  // Draw panes with streams, 1px rules and tiny header squares
  G.drawPanes = (ctx, L, t, rects, o = {}) => {
    const provs = o.provs || ["codex", "claude", "acp", "zsh"];
    rects.forEach((r, i) => {
      const age = r.born < 0 ? 9 : t - r.born;
      const pad = 1;
      const rr = { x: Math.round(r.x + pad), y: Math.round(r.y + pad), w: Math.round(r.w - pad * 2), h: Math.round(r.h - pad * 2) };
      if (rr.w < 6 || rr.h < 6) return;
      // header strip
      const hh = Math.max(8, Math.round((o.size || 9) * 1.3));
      ctx.fillStyle = "rgb(36,36,36)"; ctx.fillRect(rr.x, rr.y, rr.w, hh);
      const p = provs[(r.id + (o.provOffset || 0)) % provs.length];
      ctx.fillStyle = p === "zsh" ? "rgb(150,150,150)" : "rgb(240,240,240)";
      ctx.font = `${Math.round((o.size || 9) * 0.9)}px "Geist Mono", monospace`; ctx.textBaseline = "top";
      ctx.fillText(p === "acp" ? "acp agent" : p === "claude" ? "claude code" : p, rr.x + 12, rr.y + 2);
      const pc = p === "codex" ? "#3b82f6" : p === "claude" ? "#d97757" : p === "acp" ? "#d9dce1" : null;
      if (pc && L.marks) L.marks.push({ x: rr.x + 4, y: rr.y + Math.round(hh / 2) - 2, w: 4, h: 4, c: pc });
      if (o.onHeader) o.onHeader(p, rr, hh);
      G.stream(ctx, L, t + r.id * 3.1, { x: rr.x, y: rr.y + hh, w: rr.w, h: rr.h - hh }, { size: o.size || 9, seed: 100 + r.id * 7, speed: 2 + (r.id % 4) * 1.5, bright: 210, cursor: rr.h > 40 });
      // rules
      ctx.fillStyle = "rgb(200,200,200)";
      ctx.fillRect(Math.round(r.x + r.w) - 1, Math.round(r.y), 1, Math.round(r.h));
      ctx.fillRect(Math.round(r.x), Math.round(r.y + r.h) - 1, Math.round(r.w), 1);
    });
  };
  // Del layout silhouette (sidebar, tab strip, panes, composer) in logical units scaled to fit
  G.delLayout = (ctx, L, t, o = {}) => {
    const s = o.scale || L.w / 1440, ox = o.x || 0, oy = o.y || 0;
    const R = (x, y, w, h, v) => { ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(ox + x * s, oy + y * s, w * s, h * s); };
    R(0, 0, 1440, 900, 34);              // shell
    R(222, 32, 1212, 862, 18);           // page
    // traffic lights + tabs
    for (let k = 0; k < 3; k++) R(12 + k * 20, 10, 12, 12, 120);
    const ntabs = o.tabs || 4;
    for (let k = 0; k < ntabs; k++) R(110 + k * 162, 4, 160, 24, k === (o.activeTab || 0) ? 90 : 52);
    // sidebar rows
    for (let k = 0; k < 11; k++) R(14, 48 + k * 30, 180 - (k * 37) % 70, 14, k === 3 ? 150 : 90);
    // right pane
    if (o.right !== false) { R(1094, 32, 1, 862, 70); G.stream(ctx, L, t + 2, { x: ox + 1100 * s, y: oy + 60 * s, w: 330 * s, h: 820 * s }, { size: Math.max(6, Math.round(11 * s)), seed: (o.seed || 55) + 22, speed: 3, cursor: false, bright: 150 }); }
    // main terminal stream
    G.stream(ctx, L, t, { x: ox + 240 * s, y: oy + 50 * s, w: (o.right !== false ? 840 : 1180) * s, h: 700 * s }, { size: Math.max(7, Math.round(13 * s)), seed: o.seed || 55, speed: o.speed || 4, bright: 230 });
    // composer
    R(560, 780, 640, 90, 46); R(560, 846, 640, 24, 30);
  };
  // Del mark: the three bars from del.svg as polygons (1024 box)
  const BARS = [
    [[300, 230], [356, 254], [356, 780], [312, 804]],
    [[242, 252], [302, 266], [790, 598], [737, 596]],
    [[262, 781], [286, 728], [780, 392], [755, 454]],
  ];
  G.BARS = BARS;

  window.PROC = { STEP, INK, MID, LIGHT, HI, hash, rng, vnoise, noise3, fbm, clamp, ease, BAYER, layer, drive, G, lineAt, LINES };

  /* Seek-safe typing: each char is a span toggled by tl.set. */
  window.TYPE = {
    prepare(el, text) {
      el.innerHTML = "";
      const spans = [];
      for (const ch of text) {
        const s = document.createElement("span");
        s.className = "ch"; s.textContent = ch; s.style.display = "none";
        el.appendChild(s); spans.push(s);
      }
      return spans;
    },
    type(tl, spans, at, cps = 28, rhythm = []) {
      let t = at;
      spans.forEach((s, i) => { tl.set(s, { display: "inline" }, t); t += (1 / cps) * (rhythm.length ? rhythm[i % rhythm.length] : 1); });
      return t;
    },
    blink(tl, caret, from, to, period = 0.5) {
      let k = 0;
      for (let t = from; t < to - 1e-6; t += period, k++) tl.set(caret, { opacity: k % 2 === 0 ? 1 : 0 }, t);
    },
  };
})();
