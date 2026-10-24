// 11 Del logo built procedurally: three bars translate in, lock into the mark; dithered metal shading.
// Geometry from crates/app/assets/del.svg (1024 units). Translation only; the square cuts in on lock.
LAB.register({
  name: 'Logo bars',
  tech: 'Per-pixel quad tests in logo space; glass gradient + brushed grain + sweep band, Bayer 8x8; hard drop shadow',
  beat: '6.1 s "Del." brand hit and 47.6 s end card (bars decode into place on the stabs)',
  seed: 1,
  px: 2,
  maxW: 960,
  draw(ctx, W, H, t, seed, th, S) {
    const BARS = [
      { q: [[300, 230], [356, 254], [356, 780], [312, 804]], from: [0, -1], t0: 0.15 },  // spine, from above
      { q: [[242, 252], [302, 266], [790, 598], [737, 596]], from: [-1, -0.68], t0: 0.32 }, // upper diagonal, from left
      { q: [[262, 781], [286, 728], [780, 392], [755, 454]], from: [1, -0.68], t0: 0.49 },  // lower diagonal, from right
    ];
    const LOOP = 5, LOCK = 0.95, DUR = 0.42;
    if (!S.img) {
      S.img = ctx.createImageData(W, H); S.px = new Uint32Array(S.img.data.buffer);
      S.bars = BARS.map((b) => {
        const [a, , c] = b.q, ax = c[0] - a[0], ay = c[1] - a[1], al = Math.hypot(ax, ay);
        const xs = b.q.map((p) => p[0]), ys = b.q.map((p) => p[1]);
        // edges as half-planes (nx, ny, c): inside iff nx*u + ny*v + c >= 0 for all four
        const cxm = xs.reduce((s, x) => s + x, 0) / 4, cym = ys.reduce((s, y) => s + y, 0) / 4;
        const E = b.q.map((p, i) => { const n = b.q[(i + 1) & 3]; let ex = -(n[1] - p[1]), ey = n[0] - p[0], c = -(ex * p[0] + ey * p[1]); if (ex * cxm + ey * cym + c < 0) { ex = -ex; ey = -ey; c = -c; } return [ex, ey, c]; });
        const grain = new Float32Array(4096); for (let g = 0; g < 4096; g++) grain[g] = (LAB.hash(g - 2048, BARS.indexOf(b), seed) - 0.5) * 0.16;
        return { ...b, ax: ax / al, ay: ay / al, a, al, E, grain, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
      });
    }
    const pack = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const BG = pack(th.bg), FG = pack(th.fg), AC = pack(th.ac), P = S.px, B = LAB.BAYER8;
    const dark = th.bg[0] < 128, lt = ((t % LOOP) + LOOP) % LOOP;
    const L = Math.round(H * 0.8), ox = (W - L) >> 1, oy = (H - L) >> 1, k = 1024 / L;
    const locked = lt >= LOCK, flash = lt >= LOCK && lt < LOCK + 2 / 60, gone = lt >= LOOP - 0.5;
    // per-bar translation offset in logo units (ease-out quart; translation only)
    const off = S.bars.map((b) => {
      const p = Math.min(1, Math.max(0, (lt - b.t0) / DUR)), e = 1 - (1 - p) ** 4, d = (1 - e) * 1500;
      return { dx: b.from[0] * d, dy: b.from[1] * d, vis: lt >= b.t0 };
    });
    const inQuad = (E, u, v) => E[0][0] * u + E[0][1] * v + E[0][2] >= 0 && E[1][0] * u + E[1][1] * v + E[1][2] >= 0 && E[2][0] * u + E[2][1] * v + E[2][2] >= 0 && E[3][0] * u + E[3][1] * v + E[3][2] >= 0;
    // only touch pixels covered by something visible this frame
    P.fill(BG);
    let rx0 = W, ry0 = H, rx1 = 0, ry1 = 0;
    const grow = (u0, v0, u1, v1) => { rx0 = Math.min(rx0, Math.floor(u0 / k + ox)); ry0 = Math.min(ry0, Math.floor(v0 / k + oy)); rx1 = Math.max(rx1, Math.ceil(u1 / k + ox)); ry1 = Math.max(ry1, Math.ceil(v1 / k + oy)); };
    if (!gone) { S.bars.forEach((b, bi) => { const o = off[bi]; if (o.vis) grow(b.bb[0] + o.dx, b.bb[1] + o.dy, b.bb[2] + o.dx, b.bb[3] + o.dy); }); if (locked) grow(64, 64, 960, 960); }
    rx0 = Math.max(0, rx0); ry0 = Math.max(0, ry0); rx1 = Math.min(W, rx1 + 1); ry1 = Math.min(H, ry1 + 1);
    const glass = (s) => { const st = [0.98, 0.85, 0.64, 0.5, 0.77, 0.94], at = [0, 0.25, 0.49, 0.51, 0.78, 1]; for (let i = 1; i < 6; i++) if (s <= at[i]) { const f = (s - at[i - 1]) / (at[i] - at[i - 1]); return st[i - 1] + (st[i] - st[i - 1]) * f; } return st[5]; };
    const sweep = lt > 1.25 && lt < 2.2 ? -300 + (lt - 1.25) / 0.95 * 1900 : -9999; // specular band position along u+v
    const sq = (u, v) => { const cx = Math.max(Math.abs(u - 512) - (448 - 206), 0), cy = Math.max(Math.abs(v - 512) - (448 - 206), 0); return Math.hypot(cx, cy) - 206; };
    for (let y = ry0; y < ry1; y++) {
      const v = (y - oy) * k, by = (y & 7) * 8;
      for (let x = rx0; x < rx1; x++) {
        const u = (x - ox) * k, i = y * W + x;
        let lum = -1;
        if (!gone) {
          for (let bi = 0; bi < 3 && lum < 0; bi++) {
            const b = S.bars[bi], o = off[bi]; if (!o.vis) continue;
            const bu = u - o.dx, bv = v - o.dy;
            if (bu < b.bb[0] || bu > b.bb[2] || bv < b.bb[1] || bv > b.bb[3] || !inQuad(b.E, bu, bv)) continue;
            const s = ((bu - 320) * 0.59 + (bv - 270) * 0.81) / 605; // along the svg glass gradient axis
            const perp = (bu - b.a[0]) * -b.ay + (bv - b.a[1]) * b.ax; // across the bar: brushed grain
            lum = glass(Math.min(1, Math.max(0, s))) + b.grain[(Math.floor(perp * 0.9) + 2048) & 4095];
            if (Math.abs(bu + bv - sweep) < 60) lum += 0.4;
          }
          if (lum < 0 && locked) {
            const d = sq(u, v);
            if (d < 0) {
              // shadow: bar footprint offset by (0, +22) in logo space
              let sh = false; for (let bi = 0; bi < 3 && !sh; bi++) sh = inQuad(S.bars[bi].E, u, v - 26);
              const g = (u * 0.61 + v * 0.79) / 1250; // graphite gradient, light top-left
              lum = sh ? 0 : 0.2 - 0.17 * Math.min(1, Math.max(0, g)) + (d > -5 ? 0.45 : 0);
            }
          }
        }
        if (lum < 0) { P[i] = BG; continue; }
        let ink = dark ? lum : 1 - lum; if (flash) ink = 1 - ink;
        P[i] = ink > B[by + (x & 7)] ? FG : BG;
      }
    }
    if (flash) for (let x = 0; x < W; x++) P[(oy + L + 6) * W + x] = AC;
    ctx.putImageData(S.img, 0, 0);
  },
});
