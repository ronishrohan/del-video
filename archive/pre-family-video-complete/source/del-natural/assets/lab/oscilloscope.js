// 08 Oscilloscope: signal / waveform lines, sweep beam writes the new sweep over the old one (no persistence fade).
LAB.register({
  name: 'Oscilloscope',
  tech: 'Swept traces into a 1-bit buffer: digital clock, analog sum, FM burst; Bayer under-fill; graticule dots',
  beat: '22.9-29.3 s "Rendered on the GPU": speed as signal; trace 1 can lock to the 132 bpm grid',
  seed: 8,
  px: 2,
  maxW: 960,
  draw(ctx, W, H, t, seed, th, S) {
    if (!S.img) {
      S.img = ctx.createImageData(W, H); S.px = new Uint32Array(S.img.data.buffer);
      const r = LAB.rng(seed); S.f = [1 + r() * 2, 3 + r() * 4, 7 + r() * 6, r() * 6.28, r() * 6.28];
    }
    const pack = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const BG = pack(th.bg), FG = pack(th.fg), AC = pack(th.ac), P = S.px, B = LAB.BAYER8, f = S.f;
    P.fill(BG);
    // graticule: 10 x 8 divisions, dotted every 4 px, minor ticks on the centre lines
    for (let gx = 1; gx < 10; gx++) { const x = Math.round(gx * W / 10); for (let y = 0; y < H; y += 4) P[y * W + x] = FG; }
    for (let gy = 1; gy < 8; gy++) { const y = Math.round(gy * H / 8); for (let x = 0; x < W; x += 4) P[y * W + x] = FG; }

    const SWEEP = 0.75, k = Math.floor(t / SWEEP), beam = Math.floor(((t / SWEEP) - k) * W);
    // trace value at column x for the sweep that started at time ts (pure function)
    const tr = (i, x, ts) => {
      const u = x / W, ph = ts * 6;
      if (i === 0) { // digital clock / data line, hard edges
        const bit = LAB.hash(seed, Math.floor(u * 24 + ts * 32), 1) > 0.5 ? 1 : -1;
        return H * 0.2 - bit * H * 0.06;
      }
      if (i === 1) { // analog sum + grit
        const v = Math.sin(u * 6.283 * f[0] + ph + f[3]) * 0.6 + Math.sin(u * 6.283 * f[1] - ph * 1.7) * 0.3 + (LAB.noise(u * 40, ts * 3, seed) - 0.5) * 0.35;
        return H * 0.52 - v * H * 0.16;
      }
      const env = 0.25 + 0.75 * Math.max(0, Math.sin(u * 3.1416 * 3 + ts * 2.5)) ** 2; // FM burst
      return H * 0.82 - Math.sin(u * 6.283 * (f[2] + env * 18) + ph * 2 + f[4]) * env * H * 0.1;
    };
    const plot = (x, y0, y1, c) => {
      let a = Math.round(Math.min(y0, y1)), b = Math.round(Math.max(y0, y1)) + 1;
      a = Math.max(0, a); b = Math.min(H - 1, b);
      for (let y = a; y <= b; y++) P[y * W + x] = c;
    };
    const prev = [0, 0, 0];
    for (let x = 0; x < W; x++) {
      const ts = x <= beam ? k * SWEEP : (k - 1) * SWEEP; // left of beam: this sweep; right: previous sweep
      for (let i = 0; i < 3; i++) {
        const y = tr(i, x, ts);
        if (x > 0 && x !== beam + 1) plot(x, prev[i], y, FG); else plot(x, y, y, FG);
        if (i === 1) { // Bayer under-fill between the analog trace and its centre line
          const c = H * 0.52, a = Math.round(Math.min(y, c)), b = Math.round(Math.max(y, c));
          for (let yy = a; yy < b; yy++) if (B[(yy & 7) * 8 + (x & 7)] < 0.22) P[yy * W + x] = FG;
        }
        prev[i] = y;
      }
    }
    // beam: a hard vertical accent line + a 1 px dark gap ahead of it
    for (let y = 0; y < H; y++) { P[y * W + beam] = AC; if (beam + 2 < W) P[y * W + beam + 2] = BG; }
    ctx.putImageData(S.img, 0, 0);
  },
});
