// 10 Cellular / grid growth: deterministic arrival-time field (seeded Dijkstra) fills the frame cell by cell.
LAB.register({
  name: 'Cell growth',
  tech: 'Seeded Dijkstra over noisy cell costs → arrival time per cell; state = f(t − arrival): front / solid / settled',
  beat: '19.7 s instrumental cascade, or 7.2 s drop 1: the frame fills with live cells on the hit',
  seed: 10,
  px: 1,
  maxW: 1920,
  draw(ctx, W, H, t, seed, th, S) {
    const FILL = 4.2, LOOP = 6.4;
    if (!S.arr) {
      const cs = Math.max(3, Math.floor(H / 72)), gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), N = gw * gh;
      const cost = new Float32Array(N), arr = new Float64Array(N).fill(Infinity); // f64: heap keys must compare exactly
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const n = LAB.noise(x * 0.09, y * 0.09, seed) * 0.7 + LAB.noise(x * 0.31, y * 0.31, seed + 3) * 0.3;
        cost[y * gw + x] = Math.exp(n * 6); // high contrast costs → branching, coral-like fronts
      }
      // binary heap of [time, index]
      const hp = [], push = (d, i) => { hp.push([d, i]); let c = hp.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hp[p][0] <= hp[c][0]) break; [hp[p], hp[c]] = [hp[c], hp[p]]; c = p; } };
      const pop = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === c) break; [hp[m], hp[c]] = [hp[c], hp[m]]; c = m; } } return top; };
      const rr = LAB.rng(seed), ns = 2 + Math.floor(rr() * 3);
      for (let s = 0; s < ns; s++) { const i = Math.floor(rr() * gh) * gw + Math.floor(rr() * gw); arr[i] = rr() * 0.4; push(arr[i], i); }
      while (hp.length) {
        const [d, i] = pop(); if (d > arr[i]) continue;
        const x = i % gw, y = (i / gw) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = ny * gw + nx, nd = d + cost[j]; if (nd < arr[j]) { arr[j] = nd; push(nd, j); }
        }
      }
      // normalise by rank so the fill takes exactly FILL seconds regardless of resolution
      const order = Array.from(arr.keys()).sort((a, b) => arr[a] - arr[b]);
      order.forEach((i, r) => { arr[i] = (r / N) ** 1.25 * FILL; });
      Object.assign(S, { cs, gw, gh, arr });
    }
    const { cs, gw, gh, arr } = S, fg = LAB.css(th.fg), bg = LAB.css(th.bg), ac = LAB.css(th.ac);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const lt = ((t % LOOP) + LOOP) % LOOP;
    const settled = LAB.term.shade(ctx, fg, 0.5), gap = cs > 4 ? 1 : 0;
    const blink = Math.floor(lt * 8); // 8 Hz automaton flicker in the settled region
    // batch rects per state: one path fill each (front / fresh / settled)
    const paths = [new Path2D(), new Path2D(), new Path2D()], w = cs - gap;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x, age = lt - arr[i];
      if (age < 0) continue;
      if (age < 0.1) paths[0].rect(x * cs, y * cs, w, w);                       // front
      else if (age < 0.7) paths[1].rect(x * cs, y * cs, w, w);                  // freshly grown
      else if (LAB.hash(i, blink, seed) >= 0.06) paths[2].rect(x * cs, y * cs, w, w); // settled, sparse hard flicker
    }
    ctx.fillStyle = ac; ctx.fill(paths[0]); ctx.fillStyle = fg; ctx.fill(paths[1]); ctx.fillStyle = settled; ctx.fill(paths[2]);
  },
});
