// Shared terminal material: deterministic agent/shell lines + 1-bit Bayer shade patterns.
// Not a tile. line(seed, stream, i) is a pure function, so any scroll offset maps to the same text.
LAB.term = (() => {
  const CHARS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '▸●✓│─┌┐└┘├┤┬┴┼█▓▒░⌘·›';
  const crates = ['gpui', 'del-term', 'del-app', 'alacritty_terminal', 'wgpu', 'tokio', 'serde', 'acp-client', 'del-search', 'taffy'];
  const files = ['crates/app/src/pane.rs', 'crates/term/src/grid.rs', 'crates/app/src/tabs.rs', 'crates/render/src/dither.rs',
    'crates/search/src/index.rs', 'crates/app/src/session.rs', 'crates/acp/src/client.rs', 'crates/app/src/composer.rs'];
  const cmds = ['cargo build --release', 'cargo test -p del-term', 'git status', 'rg "fn split" crates', 'cargo clippy -- -D warnings',
    'git diff --stat', 'cargo run --release', 'ls crates', 'git log --oneline -5', 'cargo bench render'];
  const fns = ['split_pane', 'focus_next', 'resize_grid', 'scroll_to_line', 'spawn_agent', 'queue_message', 'render_frame', 'search_all'];
  const code = ['let pane = Pane::new(cx);', 'self.tabs.push(tab);', 'fn split(&mut self, axis: Axis) {', 'cx.notify();',
    'match event {', 'grid.resize(cols, rows);', 'Ok(())', '}', 'impl Render for Pane {', 'let hits = index.query(&q);'];
  const say = ['Reading', 'Editing', 'Running', 'Searching', 'Writing'];
  const pick = (r, a) => a[Math.floor(r * a.length) % a.length];
  const hex = (r) => Math.floor(r * 0xffffffff).toString(16).padStart(8, '0');

  // kind: prompt | out | ok | err | codex | claude | code | dim | blank
  function line(seed, s, i) {
    const h = (k) => LAB.hash(seed * 7919 + s * 131, i, k);
    const r = h(0), a = h(1), b = h(2), c = h(3);
    if (r < 0.08) return { kind: 'prompt', text: '$ ' + pick(a, cmds) };
    if (r < 0.2) return { kind: 'out', text: '   Compiling ' + pick(a, crates) + ' v0.' + Math.floor(b * 30) + '.' + Math.floor(c * 9) };
    if (r < 0.3) return { kind: 'ok', text: 'test ' + pick(a, fns) + '::' + pick(b, fns) + ' ... ok' };
    if (r < 0.37) return { kind: 'codex', text: 'codex › ' + pick(a, say).toLowerCase() + ' ' + pick(b, files) };
    if (r < 0.44) return { kind: 'claude', text: '● ' + pick(a, say) + '(' + pick(b, files) + ')' };
    if (r < 0.58) return { kind: 'code', text: (b < 0.5 ? '+ ' : '  ') + ' '.repeat(Math.floor(c * 4) * 2) + pick(a, code) };
    if (r < 0.66) return { kind: 'dim', text: '[' + (a * 4).toFixed(2) + 'ms] frame ' + Math.floor(b * 99999) + ' · gpu ' + (c * 0.9).toFixed(2) + 'ms' };
    if (r < 0.72) return { kind: 'dim', text: hex(a) + ' ' + hex(b) + ' ' + hex(c) + ' ' + hex(h(4)) };
    if (r < 0.75) return { kind: 'err', text: 'warning: unused variable `' + pick(a, fns) + '`' };
    if (r < 0.8) return { kind: 'ok', text: '✓ ' + Math.floor(a * 400 + 20) + ' passed · ' + (b * 3).toFixed(2) + 's' };
    if (r < 0.88) return { kind: 'blank', text: '' };
    return { kind: 'out', text: pick(a, files) + ':' + Math.floor(b * 900) + ':' + Math.floor(c * 80) + '  ' + pick(h(5), code) };
  }

  // Bayer shade patterns: level 0..1 = share of pixels painted in `color`.
  const pats = new WeakMap(); // per context: patterns are not shared across canvases
  function shade(ctx, color, level) {
    const q = Math.max(0, Math.min(64, Math.round(level * 64))), key = color + q;
    let m = pats.get(ctx); if (!m) pats.set(ctx, (m = new Map()));
    let p = m.get(key); if (p) return p;
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const x = c.getContext('2d'); x.fillStyle = color;
    for (let i = 0; i < 64; i++) if (LAB.BAYER8[i] * 64 < q) x.fillRect(i % 8, i >> 3, 1, 1);
    p = ctx.createPattern(c, 'repeat'); m.set(key, p); return p;
  }

  // grid metrics for a target row count (pixel-snapped)
  function cells(W, H, rows) { const ch = Math.max(6, Math.floor(H / rows)), cw = Math.max(4, Math.round(ch * 0.6)); return { ch, cw, cols: Math.ceil(W / cw), rows: Math.ceil(H / ch) }; }

  return { CHARS, line, shade, cells };
})();
