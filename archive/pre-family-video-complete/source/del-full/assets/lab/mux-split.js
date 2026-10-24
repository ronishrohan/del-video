// 06 Multiplexer subdivision: one field recursively splits into panes (instant), streams, collapses to one cursor.
LAB.register({
  name: 'Mux split',
  tech: 'Seeded split tree on the cell grid, n(t) splits applied as hard cuts, each pane its own stream',
  beat: '19.7 s range cascade: "the window subdivides again and again"; 7.2 s drop 1 grid explosion',
  seed: 4,
  px: 1,
  maxW: 1920,
  draw(ctx, W, H, t, seed, th, S) {
    const T = LAB.term, LOOP = 9, N = 15;
    if (!S.m) {
      S.m = T.cells(W, H, 46);
      // precompute leaf sets after k splits, in cell units: [x, y, w, h, streamId]
      const r = LAB.rng(seed);
      let leaves = [[0, 0, S.m.cols, S.m.rows, 0]];
      S.steps = [leaves];
      for (let k = 1; k <= N; k++) {
        // split the largest leaf (ties broken by seed) along its longer side, ratio snapped to cells
        let bi = 0, ba = -1;
        leaves.forEach((l, i) => { const ar = l[2] * l[3] * (0.75 + r() * 0.5); if (ar > ba) { ba = ar; bi = i; } });
        const [x, y, w, h] = leaves[bi], vert = w * 0.6 > h, f = 0.35 + r() * 0.3;
        let A, B;
        if (vert) { const s = Math.max(8, Math.round(w * f)); A = [x, y, s, h, leaves[bi][4]]; B = [x + s, y, w - s, h, k]; }
        else { const s = Math.max(3, Math.round(h * f)); A = [x, y, w, s, leaves[bi][4]]; B = [x, y + s, w, h - s, k]; }
        leaves = leaves.slice(0, bi).concat([A, B], leaves.slice(bi + 1));
        S.steps.push(leaves);
      }
    }
    const { cw, ch } = S.m;
    const fg = LAB.css(th.fg), bg = LAB.css(th.bg), ac = LAB.css(th.ac);
    const a = LAB.atlas(T.CHARS, fg, cw, ch);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // timeline (seconds in loop): 0-1.6 single cursor; then a split every 0.22 s (on 130 bpm 16ths-ish);
    // hold; collapse in big steps; 8.2+ back to a single cursor
    const lt = ((t % LOOP) + LOOP) % LOOP;
    let n;
    if (lt < 1.6) n = 0;
    else if (lt < 1.6 + N * 0.22) n = 1 + Math.floor((lt - 1.6) / 0.22);
    else if (lt < 6.6) n = N;
    else if (lt < 8.2) n = [N, 9, 4, 1, 0][Math.min(4, Math.floor((lt - 6.6) / 0.32))];
    else n = 0;
    n = Math.min(N, n);
    const leaves = S.steps[n], cycle = Math.floor(t / LOOP);

    if (n === 0) {
      // the one cursor: prompt + hard-blinking block, centered small
      const s = '$ ', cx = Math.floor(S.m.cols / 2) - 1, cy = Math.floor(S.m.rows / 2);
      LAB.text(ctx, a, s, cx * cw, cy * ch);
      if (Math.floor(lt * 2.5) % 2 === 0) { ctx.fillStyle = fg; ctx.fillRect((cx + 2) * cw, cy * ch, cw, ch); }
      return;
    }
    const focus = Math.floor(LAB.hash(seed, cycle, Math.floor(lt * 3)) * leaves.length);
    leaves.forEach((l, li) => {
      const [x, y, w, h, sid] = l, px = x * cw, py = y * ch, pw = w * cw, ph = h * ch;
      // stream: lines scroll up at a per-pane rate (continuous translation, pixel snapped)
      const rate = 4 + LAB.hash(seed, sid, 1) * 18, off = lt * rate + LAB.hash(seed, sid, 2) * 500;
      const first = Math.floor(off), dy = Math.round((off - first) * ch);
      ctx.save(); ctx.beginPath(); ctx.rect(px + 1, py + 1, pw - 2, ph - 2); ctx.clip();
      for (let r = 0; r <= h; r++) {
        const L = T.line(seed + cycle, sid, first + r);
        if (L.kind === 'blank') continue;
        const yy = py + r * ch - dy + Math.round(ch * 0.5);
        if (L.kind === 'codex' || L.kind === 'claude') { ctx.fillStyle = LAB.css(L.kind === 'codex' ? LAB.CODEX : LAB.CLAUDE); ctx.fillRect(px + 3, yy + (ch >> 2), 2, ch >> 1); }
        LAB.line(ctx, a, L.text.slice(0, w - 2), px + cw, yy);
        if (L.kind === 'dim') { ctx.fillStyle = T.shade(ctx, bg, 0.5); ctx.fillRect(px, yy, pw, ch); }
      }
      ctx.restore();
      // hard pane edges; focused pane in the accent
      ctx.fillStyle = li === focus ? ac : T.shade(ctx, fg, 0.55);
      ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py + ph - 1, pw, 1); ctx.fillRect(px, py, 1, ph); ctx.fillRect(px + pw - 1, py, 1, ph);
    });
  },
});
