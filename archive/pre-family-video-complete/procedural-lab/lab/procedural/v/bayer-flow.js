// 01 Ordered (Bayer 8x8) 1-bit dither of a domain-warped noise flow field.
LAB.register({
  name: 'Bayer flow',
  tech: 'Bayer 8x8 ordered dither, 1-bit, over domain-warped fbm flow (GLSL)',
  beat: '0.0 s hook: the field that breathes behind the first typed line',
  seed: 7,
  frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * 0.12;
  vec2 q = vec2(fbm(uv * 2.2 + vec2(0.0, t)), fbm(uv * 2.2 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(uv * 1.7 + 3.0 * q + vec2(1.7, 9.2) + t * 0.6), fbm(uv * 1.7 + 3.0 * q + vec2(8.3, 2.8) - t * 0.4));
  float v = fbm(uv * 1.4 + 2.6 * r + vec2(t * 1.3, 0.0));
  v = smoothstep(0.28, 0.82, v);
  float on = step(bayer8(gl_FragCoord.xy), v);
  gl_FragColor = vec4(ink(on), 1.0);
}`,
});
