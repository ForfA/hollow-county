// Hollow County — DOM screens: boot, EBS cold open, title & menus, story pages, level cards, notes, pause, death, intermission, ending.
'use strict';
HC.screens = (function () {
  const S = {};
  const ui = () => document.getElementById('ui');
  let keyHandler = null;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  S.clear = function () { ui().innerHTML = ''; setKeys(null); };
  function setKeys(fn) { if (keyHandler) removeEventListener('keydown', keyHandler, true); keyHandler = fn; if (fn) addEventListener('keydown', fn, true); }
  function show(node) { S.clear(); ui().appendChild(node); return node; }
  S.active = () => ui().children.length > 0;

  // ------------------------------------------------------------ generic menu
  function menu(container, items, opts) {
    const wrap = el('div', 'menu' + (opts && opts.cls ? ' ' + opts.cls : ''));
    let sel = items.findIndex((i) => !i.disabled);
    const nodes = items.map((it, i) => {
      const n = el('div', 'mi' + (it.disabled ? ' dis' : ''), esc(it.label) + (it.sub ? `<small>${esc(it.sub)}</small>` : ''));
      n.addEventListener('mouseenter', () => { if (!it.disabled && sel !== i) { sel = i; paint(); HC.audio.play('uiMove'); } });
      n.addEventListener('click', () => { if (!it.disabled) { HC.audio.play('uiSelect'); it.action(); } });
      wrap.appendChild(n);
      return n;
    });
    const paint = () => nodes.forEach((n, i) => n.classList.toggle('sel', i === sel));
    paint();
    container.appendChild(wrap);
    setKeys((e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { do { sel = (sel + 1) % items.length; } while (items[sel].disabled); paint(); HC.audio.play('uiMove'); e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { do { sel = (sel - 1 + items.length) % items.length; } while (items[sel].disabled); paint(); HC.audio.play('uiMove'); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'Space') { HC.audio.play('uiSelect'); items[sel].action(); e.preventDefault(); }
      else if (e.code === 'Escape' && opts && opts.back) { HC.audio.play('uiMove'); opts.back(); e.preventDefault(); }
      e.stopPropagation();
    });
    return wrap;
  }

  // ------------------------------------------------------------ boot
  S.boot = function (onGo) {
    const n = show(el('div', 'screen boot grain'));
    n.innerHTML = `<div class="b-title">HOLLOW COUNTY</div><div class="b-go blink">Click or press any key to begin</div>
      <div class="b-sub">Headphones recommended<br>Best in a desktop browser with keyboard &amp; mouse</div>`;
    let done = false;
    const go = () => { if (done) return; done = true; onGo(); };
    n.addEventListener('click', go);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); go(); });
  };

  // ------------------------------------------------------------ Emergency Broadcast cold open
  S.ebs = function (onDone) {
    const n = show(el('div', 'screen ebs scan'));
    const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].map((c) => `<i style="background:${c}"></i>`).join('');
    const bars2 = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'].map((c) => `<i style="background:${c}"></i>`).join('');
    n.innerHTML = `<div class="bars">${bars}</div><div class="bars2">${bars2}</div><div class="low"></div>
      <div class="box jitter"><h1>EMERGENCY BROADCAST SYSTEM</h1><h2>THIS IS NOT A TEST</h2></div>
      <div class="crawl-wrap"><div class="crawl">${esc(HC.story.ebsCrawl)}</div></div>
      <button class="btn skip">Skip ▸</button><div class="vignette"></div>`;
    HC.audio.play('ebs', { dur: 5.5, vol: 0.14 });
    const snd = HC.audio.loop('static', { vol: 0.05, fade: 0.3 });
    const crawl = n.querySelector('.crawl');
    let x = window.innerWidth, raf, done = false;
    const w = () => crawl.scrollWidth;
    const step = () => { x -= 3.2; crawl.style.transform = `translateX(${x}px)`; if (x < -w()) finish(); else raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    const timer = setTimeout(finish, 13000);
    function finish() {
      if (done) return; done = true;
      cancelAnimationFrame(raf); clearTimeout(timer); snd.stop(0.4);
      onDone();
    }
    n.querySelector('.skip').addEventListener('click', finish);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); finish(); });
  };

  // ------------------------------------------------------------ logo (procedural)
  let logoURL = null;
  S.logo = function () {
    if (logoURL) return logoURL;
    const W = 1600, H = 560;
    const c = HC.canvas(W, H), x = c.getContext('2d');
    const txt = (t, size, y, spacing) => {
      x.font = `${size}px Anton, Impact, 'Arial Narrow Bold', sans-serif`;
      x.textBaseline = 'alphabetic';
      const chars = t.split('');
      const widths = chars.map((ch) => x.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      let px = (W - total) / 2;
      return chars.map((ch, i) => { const o = { ch, x: px, y }; px += widths[i] + spacing; return o; });
    };
    const big = txt('HOLLOW', 300, 330, 14), small = txt('COUNTY', 118, 480, 46);
    const draw = (set, size, fill, dx, dy) => { x.font = `${size}px Anton, Impact, 'Arial Narrow Bold', sans-serif`; x.fillStyle = fill; set.forEach((o) => x.fillText(o.ch, o.x + dx, o.y + dy)); };
    // extrusion
    for (let d = 16; d > 0; d--) { draw(big, 300, `rgb(${20 + d},${12 + d / 2},${8})`, d * 0.7, d); draw(small, 118, `rgb(${20 + d},${12 + d / 2},8)`, d * 0.35, d * 0.5); }
    // body gradient
    const body = HC.canvas(W, H), b = body.getContext('2d');
    const g = b.createLinearGradient(0, 60, 0, 340);
    g.addColorStop(0, '#f2e6c8'); g.addColorStop(0.42, '#c9ad80'); g.addColorStop(0.62, '#8f6a44'); g.addColorStop(1, '#4a2c18');
    b.font = '300px Anton, Impact, sans-serif'; b.fillStyle = g; big.forEach((o) => b.fillText(o.ch, o.x, o.y));
    const g2 = b.createLinearGradient(0, 380, 0, 480); g2.addColorStop(0, '#e6d8b8'); g2.addColorStop(1, '#7a5634');
    b.font = '118px Anton, Impact, sans-serif'; b.fillStyle = g2; small.forEach((o) => b.fillText(o.ch, o.x, o.y));
    // grime & rust
    b.globalCompositeOperation = 'source-atop';
    const r = HC.rng(1993);
    for (let i = 0; i < 2600; i++) { b.fillStyle = `rgba(${r.pick(['40,22,12', '90,40,20', '255,240,210', '20,14,10'])},${r.range(0.05, 0.3)})`; const s = r.range(1, 7); b.fillRect(r() * W, r() * H, s, s * r.range(0.3, 1)); }
    for (let i = 0; i < 26; i++) { b.strokeStyle = `rgba(255,245,220,${r.range(0.08, 0.25)})`; b.lineWidth = r.range(0.6, 2); b.beginPath(); const sx = r() * W, sy = r.range(80, 480); b.moveTo(sx, sy); b.lineTo(sx + r.range(-60, 60), sy + r.range(-20, 20)); b.stroke(); }
    const edge = b.createLinearGradient(0, 0, W, 0); edge.addColorStop(0, 'rgba(0,0,0,.35)'); edge.addColorStop(0.5, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.35)');
    b.fillStyle = edge; b.fillRect(0, 0, W, H);
    x.drawImage(body, 0, 0);
    // bevel highlight
    x.globalCompositeOperation = 'source-atop';
    draw(big, 300, 'rgba(255,250,235,.18)', -3, -3);
    x.globalCompositeOperation = 'source-over';
    // blood drips from the bottom of HOLLOW
    const id = x.getImageData(0, 0, W, H).data;
    const bottomAt = (px) => { for (let y = 345; y > 120; y--) if (id[(y * W + px) * 4 + 3] > 200) return y; return -1; };
    for (let i = 0; i < 26; i++) {
      const px = Math.floor(r.range(big[0].x + 20, big[big.length - 1].x + 150));
      const y0 = bottomAt(px); if (y0 < 0) continue;
      const len = r.range(12, 120) * (r() < 0.3 ? 1.6 : 1), wd = r.range(4, 11);
      const dg = x.createLinearGradient(0, y0 - 6, 0, y0 + len);
      dg.addColorStop(0, '#5a0906'); dg.addColorStop(1, '#9a1a10');
      x.fillStyle = dg;
      x.beginPath(); x.moveTo(px - wd / 2, y0 - 6); x.lineTo(px + wd / 2, y0 - 6); x.lineTo(px + wd * 0.3, y0 + len); x.arc(px, y0 + len, wd * 0.45, 0, Math.PI); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,200,190,.35)'; x.fillRect(px - wd * 0.25, y0, 1.5, len * 0.6);
    }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${120 + r() * 40 | 0},14,10,${r.range(0.3, 0.8)})`; x.beginPath(); x.arc(r.range(200, 1400), r.range(90, 360), r.range(1, 5), 0, 7); x.fill(); }
    // rules beside COUNTY
    x.fillStyle = '#9a1a10'; x.fillRect(small[0].x - 150, 440, 120, 6); x.fillRect(small[small.length - 1].x + 110, 440, 120, 6);
    logoURL = c.toDataURL();
    return logoURL;
  };

  // ------------------------------------------------------------ title
  S.title = function (slam) {
    const n = show(el('div', 'screen title grain'));
    const img = el('img', 'logo' + (slam ? ' slam' : '')); img.src = S.logo(); img.alt = 'Hollow County';
    n.appendChild(img);
    n.appendChild(el('div', 'tag', 'Lorne County, Kentucky &nbsp;·&nbsp; August 1993'));
    const save = HC.loadSave();
    const items = [
      { label: 'New Game', action: () => S.skill() },
      { label: 'Continue', sub: save ? `E1M${save.level + 1}: ${HC.LEVELS[save.level].name}` : 'no saved progress', disabled: !save, action: () => HC.game.continueGame() },
      { label: 'Options', action: () => S.options(() => S.title()) },
      { label: 'Controls', action: () => S.controls(() => S.title()) },
      { label: 'Credits', action: () => S.credits(() => S.title()) },
    ];
    menu(n, items);
    n.appendChild(el('div', 'foot', 'An original tribute to DOOM (1993) &amp; Project Zomboid<br>All art, sound &amp; music generated in your browser'));
    n.appendChild(el('div', 'vignette'));
  };

  S.skill = function () {
    const n = show(el('div', 'screen title dim'));
    const p = el('div', 'panel'); p.innerHTML = '<h2>Choose your <span>odds</span></h2>';
    n.appendChild(p);
    const go = (i) => HC.game.newGame(i);
    menu(p, [
      { label: 'Weekend Prepper', sub: 'Softer bites, more ammo. For the story.', action: () => go(0) },
      { label: 'Survivor', sub: 'The intended experience.', action: () => go(1) },
      { label: 'Dead Man Walking', sub: 'They hit harder. The fever comes faster.', action: () => go(2) },
    ], { cls: 'skill', back: () => S.title() });
  };

  S.options = function (back) {
    const n = show(el('div', 'screen dim'));
    const p = el('div', 'panel');
    const s = HC.settings;
    p.innerHTML = `<h2>Options</h2>
      <div class="row"><span>Master volume</span><input type="range" min="0" max="1" step="0.05" value="${s.master}" data-k="master"></div>
      <div class="row"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k="music"></div>
      <div class="row"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k="sfx"></div>
      <div class="row"><span>Screen shake</span><button class="btn" data-t="shake">${s.shake ? 'On' : 'Off'}</button></div>
      <div class="row"><span>Blood &amp; gore</span><button class="btn" data-t="gore">${s.gore ? 'Full' : 'Reduced'}</button></div>
      <div class="row"><span>Fullscreen</span><button class="btn" data-fs="1">Toggle</button></div>
      <div class="actions"><button class="btn sel" data-back="1">Back</button></div>`;
    n.appendChild(p);
    p.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { s[r.dataset.k] = +r.value; HC.audio.setVolumes(); HC.saveSettings(); }));
    p.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.t; s[k] = !s[k]; b.textContent = k === 'gore' ? (s[k] ? 'Full' : 'Reduced') : (s[k] ? 'On' : 'Off'); HC.saveSettings(); HC.audio.play('uiSelect'); }));
    p.querySelector('[data-fs]').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
    p.querySelector('[data-back]').addEventListener('click', () => { HC.audio.play('uiSelect'); back(); });
    setKeys((e) => { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); back(); } e.stopPropagation(); });
  };

  S.controls = function (back) {
    const n = show(el('div', 'screen dim'));
    const p = el('div', 'panel');
    const k = [['W A S D', 'Move'], ['Mouse', 'Aim'], ['Left click', 'Attack / fire (hold for automatic)'], ['Right click (hold)', 'Steady aim — slower, far more accurate'], ['Shift', 'Sprint (drains endurance, makes noise)'],
      ['1 2 3 4 · Q', 'Melee / pistol / shotgun / rifle · last weapon'], ['R', 'Reload'], ['E', 'Use: doors, notes, switches, loose panels'], ['F', 'Flashlight'], ['B', 'Apply bandage (stops bleeding)'],
      ['V', 'Inject MX-7 antiviral (cures infection)'], ['G', 'Throw molotov'], ['Tab', 'Automap'], ['Mouse wheel', 'Zoom'], ['Esc', 'Pause']];
    p.innerHTML = '<h2>Controls</h2><div class="keys">' + k.map(([a, b]) => `<div><kbd>${a}</kbd></div><div>${b}</div>`).join('') + `</div>
      <p class="hint" style="margin-top:18px;text-transform:none;letter-spacing:.05em;font-size:14px;line-height:1.6">Gunfire is loud — every dead thing nearby will hear it. Melee is quiet. Zombies can't open doors, but they will break them down. Close doors behind you.</p>
      <div class="actions"><button class="btn sel">Back</button></div>`;
    n.appendChild(p);
    p.querySelector('.btn').addEventListener('click', () => { HC.audio.play('uiSelect'); back(); });
    setKeys((e) => { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); back(); } e.stopPropagation(); });
  };

  S.credits = function (back) {
    const n = show(el('div', 'screen dim'));
    const p = el('div', 'panel');
    p.innerHTML = `<h2>Credits</h2><div class="credits">
      <b>HOLLOW COUNTY</b><br>An original game. A love letter to <i>DOOM</i> (id Software, 1993) and <i>Project Zomboid</i> (The Indie Stone).<br><br>
      <b>EVERYTHING YOU SEE AND HEAR</b><br>Textures, characters, lighting, sound effects and music are generated procedurally in your browser. No assets from either game are used.<br><br>
      <b>BUILT WITH</b><br>Claude Code · HTML5 Canvas · Web Audio<br><br>
      <b>TYPE</b><br>Anton · Oswald · VT323 (SIL OFL) · Special Elite (Apache 2.0)</div>
      <div class="actions"><button class="btn sel">Back</button></div>`;
    n.appendChild(p);
    p.querySelector('.btn').addEventListener('click', () => { HC.audio.play('uiSelect'); back(); });
    setKeys((e) => { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); back(); } e.stopPropagation(); });
  };

  // ------------------------------------------------------------ typewriter story page
  S.story = function (head, text, onDone) {
    const n = show(el('div', 'screen story grain'));
    n.innerHTML = `<div class="head">${esc(head)}</div><div class="page"></div><div class="hint blink" style="margin-top:30px;visibility:hidden">Press any key to continue</div>`;
    const page = n.querySelector('.page'), hint = n.querySelector('.hint');
    let i = 0, done = false, t = 0;
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); done = true; hint.style.visibility = 'visible'; page.innerHTML = esc(text); return; }
      const ch = text[i++];
      t++;
      if (ch !== ' ' && ch !== '\n' && t % 2 === 0) HC.audio.play('type');
      if (ch === '\n' && text[i] === '\n') HC.audio.play('typeBell');
      page.innerHTML = esc(text.slice(0, i)) + '<span class="cur"></span>';
    }, 26);
    const next = () => {
      if (!done) { clearInterval(iv); done = true; page.innerHTML = esc(text); hint.style.visibility = 'visible'; return; }
      clearInterval(iv); onDone();
    };
    n.addEventListener('click', next);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; next(); });
  };

  // ------------------------------------------------------------ level title card
  S.card = function (def, onDone) {
    const n = show(el('div', 'screen card grain'));
    n.innerHTML = `<div class="day">${esc(def.day)} &nbsp;·&nbsp; ${String(Math.floor(def.time / 60)).padStart(2, '0')}:${String(def.time % 60).padStart(2, '0')}</div>
      <div class="name">${esc(def.name)}</div><div class="line"></div><div class="place">${esc(def.place)}</div><div class="map-id">E1M${def.num}</div>`;
    HC.audio.play('stamp');
    let done = false;
    const go = () => { if (done) return; done = true; n.classList.add('out'); setTimeout(() => { S.clear(); onDone(); }, 480); };
    const t = setTimeout(go, 3400);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { clearTimeout(t); go(); } });
    n.addEventListener('click', () => { clearTimeout(t); go(); });
  };

  // ------------------------------------------------------------ note reader
  S.note = function (note, onClose) {
    const n = show(el('div', 'screen note dim'));
    const style = note.style === 'clip' ? 'clip' : note.style === 'type' ? 'type' : '';
    n.innerHTML = `<div class="paper ${style}"><div class="tape"></div><h3>${esc(note.title)}</h3><p>${esc(note.body)}</p>${note.sig ? `<p class="sig">${esc(note.sig)}</p>` : ''}</div>
      <div class="hint close">E / Esc / click to put it down</div>`;
    HC.audio.play('pickup');
    const close = () => { HC.audio.play('uiMove'); S.clear(); onClose(); };
    n.addEventListener('click', close);
    setKeys((e) => { if (['KeyE', 'Escape', 'Enter', 'Space'].includes(e.code)) { e.preventDefault(); close(); } e.stopPropagation(); });
  };

  // ------------------------------------------------------------ pause
  S.pause = function () {
    const n = show(el('div', 'screen dim'));
    const p = el('div', 'panel'); p.innerHTML = '<h2>Paused</h2>';
    n.appendChild(p);
    const back = () => S.pause();
    menu(p, [
      { label: 'Resume', action: () => HC.game.resume() },
      { label: 'Options', action: () => S.options(back) },
      { label: 'Controls', action: () => S.controls(back) },
      { label: 'Restart level', action: () => HC.game.retry() },
      { label: 'Quit to title', action: () => HC.game.quitToTitle() },
    ], { back: () => HC.game.resume() });
  };

  // ------------------------------------------------------------ death
  S.death = function (info, onRetry, onQuit) {
    const n = show(el('div', 'screen death'));
    n.innerHTML = `<h1>This is how you died.</h1><div class="by">${esc(info.by)}</div><div class="time">${esc(info.time)}</div>
      <div class="actions"><button class="btn sel" data-a="r">Try again</button><button class="btn" data-a="q">Quit to title</button></div>`;
    n.querySelector('[data-a=r]').addEventListener('click', () => { HC.audio.play('uiSelect'); onRetry(); });
    n.querySelector('[data-a=q]').addEventListener('click', () => { HC.audio.play('uiSelect'); onQuit(); });
    setKeys((e) => { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') { e.preventDefault(); onRetry(); } else if (e.code === 'Escape') { e.preventDefault(); onQuit(); } e.stopPropagation(); });
  };

  // ------------------------------------------------------------ intermission
  S.intermission = function (st, onNext) {
    const n = show(el('div', 'screen inter grain'));
    const def = st.def;
    n.innerHTML = `<div class="sheet"><div class="paper">
        <h3>${esc(def.day)} · FIELD NOTES</h3><h1>${esc(def.name)}</h1>
        <div class="stat"><span>Kills</span><b data-k="kills">0%</b></div>
        <div class="stat"><span>Items</span><b data-k="items">0%</b></div>
        <div class="stat"><span>Secrets</span><b data-k="secrets">0%</b></div>
        <div class="stat"><span>Time</span><b data-k="time">0:00</b></div>
        <div class="stat"><span>Par</span><b data-k="par">${HC.fmtTime(def.par)}</b></div>
      </div><div class="mapbox"><canvas width="460" height="460"></canvas></div></div>
      <div class="hint foot blink" style="visibility:hidden">Press any key to continue</div>`;
    drawCountyMap(n.querySelector('canvas'), def.num);
    const rows = [['kills', st.kills], ['items', st.items], ['secrets', st.secrets]];
    let i = 0, v = 0, phase = 0, done = false;
    const iv = setInterval(() => {
      if (phase < 3) {
        const [k, target] = rows[phase];
        v = Math.min(target, v + 3);
        n.querySelector(`[data-k=${k}]`).textContent = v + '%';
        if (i++ % 2 === 0) HC.audio.play('type');
        if (v >= target) { phase++; v = 0; HC.audio.play('stamp'); }
      } else if (phase === 3) {
        v = Math.min(st.time, v + Math.max(3, st.time / 40));
        n.querySelector('[data-k=time]').textContent = HC.fmtTime(v);
        if (i++ % 2 === 0) HC.audio.play('type');
        if (v >= st.time) { phase++; HC.audio.play('stamp'); finish(); }
      }
    }, 32);
    const finish = () => {
      clearInterval(iv); done = true;
      rows.forEach(([k, t]) => { n.querySelector(`[data-k=${k}]`).textContent = t + '%'; });
      n.querySelector('[data-k=time]').textContent = HC.fmtTime(st.time);
      n.querySelector('.foot').style.visibility = 'visible';
    };
    const next = () => { if (!done) { finish(); return; } onNext(); };
    n.addEventListener('click', next);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); if (!e.repeat) next(); });
  };

  function drawCountyMap(c, num) {
    const x = c.getContext('2d'), W = c.width, H = c.height, r = HC.rng(9);
    x.fillStyle = '#e6dcc0'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r.pick(['120,90,50', '255,255,240', '90,70,40'])},${r.range(0.02, 0.08)})`; x.fillRect(r() * W, r() * H, 2, 2); }
    const jit = (pts, col, w, dash) => { x.strokeStyle = col; x.lineWidth = w; x.setLineDash(dash || []); x.beginPath(); pts.forEach(([a, b], i) => { const px = a + r.range(-1.5, 1.5), py = b + r.range(-1.5, 1.5); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); x.setLineDash([]); };
    // river
    jit([[0, 70], [80, 60], [160, 84], [240, 70], [320, 96], [400, 80], [460, 92]], '#6f8fa6', 9);
    jit([[0, 70], [80, 60], [160, 84], [240, 70], [320, 96], [400, 80], [460, 92]], '#9ab4c4', 4);
    x.font = 'italic 15px "Special Elite", monospace'; x.fillStyle = '#4a6a80'; x.fillText('Harrow River', 18, 52);
    // roads
    jit([[330, 470], [320, 380], [300, 300], [290, 220], [300, 140], [310, 70], [312, 0]], '#8a7a62', 3);
    jit([[40, 420], [120, 400], [200, 395], [300, 390]], '#8a7a62', 2);
    jit([[200, 290], [140, 250], [110, 190], [150, 130], [220, 110], [300, 130]], '#8a7a62', 2);
    x.font = '12px "Special Elite", monospace'; x.fillStyle = '#6a5a44';
    x.save(); x.translate(338, 330); x.rotate(-1.4); x.fillText('ROUTE 9', 0, 0); x.restore();
    x.fillText('Paper Mill Rd', 80, 386); x.fillText('River Rd', 92, 218);
    // county line
    x.strokeStyle = 'rgba(90,60,40,.4)'; x.setLineDash([2, 6]); x.lineWidth = 1.5; x.strokeRect(20, 20, W - 40, H - 40); x.setLineDash([]);
    x.font = '22px Anton, Impact, sans-serif'; x.fillStyle = 'rgba(70,50,30,.55)'; x.fillText('LORNE COUNTY', W - 180, H - 34);
    const locs = [[90, 410, 'Cedar Fork'], [296, 300, 'St. Agnes'], [140, 170, 'Riverside Mall'], [306, 110, 'Rt 9 Bridge']];
    // travelled path
    const path = [[90, 410], [300, 390], [296, 300], [200, 290], [140, 250], [140, 170], [220, 110], [306, 110]];
    const segs = [2, 5, 7];
    const upto = Math.min(path.length - 1, segs[Math.min(num, 3) - 1] || 0);
    x.strokeStyle = '#9a1a10'; x.lineWidth = 3; x.setLineDash([7, 6]); x.beginPath();
    for (let i = 0; i <= upto; i++) i ? x.lineTo(path[i][0], path[i][1]) : x.moveTo(path[i][0], path[i][1]);
    x.stroke(); x.setLineDash([]);
    locs.forEach(([px, py, name], i) => {
      const reached = i <= num, next = i === num;
      x.fillStyle = reached ? '#8a1208' : 'rgba(80,60,40,.5)';
      x.beginPath(); x.moveTo(px, py - 14); x.bezierCurveTo(px + 9, py - 3, px + 7, py + 6, px, py + 6); x.bezierCurveTo(px - 7, py + 6, px - 9, py - 3, px, py - 14); x.fill();
      x.font = '15px "Special Elite", monospace'; x.fillStyle = '#2b2a26'; x.fillText(name, px + 12, py + 4);
      if (next) { x.font = '13px Anton, Impact, sans-serif'; x.fillStyle = '#9a1a10'; x.fillText('YOU ARE HEADED HERE', px - 60, py + 26); }
    });
  }

  // ------------------------------------------------------------ ending + credit roll
  S.ending = function (kind, stats, onDone) {
    const E = HC.story.ending[kind];
    const n = show(el('div', 'screen ending grain'));
    n.innerHTML = `<div class="big">${esc(E.big)}</div><div class="page"></div><div class="hint blink" style="margin-top:30px;visibility:hidden">Press any key</div>`;
    const page = n.querySelector('.page'), hint = n.querySelector('.hint');
    let i = 0, done = false;
    const text = E.text + '\n\n' + E.tag;
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); done = true; hint.style.visibility = 'visible'; return; }
      i++; if (i % 2 === 0 && text[i] !== ' ') HC.audio.play('type');
      page.textContent = text.slice(0, i);
    }, 34);
    const next = () => { if (!done) { clearInterval(iv); page.textContent = text; done = true; hint.style.visibility = 'visible'; return; } roll(stats, onDone); };
    n.addEventListener('click', next);
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); if (!e.repeat) next(); });
  };
  function roll(stats, onDone) {
    const n = show(el('div', 'screen ending'));
    const box = el('div', 'roll');
    box.innerHTML = `<div class="big" style="font-family:var(--display);font-size:64px;letter-spacing:.1em;color:#efe6cf">HOLLOW COUNTY</div>
      <h4>YOUR RUN</h4>Zombies put down: ${stats.kills}<br>Secrets found: ${stats.secrets}<br>Time in the county: ${HC.fmtTime(stats.time)}<br>Difficulty: ${esc(stats.skill)}
      <h4>A TRIBUTE TO</h4>DOOM — id Software, 1993<br>Project Zomboid — The Indie Stone
      <h4>MADE WITH</h4>Claude Code<br>HTML5 Canvas · Web Audio · no external assets
      <h4>IN MEMORY OF</h4>Ruiz · Dr. Elaine Marsh · Nurse R. Okafor<br>Deb, Frank &amp; the Riverside twelve<br>SSG R. Tully, EOD<br>Biscuit, who is a good dog
      <h4>&nbsp;</h4>This is how you survived.<br><br><br>`;
    n.appendChild(box);
    let y = window.innerHeight, raf;
    const step = () => { y -= 0.9; box.style.top = y + 'px'; if (y < -box.offsetHeight) end(); else raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    let ended = false;
    const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); onDone(); };
    setKeys((e) => { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape' || e.code === 'Enter') end(); });
    n.addEventListener('click', end);
  }

  S.loading = function (text) { show(el('div', 'screen loading', esc(text || 'LOADING…'))); };
  return S;
})();
