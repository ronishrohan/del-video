// 04 Monospace glyph field: brightness ramp in characters, ordered-dithered between ramp steps.
LAB.register({
  name: 'ASCII shade',
  tech: 'Glyph density ramp " .:-=+*#%@", Bayer-dithered between steps, flow field sampled per cell (atlas blit)',
  beat: '7.2 s "Every agent. Every shell." the glyph field before it explodes into terminals',
  seed: 5,
  px: 1,
  maxW: 1280, // chunky pixel glyphs; glyph count is resolution-independent
  draw(ctx, W, H, t, seed, th, S) {
    const RAMP = ' .:-=+*#%@';
    if (!S.m) S.m = LAB.term.cells(W, H, 44);
    const { cw, ch, cols, rows } = S.m;
    const a = LAB.atlas(RAMP, LAB.css(th.fg), cw, ch);
    ctx.fillStyle = LAB.css(th.bg); ctx.fillRect(0, 0, W, H);
    const n = LAB.noise, so = seed * 17.3, B = LAB.BAYER8;
    const A = cols / rows;
    for (let y = 0; y < rows; y++) {
      const v0 = y / rows;
      for (let x = 0; x < cols; x++) {
        const u = (x / cols) * A * 0.6;
        // warped flow, drifting right (translation of the field)
        const wx = n(u * 2 + t * 0.15, v0 * 2, seed) * 1.6;
        const wy = n(u * 2 + 5.1, v0 * 2 - t * 0.1, seed) * 1.6;
        let v = n(u * 3 + wx - t * 0.35 + so, v0 * 3 + wy, seed + 1) * 0.7 + n(u * 7 + wy, v0 * 7 - t * 0.2, seed + 2) * 0.3;
        // a hard-edged horizontal scan band snapping through rows at 8 Hz
        if (y === Math.floor(t * 8) % (rows * 3)) v = 1 - v;
        v = Math.max(0, Math.min(0.999, (v - 0.22) * 1.7));
        const f = v * (RAMP.length - 1), k = Math.floor(f) + (f - Math.floor(f) > B[(y & 7) * 8 + (x & 7)] ? 1 : 0);
        if (k > 0) ctx.drawImage(a.canvas, k * cw, 0, cw, ch, x * cw, y * ch, cw, ch);
      }
    }
  },
});
