// 05 Terminal streams: columns of deterministic agent/shell output scrolling at different rates.
LAB.register({
  name: 'Terminal streams',
  tech: 'Atlas-blitted glyph columns, pixel-snapped scroll, Bayer pattern thins older rows, provider pips',
  beat: '10.1 s "Codex. Claude Code. Any agent": streams with tiny blue / orange / silver signals',
  seed: 2,
  px: 1,
  maxW: 1920,
  draw(ctx, W, H, t, seed, th, S) {
    const T = LAB.term;
    if (!S.m) {
      S.m = T.cells(W, H, 52);
      const r = LAB.rng(seed), n = 4 + Math.floor(r() * 2);
      // column widths in cells, summing to the full grid
      let left = S.m.cols, x = 0; S.cols = [];
      for (let i = 0; i < n; i++) {
        const w = i === n - 1 ? left : Math.max(14, Math.floor(left / (n - i) * (0.7 + r() * 0.6)));
        S.cols.push({ x, w, speed: 3 + r() * 14, gap: r() < 0.3 }); x += w; left -= w;
      }
    }
    const { cw, ch, rows } = S.m;
    const fg = LAB.css(th.fg), bg = LAB.css(th.bg);
    const a = LAB.atlas(T.CHARS, fg, cw, ch);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    S.cols.forEach((c, ci) => {
      const x0 = c.x * cw, wpx = c.w * cw;
      // hard-stepped speed changes every 1.5 s: integrate piecewise-constant rate so the scroll is continuous
      const seg = 1.5, k = Math.floor(t / seg);
      let off = 0; for (let j = 0; j < k && j < 400; j++) off += seg * rate(seed, ci, j, c.speed);
      off += (t - k * seg) * rate(seed, ci, k, c.speed);
      const lineF = off, first = Math.floor(lineF), dy = Math.round((lineF - first) * ch);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, wpx - cw, H); ctx.clip();
      for (let r = -1; r <= rows; r++) {
        const idx = first + r, L = T.line(seed, ci, idx), y = r * ch - dy + ch;
        if (L.kind === 'blank') continue;
        const tx = x0 + cw;
        if (L.kind === 'codex' || L.kind === 'claude') {
          ctx.fillStyle = LAB.css(L.kind === 'codex' ? LAB.CODEX : LAB.CLAUDE);
          ctx.fillRect(x0 + Math.round(cw * 0.25), y + Math.round(ch * 0.3), Math.max(2, Math.round(cw * 0.45)), Math.max(2, Math.round(ch * 0.4)));
        }
        LAB.line(ctx, a, L.text.slice(0, c.w - 3), tx, y);
        // older (higher) rows and dim kinds get thinned by a Bayer mask in the background colour
        const age = 1 - (y / H);
        const thin = (L.kind === 'dim' ? 0.45 : 0) + Math.max(0, age - 0.45) * 1.1;
        if (thin > 0.02) { ctx.fillStyle = T.shade(ctx, bg, Math.min(0.92, thin)); ctx.fillRect(x0, y, wpx, ch); }
      }
      // cursor block on the newest row, hard 2 Hz blink
      if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = fg; ctx.fillRect(x0 + cw * 3, H - ch, cw, ch); }
      ctx.restore();
      if (ci > 0) { ctx.fillStyle = T.shade(ctx, fg, 0.5); ctx.fillRect(x0 - Math.round(cw * 0.5), 0, 1, H); }
    });
    function rate(seed, ci, j, base) { const h = LAB.hash(seed, ci * 977 + j, 9); return h < 0.15 ? 0 : base * (0.4 + h * 1.6); }
  },
});
