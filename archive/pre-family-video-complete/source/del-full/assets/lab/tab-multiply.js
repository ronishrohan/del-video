// 07 Tab multiplication: a tab strip that doubles on the beat with hard snaps; focus jumps; content cuts.
LAB.register({
  name: 'Tab multiply',
  tech: 'Tab count 1→2→4…→64 on a 132 bpm beat, widths snap to the cell grid, active tab inverted, content hard-cuts',
  beat: '10.1-13.3 s "Codex. Claude Code. Any agent you install." streams resolve into tabs',
  seed: 6,
  px: 1,
  maxW: 1920,
  draw(ctx, W, H, t, seed, th, S) {
    const T = LAB.term, BEAT = 60 / 132, STEPS = 7, LOOP = BEAT * (STEPS + 3);
    if (!S.m) S.m = T.cells(W, H, 40);
    const { cw, ch, cols, rows } = S.m;
    const fg = LAB.css(th.fg), bg = LAB.css(th.bg), ac = LAB.css(th.ac);
    const a = LAB.atlas(T.CHARS, fg, cw, ch), inv = LAB.atlas(T.CHARS, bg, cw, ch);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const lt = ((t % LOOP) + LOOP) % LOOP, cycle = Math.floor(t / LOOP);
    const k = Math.min(STEPS - 1, Math.floor(lt / BEAT)), n = 1 << k;
    const sub = Math.floor(lt / (BEAT / 4)); // 16th-note focus jumps
    const NAMES = ['claude', 'codex', 'zsh', 'cargo', 'gemini', 'nvim', 'git', 'acp'];
    const tabOf = (i) => { const h = LAB.hash(seed + cycle, i, 3); return { name: NAMES[Math.floor(h * NAMES.length)], id: i }; };
    const active = n === 1 ? 0 : Math.floor(LAB.hash(seed + cycle, sub, 4) * n);

    // window chrome: top rule, tab strip (2 rows tall), rule, content
    const sy = Math.round(ch * 1.5), sh = ch * 2, gx = cw * 2, gw = W - cw * 4;
    ctx.fillStyle = T.shade(ctx, fg, 0.5); ctx.fillRect(gx, sy - 1, gw, 1); ctx.fillRect(gx, sy + sh, gw, 1);
    // exact integer tab edges: tab i spans [floor(i*gw/n), floor((i+1)*gw/n))
    for (let i = 0; i < n; i++) {
      const x0 = gx + Math.floor(i * gw / n), x1 = gx + Math.floor((i + 1) * gw / n), w = x1 - x0, tb = tabOf(i);
      const on = i === active;
      if (on) { ctx.fillStyle = fg; ctx.fillRect(x0, sy, w, sh); }
      else { ctx.fillStyle = T.shade(ctx, fg, 0.12); ctx.fillRect(x0, sy, w, sh); }
      ctx.fillStyle = on ? bg : fg; ctx.fillRect(x1 - 1, sy, 1, sh);
      // provider pip (tiny signal)
      const pip = tb.name === 'codex' ? LAB.CODEX : tb.name === 'claude' ? LAB.CLAUDE : null;
      const pw = Math.max(2, Math.round(cw * 0.5));
      if (pip && w > pw + 4) { ctx.fillStyle = LAB.css(pip); ctx.fillRect(x0 + Math.min(cw, (w - pw) >> 1), sy + Math.round(ch * 0.75), pw, Math.round(ch * 0.5)); }
      const room = Math.floor((w - cw * 2.2) / cw);
      if (room >= 2) LAB.text(ctx, on ? inv : a, (tb.name + ' ' + (i + 1)).slice(0, room), x0 + Math.round(cw * 1.8), sy + Math.round(ch * 0.5));
    }
    // tab count readout, right aligned under the strip
    const label = String(n).padStart(2, ' ') + ' tabs';
    LAB.text(ctx, a, label, gx + gw - label.length * cw, sy + sh + Math.round(ch * 0.6));

    // content: the active tab's stream; cuts instantly when focus jumps
    const cy = sy + sh + ch * 2, crow = rows - Math.ceil(cy / ch) - 1;
    const tb = tabOf(active), off = lt * 9 + LAB.hash(seed, tb.id, 7) * 300, first = Math.floor(off), dy = Math.round((off - first) * ch);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, cy, gw, crow * ch); ctx.clip();
    for (let r = 0; r <= crow; r++) {
      const L = T.line(seed + cycle * 13, tb.id + 100, first + r);
      if (L.kind === 'blank') continue;
      const y = cy + r * ch - dy;
      LAB.line(ctx, a, L.text.slice(0, cols - 6), gx + cw, y);
      if (L.kind === 'dim') { ctx.fillStyle = T.shade(ctx, bg, 0.5); ctx.fillRect(gx, y, gw, ch); }
    }
    ctx.restore();
    // focused-pane accent rule
    ctx.fillStyle = ac; const ax0 = gx + Math.floor(active * gw / n), ax1 = gx + Math.floor((active + 1) * gw / n);
    ctx.fillRect(ax0, cy - Math.round(ch * 0.5), Math.max(2, ax1 - ax0), 2);
  },
});
