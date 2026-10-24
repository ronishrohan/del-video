// 14 Giant type: frame-filling words hard-cut on the beat, filled with sliding Bayer bands; every 4th beat goes tiny.
LAB.register({
  name: 'Giant type',
  tech: 'Word masks (cached offscreen fillText) × translating band field, Bayer 1-bit; tiny-centred line every 4th beat',
  beat: '22.9-29.3 s "Built in Rust. Rendered on the GPU." frame-filling RUST / GPU on drop 2 (25.3 s)',
  seed: 14,
  px: 2,
  maxW: 960,
  draw(ctx, W, H, t, seed, th, S) {
    const BEAT = 60 / 132;
    const BIG = ['RUST', 'GPU', 'FAST', 'DEL', 'LIGHT', 'SPLIT', 'TABS', 'ZERO'];
    const TINY = ['built in rust.', 'rendered on the gpu.', 'no web wrapper.', 'nothing wasted.', 'light by design.'];
    if (!S.img) { S.img = ctx.createImageData(W, H); S.px = new Uint32Array(S.img.data.buffer); S.masks = new Map(); }
    const mask = (word, tiny) => {
      const key = word + tiny; let m = S.masks.get(key); if (m) return m;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      if (tiny) { x.font = `${Math.max(9, Math.round(H * 0.045))}px ${LAB.FONT}`; x.fillText(word, W / 2, H / 2 + H * 0.015); }
      else {
        // fit the word to 94% of the width, cap at 86% of height (crisp grotesk, heavy)
        const fam = '"Helvetica Neue",Helvetica,Arial,sans-serif';
        x.font = `900 100px ${fam}`; const w = x.measureText(word).width;
        const size = Math.min(H * 0.86 / 0.72, 100 * W * 0.94 / w);
        x.font = `900 ${Math.round(size)}px ${fam}`; x.fillText(word, W / 2, H / 2 + size * 0.36);
      }
      const d = x.getImageData(0, 0, W, H).data; m = new Uint8Array(W * H);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      S.masks.set(key, m); return m;
    };
    const pack = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const BG = pack(th.bg), FG = pack(th.fg), AC = pack(th.ac), P = S.px, B = LAB.BAYER8;
    const b = Math.floor(t / BEAT), tiny = b % 4 === 3;
    const pick = Math.floor(LAB.hash(seed, b, 1) * (tiny ? TINY.length : BIG.length));
    const word = tiny ? TINY[pick] : BIG[pick === Math.floor(LAB.hash(seed, b - 1, 1) * BIG.length) ? (pick + 1) % BIG.length : pick];
    const M = mask(word, tiny);
    // band field slides sideways (translation); phase re-seeded per beat for a hard change on the cut
    const ph = LAB.hash(seed, b, 2) * 100, sp = 0.6 + LAB.hash(seed, b, 3) * 0.8, dir = LAB.hash(seed, b, 4) < 0.5 ? -1 : 1;
    const slide = Math.round(((t / BEAT) - b) * W * 0.03) * dir; // small per-beat pan of the word
    for (let y = 0; y < H; y++) {
      const by = (y & 7) * 8, row = y * W;
      for (let x = 0; x < W; x++) {
        const sx = x - slide, inW = sx >= 0 && sx < W && M[row + sx] === 1;
        let v;
        if (inW) v = tiny ? 1 : 0.55 + 0.45 * Math.sin((x * 0.018 + y * 0.006) * sp + ph - t * 5 * dir);
        else v = tiny ? 0 : 0.07 * (0.5 + 0.5 * Math.sin(y * 0.05 + ph + t * 2));
        P[row + x] = v > B[by + (x & 7)] ? FG : BG;
      }
    }
    // accent underline on the drop word only
    if (!tiny && word === 'GPU') { const y0 = Math.round(H * 0.93); P.fill(AC, y0 * W + Math.round(W * 0.03), y0 * W + Math.round(W * 0.97)); }
    ctx.putImageData(S.img, 0, 0);
  },
});
