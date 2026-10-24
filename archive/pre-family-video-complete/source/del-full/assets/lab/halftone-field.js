// 03 Halftone dots, hard-edged, radius driven by a scrolling procedural field.
LAB.register({
  name: 'Halftone field',
  tech: 'AM halftone on a fixed square screen, dot radius from fbm + travelling wave (GLSL)',
  beat: '22.9 s range: "Built in Rust" texture bed; sharpen (smaller cells) on the GPU drop',
  seed: 11,
  frag: `
void main(){
  float cell = uRes.y / 46.0;
  vec2 g = floor(gl_FragCoord.xy / cell);
  vec2 f = fract(gl_FragCoord.xy / cell) - 0.5;
  vec2 uv = (g + 0.5) * cell / uRes.y;
  float t = uTime;
  float n = fbm(uv * 2.3 + vec2(t * 0.22, 0.0));
  float w = 0.5 + 0.5 * sin(uv.x * 9.0 - uv.y * 3.0 - t * 1.6 + n * 4.0);
  float v = clamp(n * 0.9 + w * 0.55 - 0.32, 0.0, 1.0);
  float on = step(length(f), 0.7 * sqrt(v));
  gl_FragColor = vec4(ink(on), 1.0);
}`,
});
