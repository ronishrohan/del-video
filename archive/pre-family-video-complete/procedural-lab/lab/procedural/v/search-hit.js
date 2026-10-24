// 12 Search hit: a huge glyph field, ⌘K palette cuts in, query types, frame snaps to one line deep in history.
LAB.register({
  name: 'Search hit',
  tech: 'Small-cell glyph field of a long session; palette is a hard cut; scroll snaps (no tween) to the hit, inverted',
  beat: '35.3-39.2 s "Search it. Find it. Jump to the line." (⌘K)',
  seed: 12,
  px: 1,
  maxW: 1920,
  draw(ctx, W, H, t, seed, th, S) {
    const T = LAB.term, LOOP = 5.2;
    if (!S.m) S.m = T.cells(W, H, 66);
    const { cw, ch, cols, rows } = S.m;
    const fg = LAB.css(th.fg), bg = LAB.css(th.bg), ac = LAB.css(th.ac);
    const a = LAB.atlas(T.CHARS, fg, cw, ch), inv = LAB.atlas(T.CHARS, bg, cw, ch);
    const lt = ((t % LOOP) + LOOP) % LOOP, cycle = Math.floor(t / LOOP), sd = seed + cycle * 31;

    // pick a hit deep in the session: first line past a seeded index with enough text
    const base = 200 + Math.floor(LAB.hash(sd, 1, 1) * 400);
    let hit = base + 1400 + Math.floor(LAB.hash(sd, 2, 2) * 2000);
    while (!/[a-z_]{4,}/.test(T.line(sd, 0, hit).text) || T.line(sd, 0, hit).text.length < 24) hit++;
    const hitText = T.line(sd, 0, hit).text, m = hitText.match(/[a-z_]{4,}[^ ]*( [^ ]+)?/), query = (m ? m[0] : hitText).slice(0, 18);

    const P0 = 1.0, TYPE = 1.15, CPS = 0.05, RES = TYPE + query.length * CPS + 0.12, JUMP = RES + 0.45, BACK = LOOP - 0.4;
    const jumped = lt >= JUMP && lt < BACK;
    // scroll: slow drift before the jump; after it the hit line sits exactly at mid-frame
    const mid = Math.floor(rows / 2);
    const top = jumped ? hit - mid : base + Math.floor(lt * 7);
    const dy = jumped ? 0 : Math.round(((lt * 7) % 1) * ch);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r <= rows; r++) {
      const idx = top + r, L = T.line(sd, 0, idx), y = r * ch - dy;
      if (L.kind === 'blank') continue;
      if (jumped && idx === hit) {
        ctx.fillStyle = fg; ctx.fillRect(0, y, W, ch);
        ctx.fillStyle = ac; ctx.fillRect(0, y, cw, ch);
        LAB.text(ctx, inv, L.text.slice(0, cols - 10), cw * 6, y);
        // line number gutter
        LAB.text(ctx, inv, String(idx).padStart(5, ' '), 0, y);
        continue;
      }
      const half = Math.floor(cols / 2);
      LAB.line(ctx, a, String(idx).padStart(5, ' ') + ' ' + L.text.slice(0, half - 8), 0, y);
      // second session column on the right half (another agent's history)
      const R = T.line(sd, 1, idx * 3 + 7);
      if (R.kind !== 'blank') LAB.line(ctx, a, R.text.slice(0, cols - half - 2), half * cw, y);
    }
    // thin everything but the hit after the jump; gutter always thinned
    ctx.fillStyle = T.shade(ctx, bg, 0.6); ctx.fillRect(0, 0, cw * 5, H);
    if (jumped) {
      const hy = mid * ch;
      ctx.fillStyle = T.shade(ctx, bg, 0.72);
      ctx.fillRect(cw * 5, 0, W, hy); ctx.fillRect(cw * 5, hy + ch, W, H - hy - ch);
      const tag = ` line ${hit} `;
      LAB.text(ctx, a, tag, W - (tag.length + 2) * cw, hy - ch * 1.5);
    }

    // palette: instant on at P0, instant off at JUMP
    if (lt >= P0 && lt < JUMP) {
      const pw = Math.min(cols - 8, 58), px = Math.floor((cols - pw) / 2) * cw, py = Math.floor(rows * 0.22) * ch, nres = lt >= RES ? 4 : 0, ph = (3 + nres) * ch;
      ctx.fillStyle = bg; ctx.fillRect(px - cw, py - ch, pw * cw + 2 * cw, ph + 2 * ch);
      ctx.fillStyle = fg; ctx.fillRect(px - cw, py - ch, pw * cw + 2 * cw, 1); ctx.fillRect(px - cw, py + ph + ch, pw * cw + 2 * cw, 1);
      ctx.fillRect(px - cw, py - ch, 1, ph + 2 * ch); ctx.fillRect(px + pw * cw + cw, py - ch, 1, ph + 2 * ch);
      const typed = query.slice(0, Math.max(0, Math.floor((lt - TYPE) / CPS) + 1) * (lt >= TYPE ? 1 : 0));
      LAB.text(ctx, a, '⌘K  ' + typed, px, py);
      if (Math.floor(lt * 4) % 2 === 0 || typed.length < query.length) { ctx.fillStyle = fg; ctx.fillRect(px + (4 + typed.length) * cw, py, Math.max(2, cw >> 2), ch); }
      LAB.text(ctx, a, 'search all sessions', px, py + ch * 1.5);
      ctx.fillStyle = T.shade(ctx, bg, 0.5); ctx.fillRect(px, py + ch * 1.5, pw * cw, ch);
      if (nres) {
        for (let i = 0; i < nres; i++) {
          let j = hit + 37 * (i + 1); while (T.line(sd, 0, j).text.length < 12) j++;
          const ry = py + ch * (3 + i), txt = i === 0 ? hitText : T.line(sd, 0, j).text;
          const row = (i === 0 ? 'zsh · ' : 'claude · ') + txt;
          if (i === 0) { ctx.fillStyle = fg; ctx.fillRect(px, ry, pw * cw, ch); LAB.text(ctx, inv, row.slice(0, pw - 1), px, ry); }
          else LAB.text(ctx, a, row.slice(0, pw - 1), px, ry);
        }
      }
    }
  },
});
