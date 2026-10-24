/* Del UI builders (pure string templates, deterministic) + seek-safe typing helpers. */
(function () {
  const I = (name, size = 15, color = "") =>
    `<span class="ico" style="-webkit-mask:url('assets/del/icons/${name}.svg') center / contain no-repeat;mask:url('assets/del/icons/${name}.svg') center / contain no-repeat;width:${size}px;height:${size}px;${color ? `color:${color};` : ""}"></span>`;
  const PROV = {
    codex: { name: "Codex", icon: "codex", color: "#f5f5f5", accent: "#3b82f6" },
    claude: { name: "Claude Code", icon: "claude", color: "#e3e3e6", accent: "#e3e3e6" },
    acp: { name: "Gemini CLI", icon: "acp", color: "#c9c9ce", accent: "#a3a3a8" },
  };
  const pmark = (p, size = 14) => I(PROV[p].icon, size, PROV[p].color);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const ARROW = `<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const PLUS = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const FOLDER = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const SIDEBAR_ICO = `<svg viewBox="0 0 24 24" width="15" height="15"><rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 4v16" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const SEARCH_ICO = `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const EDIT_ICO = `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

  const DEFAULT_SESSIONS = [
    { p: "codex", t: "Fix the flaky upload retry", sel: true },
    { p: "claude", t: "Profile the search worker" },
    { p: "acp", t: "Match this settings layout", unread: true },
    { p: "codex", t: "Add a regression test", unread: true },
    { p: "claude", t: "Explain the queue reorder bug" },
    { p: "codex", t: "Bump the tokio pin" },
    { p: "claude", t: "Draft the changelog" },
  ];
  const DEFAULT_TERMS = [{ t: "zsh · uploader" }, { p: "claude", t: "claude · search-worker" }];

  function sidebar(o = {}) {
    const sessions = o.sessions || DEFAULT_SESSIONS;
    const terms = o.terms || DEFAULT_TERMS;
    const id = o.id || "sb";
    return `<aside class="dside" id="${id}">
      <div class="srow snew">${EDIT_ICO}<span class="st">New session</span></div>
      <div class="srow">${SEARCH_ICO}<span class="st">Search</span><span style="color:var(--faint);font-size:11px">⌘K</span></div>
      <div class="slabel">Sessions</div>
      ${sessions.map((s, i) => `<div class="srow ${s.sel ? "sel" : ""}" id="${id}-s${i}">${pmark(s.p, 15)}<span class="st">${esc(s.t)}</span>${s.pin ? I("pin-filled", 13, "#f5f5f5") : ""}${s.unread ? `<span class="udot"></span>` : ""}</div>`).join("")}
      <div class="slabel">TERMINALS</div>
      ${terms.map((s, i) => `<div class="srow" id="${id}-t${i}">${s.p ? pmark(s.p, 15) : `<span class="mono" style="font-size:11px;color:var(--muted);width:15px">&gt;_</span>`}<span class="st">${esc(s.t)}</span></div>`).join("")}
      <div class="sfoot"><span class="cup" id="${id}-cup">${I("coffee-cup", 18, "var(--steam)")}${[0, 1, 2].map((k) => `<span class="steam" id="${id}-steam${k}" style="left:${5 + k * 3}px">${I("coffee-steam", 2, "var(--steam)").replace("width:2px;height:2px", "width:2px;height:5px")}</span>`).join("")}</span><span style="flex:1"></span>${I("archive", 15, "var(--muted)")}<span style="font-size:15px">⚙</span></div>
    </aside>`;
  }

  function tabs(o = {}) {
    const list = o.tabs || [
      { p: "codex", t: "Fix the flaky upload retry", active: true },
      { p: "claude", t: "Profile the search worker" },
      { p: "acp", t: "Match this settings layout" },
    ];
    const id = o.id || "tabs";
    return `<div class="tabs" id="${id}">${list.map((t, i) => `<div class="tab ${t.active ? "active" : ""} ${t.preview ? "preview" : ""}" id="${id}-${i}">${t.p ? pmark(t.p, 15) : `<span class="mono" style="font-size:10px;color:var(--muted)">&gt;_</span>`}<span class="tt">${esc(t.t)}</span>${o.badges ? `<span class="badge" id="${id}-b${i}">⌘${i + 1}</span>` : ""}</div>`).join("")}<span class="tab-plus">${PLUS}</span></div>`;
  }

  function composer(o = {}) {
    const id = o.id || "comp";
    const p = o.provider || "codex";
    const mode = o.mode || "chat";
    return `<div class="comp" id="${id}">
      ${o.atts ? `<div class="atts" id="${id}-atts">${o.atts}</div>` : ""}
      <div class="ctext" id="${id}-text">${o.text ? o.text : ""}<span class="typed" id="${id}-typed"></span><span class="caret" id="${id}-caret" style="width:1.5px;height:16px;vertical-align:-3px"></span>${o.placeholder ? `<span class="ph" id="${id}-ph">${esc(o.placeholder)}</span>` : ""}</div>
      <div class="crow">
        <span class="cbtn">${PLUS}</span>
        <span class="pchip">${pmark(p, 15)}${esc(o.model || (p === "codex" ? "gpt-5.5-codex" : p === "claude" ? "Opus 5.5" : "Default"))}</span>
        ${o.effort !== false ? `<span class="pchip q">${esc(o.effortLabel || "High")}</span>` : ""}
        <span class="cspacer"></span>
        <span class="cbtn mic" id="${id}-mic">${I("microphone", 16, "rgba(255,255,255,0.6)")}</span>
        <span class="send ${o.ready ? "on" : ""}" id="${id}-send">${ARROW}</span>
      </div>
      ${o.footer === false ? "" : `<div class="cfoot"><span class="folder">${FOLDER}<span>${esc(o.folder || "~/dev/uploader")}</span></span><span class="cspacer"></span><span class="mode" id="${id}-mode"><span class="pill" id="${id}-pill" style="width:${mode === "chat" ? 48 : 70}px;left:${mode === "chat" ? 0 : 48}px"></span><span id="${id}-mchat" class="${mode === "chat" ? "on" : ""}" style="width:48px">Chat</span><span id="${id}-mterm" class="${mode === "terminal" ? "on" : ""}" style="width:70px">Terminal</span></span></div>`}
    </div>`;
  }

  function windowFrame(inner, o = {}) {
    const id = o.id || "win";
    return `<div class="dwin" id="${id}" style="${o.style || ""}">
      <div class="backdrop"></div><div class="shellc"></div>
      <div class="topbar"><div class="traffic"><i></i><i></i><i></i></div><span class="tb-btn">${SIDEBAR_ICO}</span>${tabs({ id: id + "-tabs", tabs: o.tabs, badges: o.badges })}<div class="tb-right"><span class="tb-btn">${SIDEBAR_ICO.replace('d="M9 4v16"', 'd="M15 4v16"')}</span></div></div>
      <div class="dbody">${o.sidebar === false ? `<div style="width:6px"></div>` : sidebar({ id: id + "-sb", sessions: o.sessions })}<div class="dpage"><div class="pmain" id="${id}-main">${inner}</div>${o.right ? `<div class="dright" id="${id}-right">${o.right}</div>` : ""}</div></div>
    </div>`;
  }

  function diff(o = {}) {
    const lines = o.lines || [
      ["h", "@@ -41,7 +41,9 @@ fn retry_upload"],
      ["", "     for attempt in 0..MAX_ATTEMPTS {"],
      ["rm", "-        sleep(Duration::from_millis(500)).await;"],
      ["add", "+        let delay = BASE * 2u32.pow(attempt);"],
      ["add", "+        sleep(delay + jitter()).await;"],
      ["", "         match send(&chunk).await {"],
    ];
    return `<div class="diff" id="${o.id || "diff"}"><div class="dh"><span class="mono" style="color:var(--tx-2)">${esc(o.file || "src/upload.rs")}</span><span class="a">+${o.add || 6}</span><span class="r">−${o.rm || 2}</span></div>${lines.map((l) => `<div class="ln ${l[0] === "h" ? "" : l[0]}" ${l[0] === "h" ? 'style="color:var(--faint)"' : ""}>${esc(l[1])}</div>`).join("")}</div>`;
  }

  function terminal(lines, o = {}) {
    return `<div class="term" id="${o.id || "term"}" style="${o.style || ""}">${lines.map((l, i) => `<div id="${o.id || "term"}-l${i}">${l}</div>`).join("")}</div>`;
  }

  function queue(rows, o = {}) {
    const id = o.id || "q";
    return `<div class="queue" id="${id}">${rows.map((r, i) => `<div class="qrow" id="${id}-r${i}">${I("queue", 14, "var(--muted)")}<span class="qt">${esc(r)}</span><span class="qa"><span>Steer</span><span>Edit</span><span>Delete</span></span></div>`).join("")}</div>`;
  }

  function palette(o = {}) {
    const id = o.id || "pal";
    const rows = o.rows || [];
    return `<div class="palette" id="${id}"><div class="pin">${SEARCH_ICO}<span class="typed" id="${id}-typed"></span><span class="caret" id="${id}-caret" style="width:1.5px;height:18px;vertical-align:-3px"></span><span class="ph" id="${id}-ph">Search all conversations…</span><span class="phint">/c chats · /t terminals</span></div>${rows.map((r, i) => `<div class="prow ${r.sel ? "sel" : ""}" id="${id}-r${i}">${pmark(r.p, 16)}<div style="min-width:0;flex:1"><div class="pk"><span style="color:var(--tx);font-size:12.5px">${esc(r.title)}</span><span>${r.kind}</span></div><div class="pt">${r.html}</div></div></div>`).join("")}</div>`;
  }

  function picker(o = {}) {
    const id = o.id || "pk";
    const rows = o.rows || [];
    return `<div class="picker" id="${id}"><div class="ps"><span class="typed" id="${id}-typed" style="color:var(--tx)"></span><span class="caret" id="${id}-caret" style="width:1.5px;height:15px;vertical-align:-3px;color:var(--tx)"></span><span class="ph" id="${id}-ph">Search models…</span></div>${rows.map((r, i) => `<div class="pr ${r.sel ? "sel" : ""}" id="${id}-r${i}">${pmark(r.p, 13)}<span>${esc(r.t)}</span>${r.def ? `<span class="def">Default</span>` : ""}${r.fast ? `<span class="def">${I("zap", 13, "var(--muted)")}</span>` : ""}</div>`).join("")}
      <div class="effort"><div class="el"><span>Reasoning effort</span><span id="${id}-elabel">Medium</span></div><div class="track" id="${id}-track"><div class="rail"></div><div class="fill" id="${id}-fill"></div>${[0, 1, 2, 3].map((k) => `<span class="stop" style="left:${14 + k * (226 / 3)}px"></span>`).join("")}<div class="thumb" id="${id}-thumb"></div></div></div></div>`;
  }

  function rightPanel(o = {}) {
    const id = o.id || "rp";
    const tab = o.tab || "files";
    const code = [
      ["c", "// Retry a chunk upload with exponential backoff."],
      ["", "<span class='k'>pub async fn</span> <span class='f'>retry_upload</span>(chunk: &amp;Chunk) -&gt; Result&lt;()&gt; {"],
      ["", "    <span class='k'>for</span> attempt <span class='k'>in</span> 0..MAX_ATTEMPTS {"],
      ["", "        <span class='k'>let</span> delay = BASE * 2u32.pow(attempt);"],
      ["", "        sleep(delay + jitter()).<span class='k'>await</span>;"],
      ["", "        <span class='k'>match</span> <span class='f'>send</span>(chunk).<span class='k'>await</span> {"],
      ["", "            Ok(()) =&gt; <span class='k'>return</span> Ok(()),"],
      ["", "            Err(e) <span class='k'>if</span> e.retryable() =&gt; <span class='k'>continue</span>,"],
      ["", "            Err(e) =&gt; <span class='k'>return</span> Err(e),"],
      ["", "        }"],
      ["", "    }"],
      ["", "    Err(Error::<span class='f'>exhausted</span>(<span class='s'>\"upload\"</span>))"],
      ["", "}"],
    ];
    const files = `<div class="tree"><div class="tr">▾ <span>uploader</span></div><div class="tr" style="padding-left:14px">▾ <span>src</span></div><div class="tr" style="padding-left:28px"><span>main.rs</span></div><div class="tr sel" style="padding-left:28px"><span>upload.rs</span></div><div class="tr" style="padding-left:28px"><span>queue.rs</span></div><div class="tr" style="padding-left:14px">▸ <span>tests</span></div><div class="tr" style="padding-left:14px"><span>Cargo.toml</span></div><div class="tr" style="padding-left:14px"><span>CHANGELOG.md</span></div></div><div class="viewer">${code.map((l, i) => `<div class="vl"><span class="vn">${39 + i}</span><span class="${l[0]}">${l[1]}</span></div>`).join("")}</div>`;
    const term = terminal([`<span class="d">~/dev/uploader</span> <span class="g">❯</span> cargo test upload`, `   Compiling uploader v0.4.1`, `    Finished test [optimized] in 3.8s`, `running 14 tests`, `test upload::retry_backoff ... <span class="g">ok</span>`, `test upload::exhausts_after_max ... <span class="g">ok</span>`, `test queue::reorder ... <span class="g">ok</span>`, ``, `test result: <span class="g">ok</span>. 14 passed; 0 failed`, `<span class="d">~/dev/uploader</span> <span class="g">❯</span> <span class="caret" style="width:7px;height:14px;vertical-align:-2px"></span>`], { id: id + "-term", style: "font-size:11.5px;padding:12px" });
    const browser = `<div class="bbar"><span>‹</span><span>›</span><span>↻</span><span class="url">localhost:5173/settings</span></div><div style="flex:1;background:#f6f6f7;color:#111;padding:18px;font-size:12px"><div style="font-size:16px;font-weight:600;margin-bottom:14px">Settings</div>${["Appearance", "Notifications", "Uploads", "Account"].map((s, i) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e4e4e7"><span>${s}</span><span style="width:30px;height:18px;border-radius:9px;background:${i % 2 ? "#d4d4d8" : "#111113"};position:relative;display:inline-block"><span style="position:absolute;top:2px;${i % 2 ? "left:2px" : "right:2px"};width:14px;height:14px;border-radius:50%;background:#fff"></span></span></div>`).join("")}</div>`;
    return `<div class="rtabs"><span class="rtab ${tab === "files" ? "on" : ""}" id="${id}-tf">Files</span><span class="rtab ${tab === "terminal" ? "on" : ""}" id="${id}-tt">Terminal</span><span class="rtab ${tab === "browser" ? "on" : ""}" id="${id}-tb">Browser</span></div>
      <div id="${id}-files" style="flex:1;display:${tab === "files" ? "flex" : "none"};flex-direction:column;min-height:0">${files}</div>
      <div id="${id}-terminal" style="flex:1;display:${tab === "terminal" ? "block" : "none"}">${term}</div>
      <div id="${id}-browser" style="flex:1;display:${tab === "browser" ? "flex" : "none"};flex-direction:column">${browser}</div>`;
  }

  function logo(size = 64, extra = "") {
    return `<img class="${extra}" src="assets/del/del.svg" alt="" style="width:${size}px;height:${size}px;display:block">`;
  }

  window.DEL = { I, PROV, pmark, esc, ARROW, PLUS, FOLDER, SEARCH_ICO, sidebar, tabs, composer, windowFrame, diff, terminal, queue, palette, picker, rightPanel, logo, DEFAULT_SESSIONS };

})();
