// 02 Error diffusion (Atkinson) over a translating gradient field.
LAB.register({
  name: 'Atkinson gradient',
  tech: 'Atkinson error diffusion, 1-bit, over sliding gradient bands + drifting soft masses (canvas 2D)',
  beat: '4.9 s freeze (speed 0) and 44.7 s CTA: calm, slow field under the last typed line',
  seed: 3,
  px: 3,
  maxW: 640,
  draw(ctx, W, H, t, seed, th, S) {
    if (!S.img) {
      S.img = ctx.createImageData(W, H);
      S.px = new Uint32Array(S.img.data.buffer);
      S.buf = new Float32Array(W * H + W * 3);
      const r = LAB.rng(seed);
      S.blobs = Array.from({ length: 5 }, () => ({ x: r(), y: r(), vx: (r() - 0.5) * 0.08, vy: (r() - 0.5) * 0.05, s: 0.12 + r() * 0.2, a: r() < 0.5 ? -0.55 : 0.6 }));
      S.k = 0.6 + r() * 0.8;
    }
    const pack = (c) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const BG = pack(th.bg), FG = pack(th.fg);
    const buf = S.buf, A = W / H;
    buf.fill(0);
    // field: diagonal bands sliding sideways + soft masses translating (wrapping)
    const bl = S.blobs.map((b) => ({ x: (((b.x + b.vx * t) % 1) + 1) % 1 * A, y: (((b.y + b.vy * t) % 1) + 1) % 1, s2: 1 / (b.s * b.s), a: b.a }));
    // separable form (same field): sin(a+b) = sin a cos b + cos a sin b; gaussians split into x and y factors
    if (!S.sx) { S.sx = new Float32Array(W * 4); S.sy = new Float32Array(H * 4); S.ex = new Float32Array(W * 5); S.ey = new Float32Array(H * 5); }
    const { sx, sy, ex, ey } = S, nb = bl.length;
    for (let x = 0; x < W; x++) {
      const nx = x / H, a1 = nx * S.k * 6.2832, a2 = nx * 2.1;
      sx[x * 4] = Math.sin(a1); sx[x * 4 + 1] = Math.cos(a1); sx[x * 4 + 2] = Math.sin(a2); sx[x * 4 + 3] = Math.cos(a2);
      for (let i = 0; i < nb; i++) { let dx = Math.abs(nx - bl[i].x); dx = Math.min(dx, A - dx); ex[x * 5 + i] = Math.exp(-dx * dx * bl[i].s2); }
    }
    for (let y = 0; y < H; y++) {
      const ny = y / H, b1 = ny * 0.45 * 6.2832 - t * 0.35, b2 = -ny * 3.3 + t * 0.2;
      sy[y * 4] = Math.cos(b1); sy[y * 4 + 1] = Math.sin(b1); sy[y * 4 + 2] = Math.cos(b2); sy[y * 4 + 3] = Math.sin(b2);
      for (let i = 0; i < nb; i++) { const dy = ny - bl[i].y; ey[y * 5 + i] = bl[i].a * Math.exp(-dy * dy * bl[i].s2); }
    }
    for (let y = 0; y < H; y++) {
      const c1 = sy[y * 4], s1 = sy[y * 4 + 1], c2 = sy[y * 4 + 2], s2 = sy[y * 4 + 3], g = 0.35 + 0.65 * (1 - y / H), o = y * 5;
      for (let x = 0; x < W; x++) {
        const q = x * 4, e = x * 5;
        let v = 0.5 + 0.32 * (sx[q] * c1 + sx[q + 1] * s1) + 0.12 * (sx[q + 2] * c2 + sx[q + 3] * s2);
        for (let i = 0; i < nb; i++) v += ex[e + i] * ey[o + i];
        buf[y * W + x] += v * g;
      }
    }
    // Atkinson: 6 neighbours x 1/8, 3/4 of the error propagated
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, old = buf[i], on = old > 0.5 ? 1 : 0, e = (old - on) / 8;
        S.px[i] = on ? FG : BG;
        if (x + 1 < W) buf[i + 1] += e;
        if (x + 2 < W) buf[i + 2] += e;
        if (x > 0) buf[i + W - 1] += e;
        buf[i + W] += e;
        if (x + 1 < W) buf[i + W + 1] += e;
        buf[i + 2 * W] += e;
      }
    }
    ctx.putImageData(S.img, 0, 0);
  },
});
