// 09 Pixel sorting / datamosh bands: threshold spans sorted by luminance inside bands that snap per 16th note.
LAB.register({
  name: 'Pixel sort',
  tech: 'Procedural terminal-ish luma field; per-16th bands: span sort by luminance + block datamosh offsets; Bayer 1-bit out',
  beat: '33.6 s "Fast." the one hard cut; also usable as 1-frame hits on drops (8.0 s, 25.3 s)',
  seed: 9,
  px: 3,
  maxW: 640,
  draw(ctx, W, H, t, seed, th, S) {
    if (!S.img) { S.img = ctx.createImageData(W, H); S.px = new Uint32Array(S.img.data.buffer); S.l = new Float32Array(W * H); S.tmp = new Float32Array(W * H); }
    const pack = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const BG = pack(th.bg), FG = pack(th.fg), AC = pack(th.ac), L = S.l, B = LAB.BAYER8, h = LAB.hash;
    const SLOT = 60 / 132 / 4, slot = Math.floor(t / SLOT);
    // phrase: 8 slots clean, 8 slots glitching; intensity re-rolled every slot
    const phase = slot % 16, glitch = phase >= 8 ? 0.35 + h(seed, slot, 1) * 0.65 : (h(seed, slot, 2) < 0.12 ? 0.3 : 0);

    // source: rows of glyph-like blocks over a vertical gradient, scrolling up (pixel-snapped)
    const cell = Math.max(2, Math.round(H / 60)), scroll = Math.floor(t * 40);
    for (let y = 0; y < H; y++) {
      const ry = Math.floor((y + scroll) / (cell * 2)), inRow = ((y + scroll) % (cell * 2)) < cell * 1.6;
      const len = h(seed, ry, 3) * W * 0.9, grad = 0.15 + 0.35 * (y / H);
      for (let x = 0; x < W; x++) {
        const cx = Math.floor(x / cell), glyph = inRow && x < len && h(cx, ry, seed) > 0.35;
        L[y * W + x] = glyph ? 0.78 + 0.2 * h(cx, ry, 5) : grad + 0.12 * Math.sin(x * 0.02 + y * 0.01);
      }
    }
    if (glitch > 0) {
      const r = LAB.rng(seed * 1000 + slot), nb = 2 + Math.floor(r() * 6 * glitch);
      for (let b = 0; b < nb; b++) {
        const y0 = Math.floor(r() * H), bh = Math.floor(4 + r() * H * 0.18 * glitch), thr = 0.25 + r() * 0.4, dir = r() < 0.5;
        const dx = Math.floor((r() - 0.5) * W * 0.3 * glitch);
        for (let y = y0; y < Math.min(H, y0 + bh); y++) {
          const row = L.subarray(y * W, y * W + W);
          // datamosh: hard horizontal displacement of the band (wraps)
          if (dx) { const c = S.tmp.subarray(0, W); c.set(row); for (let x = 0; x < W; x++) row[x] = c[(x - dx + W * 4) % W]; }
          // sort contiguous spans above threshold
          let s = -1;
          for (let x = 0; x <= W; x++) {
            const on = x < W && row[x] > thr;
            if (on && s < 0) s = x;
            else if (!on && s >= 0) { const span = row.subarray(s, x); span.sort(); if (dir) span.reverse(); s = -1; }
          }
        }
      }
      // block mosh: copy a few 16px blocks from a stale offset
      const nbk = Math.floor(r() * 10 * glitch), bs = cell * 8;
      for (let i = 0; i < nbk; i++) {
        const sx = Math.floor(r() * (W - bs)), sy = Math.floor(r() * (H - bs)), ox = Math.floor((r() - 0.5) * bs * 3), oy = Math.floor((r() - 0.5) * bs);
        for (let y = 0; y < bs; y++) for (let x = 0; x < bs; x++) {
          const tx = sx + x + ox, ty = sy + y + oy;
          if (tx >= 0 && tx < W && ty >= 0 && ty < H) L[ty * W + tx] = L[(sy + y) * W + sx + x];
        }
      }
    }
    const accentRow = glitch > 0.8 ? Math.floor(h(seed, slot, 9) * H) : -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      S.px[i] = L[i] > B[(y & 7) * 8 + (x & 7)] ? FG : BG;
    }
    if (accentRow >= 0) S.px.fill(AC, accentRow * W, Math.min(W * H, (accentRow + 2) * W));
    ctx.putImageData(S.img, 0, 0);
  },
});
