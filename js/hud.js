// Hollow County — HUD: Doom-style status bar + pixel face, PZ-style moodles, radio, objectives, prompts, bubbles, crosshair, automap.
'use strict';
HC.hud = (function () {
  const H = { msgs: [], radioQ: [], radioCur: null, hints: [], hintCur: null, objective: '', objT: 0, automap: false, hurtFlash: 0, pickFlash: 0, place: null, placeKey: '', placeT: 99, placePend: null, placePendT: 0 };
  const C = HC.rgb;
  let barTex = null;

  H.reset = function () {
    H.msgs = []; H.radioQ = []; H.hints = []; H.hintCur = null; H.objective = ''; H.objT = 0; H.automap = false; H.hurtFlash = 0; H.pickFlash = 0;
    H.place = null; H.placeKey = ''; H.placeT = 99; H.placePend = null; H.placePendT = 0;
    if (H.radioCur && H.radioCur.snd) H.radioCur.snd.stop(0.2);
    H.radioCur = null;
  };
  H.msg = function (text, kind) {
    H.msgs.push({ text, kind: kind || 'info', t: 0 });
    if (H.msgs.length > 5) H.msgs.shift();
    if (kind === 'pick') H.pickFlash = 0.35;
  };
  H.setObjective = function (text) { if (text !== H.objective) { H.objective = text; H.objT = 0; } };
  H.hint = function (text) { if (!H.hints.includes(text) && (!H.hintCur || H.hintCur.text !== text)) H.hints.push(text); };
  H.radio = function (msg) { H.radioQ.push(msg); };

  // ------------------------------------------------------------ update
  H.update = function (dt, W) {
    for (const m of H.msgs) m.t += dt;
    H.msgs = H.msgs.filter((m) => m.t < 5);
    H.objT += dt;
    H.hurtFlash = Math.max(0, H.hurtFlash - dt * 2.2);
    H.pickFlash = Math.max(0, H.pickFlash - dt * 1.5);
    if (!H.hintCur && H.hints.length) H.hintCur = { text: H.hints.shift(), t: 0 };
    if (H.hintCur) { H.hintCur.t += dt; if (H.hintCur.t > 6) H.hintCur = null; }
    // location line: follow the player's tile; ignore door/wall tiles and debounce brief crossings
    H.placeT += dt;
    const lv = W.lv, pl = W.player;
    if (lv && lv.placeInfo && pl) {
      const tx = Math.floor(pl.x), ty = Math.floor(pl.y);
      if (lv.inb(tx, ty) && !lv.wk[lv.idx(tx, ty)]) {
        const info = lv.placeInfo(pl.x, pl.y), key = info.name + '|' + (info.within || '');
        const commit = () => { H.place = info; H.placeKey = key; H.placeT = 0; H.placePend = null; };
        if (key === H.placeKey) H.placePend = null;
        else if (!H.place) commit();
        else if (H.placePend === key) { H.placePendT += dt; if (H.placePendT > 0.35) commit(); }
        else { H.placePend = key; H.placePendT = 0; }
      }
    }
    // radio typing
    if (!H.radioCur && H.radioQ.length) {
      const m = H.radioQ.shift();
      H.radioCur = { m, line: 0, ch: 0, t: 0, done: 0, snd: HC.audio.loop('static', { vol: 0.07, fade: 0.2 }) };
      if (m.ebs) HC.audio.play('ebs', { dur: 1.6, vol: 0.12 });
      else HC.audio.play('click', { f: 1800, vol: 0.6 });
    }
    const r = H.radioCur;
    if (r) {
      r.t += dt;
      const delay = r.m.ebs ? 1.7 : 0.25;
      if (r.t > delay && r.line < r.m.lines.length) {
        const L = r.m.lines[r.line];
        const before = Math.floor(r.ch);
        r.ch += dt * 42;
        if (Math.floor(r.ch) !== before && Math.random() < 0.3) r.snd.set(0.03 + Math.random() * 0.08);
        if (r.ch >= L.length + 22) { r.line++; r.ch = 0; }
      }
      if (r.line >= r.m.lines.length) {
        r.done += dt;
        if (r.done > 0.2 && r.snd) { r.snd.stop(0.4); r.snd = null; HC.audio.play('click', { f: 1500, vol: 0.5 }); }
        if (r.done > 4) H.radioCur = null;
      }
    }
  };

  // ------------------------------------------------------------ face portrait (pixel art, 32x32)
  const faceCache = {};
  function faceSprite(tier, look, expr, sick) {
    const key = [tier, look, expr, sick].join('|');
    if (faceCache[key]) return faceCache[key];
    const c = HC.canvas(32, 32), x = c.getContext('2d');
    const px = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w || 1, h || 1); };
    const o = look;                         // -1 left, 0 centre, 1 right
    let skin = [200, 150, 110], shadow = [150, 104, 74], hi = [226, 180, 140];
    if (sick) { skin = HC.mix(skin, [160, 176, 120], 0.35 * sick); shadow = HC.mix(shadow, [110, 130, 80], 0.35 * sick); hi = HC.mix(hi, [190, 200, 150], 0.3 * sick); }
    if (expr === 'dead') { skin = [150, 140, 128]; shadow = [104, 96, 88]; hi = [170, 162, 150]; }
    const S = C(skin), SH = C(shadow), HI = C(hi);
    // background plate
    px(0, 0, 32, 32, '#14120f');
    // neck & collar (olive BDU)
    px(11, 26, 10, 3, SH); px(6, 28, 20, 4, '#4e5436'); px(14, 28, 4, 2, '#3a3f28');
    // head shape
    px(9 + o, 6, 14, 20, S); px(8 + o, 9, 16, 14, S); px(10 + o, 25, 12, 2, S);
    px(20 + o, 8, 3, 17, SH); px(9 + o, 22, 14, 3, SH);
    px(10 + o, 8, 4, 6, HI);
    // ears
    px(7 + o, 13, 2, 5, SH); px(23 + o, 13, 2, 5, SH);
    // hair
    px(9 + o, 3, 14, 5, '#2e231a'); px(8 + o, 5, 2, 7, '#2e231a'); px(22 + o, 5, 2, 7, '#2e231a'); px(11 + o, 2, 10, 2, '#3a2c20');
    // brows
    const ey = 13;
    if (expr === 'ouch') { px(10 + o, ey - 2, 5, 1, '#241a12'); px(17 + o, ey - 2, 5, 1, '#241a12'); }
    else if (expr === 'panic') { px(10 + o, ey - 3, 5, 1, '#241a12'); px(17 + o, ey - 3, 5, 1, '#241a12'); }
    else if (expr === 'grin') { px(10 + o, ey - 2, 5, 1, '#241a12'); px(17 + o, ey - 3, 5, 1, '#241a12'); }
    else { px(10 + o, ey - 2, 5, 1, '#241a12'); px(17 + o, ey - 2, 5, 1, '#241a12'); }
    // eyes
    if (expr === 'dead') { [[11, ey], [18, ey]].forEach(([X, Y]) => { px(X + o, Y, 1, 1, '#301010'); px(X + 2 + o, Y + 2, 1, 1, '#301010'); px(X + 1 + o, Y + 1, 1, 1, '#301010'); px(X + 2 + o, Y, 1, 1, '#301010'); px(X + o, Y + 2, 1, 1, '#301010'); }); }
    else if (expr === 'ouch') { px(11 + o, ey + 1, 4, 1, '#241a12'); px(17 + o, ey + 1, 4, 1, '#241a12'); }
    else {
      const wide = expr === 'panic';
      px(11 + o, ey, 4, wide ? 3 : 2, '#e8e2d6'); px(17 + o, ey, 4, wide ? 3 : 2, '#e8e2d6');
      const pp = o + 1;
      px(11 + pp + o, ey, 2, wide ? 1 : 2, '#2a1c14'); px(17 + pp + o, ey, 2, wide ? 1 : 2, '#2a1c14');
      if (sick > 0.4) { px(11 + o, ey + 2, 4, 1, 'rgba(90,60,90,.7)'); px(17 + o, ey + 2, 4, 1, 'rgba(90,60,90,.7)'); }
    }
    // nose
    px(15 + o, ey + 2, 2, 4, SH); px(14 + o, ey + 5, 1, 1, SH);
    // mouth
    const my = 21;
    if (expr === 'grin') { px(12 + o, my - 1, 8, 1, '#5a2a1e'); px(12 + o, my, 8, 2, '#efe8dc'); px(13 + o, my + 2, 6, 1, '#5a2a1e'); }
    else if (expr === 'ouch' || expr === 'panic') { px(14 + o, my - 1, 4, 4, '#3a1410'); px(15 + o, my, 2, 2, '#1a0808'); }
    else if (expr === 'dead') { px(13 + o, my, 6, 1, '#3a1410'); px(15 + o, my + 1, 2, 3, '#7a1410'); }
    else { px(13 + o, my, 6, 1, '#6a3424'); if (tier >= 3) px(12 + o, my + 1, 1, 1, '#6a3424'); }
    // stubble / grime
    x.globalAlpha = 0.25; px(10 + o, 20, 12, 5, '#3a2c20'); x.globalAlpha = 1;
    // damage tiers
    if (tier >= 1) { px(19 + o, 9, 2, 3, 'rgba(120,70,110,.8)'); }
    if (tier >= 2) { px(12 + o, 7, 1, 5, '#8a1810'); px(13 + o, 9, 1, 4, '#8a1810'); px(21 + o, 17, 2, 3, 'rgba(120,70,110,.8)'); }
    if (tier >= 3) { px(18 + o, 4, 2, 9, '#a01c12'); px(19 + o, 13, 1, 6, '#8a1810'); px(9 + o, 18, 3, 2, '#8a1810'); px(11 + o, 12, 4, 1, 'rgba(120,40,40,.8)'); }
    if (tier >= 4) { px(9 + o, 6, 14, 2, '#7a1008'); px(10 + o, 8, 2, 12, '#9a1810'); px(22 + o, 9, 1, 10, '#9a1810'); px(14 + o, 23, 4, 3, '#7a1008'); }
    if (sick > 0.55) { px(22 + o, 10, 1, 2, 'rgba(200,230,255,.9)'); px(9 + o, 12, 1, 2, 'rgba(200,230,255,.9)'); }
    faceCache[key] = c;
    return c;
  }

  // ------------------------------------------------------------ status bar
  function bar(ctx, W, s, Wd, Ht) {
    const p = W.player;
    const bh = Math.round(84 * s), y0 = Ht - bh;
    if (!barTex) {
      barTex = HC.canvas(256, 128);
      const b = barTex.getContext('2d');
      b.fillStyle = '#2b2925'; b.fillRect(0, 0, 256, 128);
      const id = b.getImageData(0, 0, 256, 128);
      for (let i = 0; i < id.data.length; i += 4) { const n = (HC.fbm((i / 4) % 256 / 18, ((i / 4) / 256) / 18, 256 / 18, 3, 3) - 0.5) * 40 + (Math.random() - 0.5) * 14; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n * 0.9; }
      b.putImageData(id, 0, 0);
    }
    ctx.save();
    ctx.fillStyle = ctx.createPattern(barTex, 'repeat');
    ctx.fillRect(0, y0, Wd, bh);
    const g = ctx.createLinearGradient(0, y0, 0, Ht);
    g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(0.06, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, Wd, bh);
    ctx.fillStyle = '#0c0b0a'; ctx.fillRect(0, y0, Wd, Math.max(2, 3 * s));
    ctx.fillStyle = '#5a5246'; ctx.fillRect(0, y0 + 3 * s, Wd, 1);
    // layout
    const total = 1060 * s, x0 = Math.max(8 * s, (Wd - total) / 2);
    const secs = [['ammo', 140], ['health', 150], ['arms', 120], ['face', 92], ['armor', 150], ['keys', 64], ['inv', 344]];
    let x = x0;
    const top = y0 + 8 * s, h = bh - 14 * s;
    const inset = (X, w) => {
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(X + 3 * s, top, w - 6 * s, h);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(X + 3 * s + 0.5, top + 0.5, w - 6 * s - 1, h - 1);
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(X + 3 * s, top + h + 0.5); ctx.lineTo(X + w - 3 * s, top + h + 0.5); ctx.stroke();
      ctx.fillStyle = '#6d6556'; [[X + 1, y0 + 8 * s], [X + 1, Ht - 8 * s]].forEach(([rx, ry]) => { ctx.beginPath(); ctx.arc(rx, ry, 2 * s, 0, 7); ctx.fill(); });
    };
    const bigNum = (txt, cx, cy, size, col) => {
      ctx.font = `${Math.round(size)}px Anton, Impact, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(txt, cx + 2 * s, cy + 2 * s);
      const gg = ctx.createLinearGradient(0, cy - size * 0.8, 0, cy);
      const c = col || [255, 70, 40];
      gg.addColorStop(0, C(HC.shade(c, 1.15))); gg.addColorStop(1, C(HC.shade(c, 0.55)));
      ctx.fillStyle = gg; ctx.fillText(txt, cx, cy);
    };
    const label = (txt, cx, cy) => {
      ctx.font = `600 ${Math.round(10.5 * s)}px Oswald, 'Arial Narrow', sans-serif`;
      ctx.textAlign = 'center'; ctx.fillStyle = '#a2967c';
      ctx.fillText(txt.split('').join(String.fromCharCode(8202)), cx, cy);
    };
    const w = p.weapon;
    for (const [id, wd] of secs) {
      const ww = wd * s, cx = x + ww / 2;
      inset(x, ww);
      if (id === 'ammo') {
        if (w.melee) {
          const dur = w.dur ? Math.round(100 * p.dur[p.cur] / w.dur) : null;
          bigNum(dur !== null ? String(dur) : '—', cx, top + h * 0.66, 44 * s, [230, 190, 90]);
          label(dur !== null ? 'CONDITION %' : 'FISTS', cx, top + h - 5 * s);
        } else {
          const n = p.mags[p.cur];
          bigNum(String(n), cx - 14 * s, top + h * 0.66, 44 * s, n === 0 ? [140, 70, 60] : undefined);
          ctx.font = `${Math.round(17 * s)}px Anton, Impact, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = '#b0a288';
          ctx.fillText('/' + p.ammo[w.ammo], cx + 12 * s, top + h * 0.64);
          label(p.reloadT >= 0 ? 'RELOADING' : 'AMMO', cx, top + h - 5 * s);
          if (p.reloadT >= 0) { ctx.fillStyle = '#d8b44a'; ctx.fillRect(x + 10 * s, top + h - 3 * s, (ww - 20 * s) * (p.reloadT / w.reload), 2 * s); }
        }
      } else if (id === 'health') {
        const hp = Math.max(0, Math.ceil(p.hp));
        bigNum(hp + '%', cx, top + h * 0.66, 44 * s, hp < 25 && Math.sin(W.time * 8) > 0 ? [255, 140, 110] : undefined);
        label('HEALTH', cx, top + h - 5 * s);
      } else if (id === 'arms') {
        const slots = [[2, 'pistol'], [3, 'shotgun'], [4, 'rifle'], [1, 'melee']];
        ctx.font = `${Math.round(20 * s)}px Anton, Impact, sans-serif`; ctx.textAlign = 'center';
        slots.forEach(([n, k], j) => {
          const gx = x + ww * (0.28 + (j % 2) * 0.44), gy = top + h * (0.36 + Math.floor(j / 2) * 0.34);
          const own = k === 'melee' ? true : !!p.weapons[k];
          const cur = k === 'melee' ? w.melee : p.cur === k;
          ctx.fillStyle = cur ? '#ffe28a' : own ? '#d8b44a' : '#4e4a42';
          ctx.fillText(String(n), gx, gy + 7 * s);
          if (cur) { ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1; ctx.strokeRect(gx - 9 * s, gy - 12 * s, 18 * s, 23 * s); }
        });
        label('ARMS', cx, top + h - 5 * s);
      } else if (id === 'face') {
        const tier = p.hp > 80 ? 0 : p.hp > 60 ? 1 : p.hp > 40 ? 2 : p.hp > 20 ? 3 : 4;
        let expr = 'normal';
        if (p.dead) expr = 'dead'; else if (p.hurtT > 0) expr = 'ouch'; else if (p.grinT > 0) expr = 'grin'; else if (p.panic > 0.6) expr = 'panic';
        const sick = p.infection === null ? 0 : Math.round(p.infection * 4) / 4;
        const f = faceSprite(tier, p.dead ? 0 : p.look, expr, sick);
        const fs = Math.min(ww - 12 * s, h - 4 * s);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(f, cx - fs / 2, top + (h - fs) / 2, fs, fs);
        ctx.imageSmoothingEnabled = true;
      } else if (id === 'armor') {
        bigNum(Math.ceil(p.armor) + '%', cx, top + h * 0.66, 44 * s, [150, 170, 120]);
        label('ARMOR', cx, top + h - 5 * s);
      } else if (id === 'keys') {
        [['red', '#d23a2a'], ['blue', '#3a6ad2'], ['yellow', '#e2b632']].forEach(([k, col], j) => {
          const ky = top + 6 * s + j * (h - 10 * s) / 3;
          const kw = ww - 26 * s, khh = (h - 16 * s) / 3 - 3 * s;
          if (p.keys[k]) { ctx.fillStyle = col; ctx.fillRect(x + 13 * s, ky, kw, khh); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 16 * s, ky + khh * 0.3, kw * 0.35, 2 * s); }
          else { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.strokeRect(x + 13 * s + 0.5, ky + 0.5, kw - 1, khh - 1); }
        });
      } else if (id === 'inv') {
        ctx.font = `600 ${Math.round(12.5 * s)}px Oswald, 'Arial Narrow', sans-serif`;
        const rows = [['9MM', 'ammo9'], ['SHELLS', 'shells'], ['5.56', 'ammo556']];
        rows.forEach(([nm, k], j) => {
          const ry = top + 15 * s + j * 16 * s;
          const active = !w.melee && w.ammo === k;
          ctx.textAlign = 'left'; ctx.fillStyle = active ? '#ffe28a' : '#b3a68a'; ctx.fillText(nm, x + 12 * s, ry);
          ctx.textAlign = 'right'; ctx.fillText(`${p.ammo[k]} / ${HC.AMMO_MAX[k]}`, x + 150 * s, ry);
        });
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 160 * s, top + 4 * s, 1, h - 8 * s);
        const items = [['B', 'BANDAGE', 'bandage', '#e8e2d0'], ['V', 'MX-7', 'antiviral', '#5ab8f0'], ['G', 'MOLOTOV', 'molotov', '#e8843a']];
        items.forEach(([key, nm, k, col], j) => {
          const ry = top + 15 * s + j * 16 * s, ix = x + 170 * s;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#1a1816'; ctx.fillRect(ix, ry - 11 * s, 14 * s, 13 * s);
          ctx.fillStyle = '#9d927a'; ctx.font = `${Math.round(12 * s)}px VT323, monospace`; ctx.fillText(key, ix + 3.5 * s, ry);
          ctx.font = `600 ${Math.round(12.5 * s)}px Oswald, 'Arial Narrow', sans-serif`;
          ctx.fillStyle = p.inv[k] ? col : '#5a544a'; ctx.fillText(nm, ix + 20 * s, ry);
          ctx.textAlign = 'right'; ctx.fillText('×' + p.inv[k], x + 330 * s, ry);
        });
        ctx.textAlign = 'center'; ctx.fillStyle = '#6d6556'; ctx.font = `${Math.round(10 * s)}px Oswald, sans-serif`;
        ctx.fillText(w.name.toUpperCase() + (p.flashlight ? '  ·  FLASHLIGHT ON' : ''), x + ww / 2, top + h - 3 * s);
      }
      x += ww;
    }
    ctx.restore();
    return y0;
  }

  // ------------------------------------------------------------ moodles
  const MOODLE_BG = { 1: '#5f9a4a', 2: '#c8b04a', 3: '#d57e2e', 4: '#b8322a' };
  function moodleIcon(ctx, id, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'bleed') { ctx.fillStyle = '#6a0c08'; ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.bezierCurveTo(r * 0.5, 0, r * 0.45, r * 0.5, 0, r * 0.5); ctx.bezierCurveTo(-r * 0.45, r * 0.5, -r * 0.5, 0, 0, -r * 0.55); ctx.fill(); }
    else if (id === 'pain') { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.55); ctx.lineTo(r * 0.15, -r * 0.05); ctx.lineTo(-r * 0.12, r * 0.05); ctx.lineTo(r * 0.2, r * 0.55); ctx.stroke(); }
    else if (id === 'panic') { ctx.fillStyle = '#7a0e0a'; ctx.beginPath(); ctx.moveTo(0, r * 0.45); ctx.bezierCurveTo(-r * 0.7, -r * 0.05, -r * 0.35, -r * 0.6, 0, -r * 0.22); ctx.bezierCurveTo(r * 0.35, -r * 0.6, r * 0.7, -r * 0.05, 0, r * 0.45); ctx.fill(); ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.1); ctx.lineTo(-r * 0.6, -r * 0.1); ctx.moveTo(r * 0.6, -r * 0.1); ctx.lineTo(r * 0.75, -r * 0.1); ctx.stroke(); }
    else if (id === 'tired') { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.3 + i * r * 0.3); ctx.quadraticCurveTo(0, -r * 0.45 + i * r * 0.3, r * 0.5 - i * r * 0.12, -r * 0.3 + i * r * 0.3); ctx.stroke(); } }
    else if (id === 'sick') { ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.stroke(); ctx.fillRect(-r * 0.22, -r * 0.12, r * 0.12, r * 0.12); ctx.fillRect(r * 0.1, -r * 0.12, r * 0.12, r * 0.12); ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.22); ctx.quadraticCurveTo(-r * 0.07, r * 0.1, 0, r * 0.22); ctx.quadraticCurveTo(r * 0.07, r * 0.34, r * 0.2, r * 0.22); ctx.stroke(); }
    else if (id === 'happy') { ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.restore();
  }
  function moodles(ctx, W, s, Wd, yBottom) {
    const p = W.player, list = p.moodles();
    const size = 42 * s, gap = 6 * s;
    let y = yBottom - size - 14 * s;
    const mx = HC.input.mouse.x, my = HC.input.mouse.y;
    for (const m of list) {
      const x = Wd - size - 14 * s;
      m.seenT = (H._mt && H._mt[m.id]) || 0;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6 * s;
      ctx.fillStyle = m.good ? MOODLE_BG[1] : MOODLE_BG[m.lvl];
      rr(ctx, x, y, size, size, 8 * s); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2 * s; rr(ctx, x, y, size, size, 8 * s); ctx.stroke();
      const gg = ctx.createLinearGradient(0, y, 0, y + size); gg.addColorStop(0, 'rgba(255,255,255,.28)'); gg.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; rr(ctx, x, y, size, size, 8 * s); ctx.fill();
      moodleIcon(ctx, m.id, x + size / 2, y + size / 2, size / 2);
      const hover = mx > x && mx < x + size && my > y && my < y + size;
      if (hover || (W.time - (H.mTimes[m.id + m.lvl] || -99)) < 3) {
        ctx.font = `600 ${Math.round(13 * s)}px Oswald, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,.6)'; const tw = ctx.measureText(m.name).width;
        rr(ctx, x - tw - 20 * s, y + size / 2 - 11 * s, tw + 14 * s, 22 * s, 4 * s); ctx.fill();
        ctx.fillStyle = '#f0e8d4'; ctx.fillText(m.name, x - 13 * s, y + size / 2 + 1);
      }
      ctx.restore();
      if (!H.mSeen[m.id + m.lvl]) { H.mSeen[m.id + m.lvl] = 1; H.mTimes[m.id + m.lvl] = W.time; }
      y -= size + gap;
    }
    // forget moodles that went away so they re-announce later
    for (const k in H.mSeen) if (!list.some((m) => m.id + m.lvl === k)) delete H.mSeen[k];
  }
  H.mSeen = {}; H.mTimes = {};
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  H.rr = rr;

  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  }

  // ------------------------------------------------------------ main HUD draw
  H.draw = function (ctx, W) {
    const { w: Wd, h: Ht, dpr } = HC.render.size();
    const s = HC.clamp(Math.min(Wd / 1280, Ht / 760), 0.62, 1.35);
    const p = W.player;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // ---- screen effects
    if (H.hurtFlash > 0) { ctx.fillStyle = `rgba(150,0,0,${H.hurtFlash * 0.35})`; ctx.fillRect(0, 0, Wd, Ht); }
    if (H.pickFlash > 0) { ctx.fillStyle = `rgba(255,220,140,${H.pickFlash * 0.12})`; ctx.fillRect(0, 0, Wd, Ht); }
    const vig = (col, a, inner) => { const g = ctx.createRadialGradient(Wd / 2, Ht / 2, Math.min(Wd, Ht) * inner, Wd / 2, Ht / 2, Math.max(Wd, Ht) * 0.75); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Ht); };
    vig('0,0,0', 0.55, 0.35);
    if (p.hp < 35 && !p.dead) vig('120,0,0', (0.25 + Math.sin(W.time * 5) * 0.12) * (1 - p.hp / 35), 0.25);
    if (p.infection !== null && p.infection > 0.25) vig('60,90,30', Math.min(0.45, p.infection * 0.5), 0.3);
    if (p.panic > 0.5) vig('0,0,0', (p.panic - 0.5) * 0.8, 0.2);
    // ---- speech bubble
    if (p.sayText && p.sayT > 0) {
      const [bx, by] = HC.render.worldToScreen(p.x, p.y, 1.95);
      ctx.font = `${Math.round(14 * s)}px 'Special Elite', 'Courier New', monospace`;
      const lines = wrap(ctx, p.sayText, 260 * s);
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18 * s, th = lines.length * 18 * s + 10 * s;
      const a = HC.clamp(p.sayT * 2, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(245,240,226,.94)'; rr(ctx, bx - tw / 2, by - th - 10 * s, tw, th, 6 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 6 * s, by - 10.5 * s); ctx.lineTo(bx + 4 * s, by - 10.5 * s); ctx.lineTo(bx - 2 * s, by - 2 * s); ctx.fill();
      ctx.fillStyle = '#2b2620'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, bx, by - th - 10 * s + 6 * s + i * 18 * s));
      ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
    }
    // ---- status bar & moodles
    const yBar = bar(ctx, W, s, Wd, Ht);
    moodles(ctx, W, s, Wd, yBar);
    // ---- messages (top-left)
    ctx.textAlign = 'left'; ctx.font = `${Math.round(15 * s)}px Oswald, 'Arial Narrow', sans-serif`;
    H.msgs.forEach((m, i) => {
      const a = HC.clamp(5 - m.t, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`; ctx.fillText(m.text, 19 * s, 31 * s + i * 21 * s);
      const col = m.kind === 'bad' ? '255,110,90' : m.kind === 'warn' ? '240,200,110' : m.kind === 'good' ? '150,220,140' : m.kind === 'pick' ? '240,232,210' : '210,202,184';
      ctx.fillStyle = `rgba(${col},${a})`; ctx.fillText(m.text, 18 * s, 30 * s + i * 21 * s);
    });
    // ---- clock & objective (top-right)
    const mins = Math.floor(W.clock) % 1440, day = W.lv.def.day || '';
    const clk = `${day}  ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    ctx.textAlign = 'right'; ctx.font = `${Math.round(22 * s)}px VT323, monospace`;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(clk, Wd - 17 * s, 33 * s);
    ctx.fillStyle = '#e2d8bd'; ctx.fillText(clk, Wd - 18 * s, 32 * s);
    let objBottom = 32 * s;
    if (H.objective) {
      ctx.font = `600 ${Math.round(11 * s)}px Oswald, sans-serif`; ctx.fillStyle = H.objT < 3 && Math.sin(H.objT * 10) > 0 ? '#ffe28a' : '#c7a45a';
      ctx.fillText('OBJECTIVE', Wd - 18 * s, 54 * s);
      ctx.font = `${Math.round(14.5 * s)}px Oswald, 'Arial Narrow', sans-serif`;
      const ls = wrap(ctx, H.objective, 330 * s);
      ls.forEach((l, i) => { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(l, Wd - 17 * s, 73 * s + i * 19 * s); ctx.fillStyle = '#ece4cf'; ctx.fillText(l, Wd - 18 * s, 72 * s + i * 19 * s); });
      objBottom = 72 * s + (ls.length - 1) * 19 * s;
    }
    // ---- location line (under the objective): fades in bright when the place changes, then settles dim
    if (H.place && !p.dead) {
      const t = H.placeT;
      const a = t < 0.45 ? t / 0.45 : t < 3.5 ? 1 : Math.max(0.5, 1 - (t - 3.5) * 0.4);
      const yL = objBottom + 24 * s, xR = Wd - 18 * s;
      ctx.font = `600 ${Math.round(11.5 * s)}px Oswald, 'Arial Narrow', sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${(1.2 * s).toFixed(1)}px`;
      const nm = H.place.name.toUpperCase(), wi = H.place.within ? '  ·  ' + H.place.within.toUpperCase() : '';
      const ww = wi ? ctx.measureText(wi).width : 0, nw = ctx.measureText(nm).width;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(nm + wi, xR + 1, yL + 1);
      if (wi) { ctx.fillStyle = '#9a907a'; ctx.fillText(wi, xR, yL); }
      ctx.fillStyle = t < 3.5 ? '#f2e8cc' : '#d8ceb2'; ctx.fillText(nm, xR - ww, yL);
      // thin rule that draws out under a fresh name
      const rl = (nw + ww) * HC.clamp(t / 0.6, 0, 1);
      ctx.fillStyle = `rgba(199,164,90,${0.6 * (t < 3.5 ? 1 : 0.5)})`; ctx.fillRect(xR - rl, yL + 5 * s, rl, Math.max(1, s));
      ctx.globalAlpha = 1;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    // ---- radio (top-centre)
    const r = H.radioCur;
    if (r) {
      const bw = Math.min(560 * s, Wd - 40 * s), bx = (Wd - bw) / 2, by = 16 * s;
      const shown = [];
      for (let i = 0; i <= Math.min(r.line, r.m.lines.length - 1); i++) {
        const L = r.m.lines[i];
        shown.push(i < r.line ? L : L.slice(0, Math.floor(r.ch)));
      }
      ctx.font = `${Math.round(15 * s)}px 'Special Elite', 'Courier New', monospace`;
      const wrapped = []; shown.forEach((l) => wrap(ctx, l, bw - 30 * s).forEach((q) => wrapped.push(q)));
      const vis = wrapped.slice(-4);
      const bh = 36 * s + vis.length * 20 * s;
      const a = r.done > 3 ? HC.clamp(4 - r.done, 0, 1) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,10,9,.82)'; rr(ctx, bx, by, bw, bh, 5 * s); ctx.fill();
      ctx.strokeStyle = r.m.ebs ? 'rgba(200,40,30,.8)' : 'rgba(200,170,100,.45)'; ctx.lineWidth = 1; rr(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, 5 * s); ctx.stroke();
      ctx.font = `${Math.round(18 * s)}px VT323, monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = r.m.ebs ? '#ff5a3a' : '#e6b24a';
      ctx.fillText((r.m.ebs ? '◉ ' : '▲ ') + r.m.from, bx + 14 * s, by + 22 * s);
      // static meter
      for (let i = 0; i < 18; i++) { const hgt = (r.snd ? Math.random() : 0.1) * 12 * s; ctx.fillStyle = 'rgba(230,180,80,.5)'; ctx.fillRect(bx + bw - 16 * s - i * 5 * s, by + 22 * s - hgt, 3 * s, hgt); }
      ctx.font = `${Math.round(15 * s)}px 'Special Elite', 'Courier New', monospace`; ctx.fillStyle = '#e9e1cc';
      vis.forEach((l, i) => ctx.fillText(l, bx + 15 * s, by + 46 * s + i * 20 * s));
      ctx.globalAlpha = 1;
    }
    // ---- boss bar / holdout timer
    let topY = r ? 120 * s : 20 * s;
    const boss = W.mobs.find((m) => m.boss && !m.dead && !m.dying && m.state === 'chase');
    if (boss) {
      const bw = 420 * s, bx = (Wd - bw) / 2;
      ctx.font = `${Math.round(15 * s)}px Anton, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc0';
      ctx.fillText('SSG R. TULLY — EOD', Wd / 2, topY + 14 * s);
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx, topY + 20 * s, bw, 10 * s);
      ctx.fillStyle = '#b8261c'; ctx.fillRect(bx + 2, topY + 22 * s, (bw - 4) * Math.max(0, boss.hp / boss.maxHp), 6 * s);
      topY += 40 * s;
    }
    if (W.holdout > 0) {
      ctx.font = `${Math.round(30 * s)}px Anton, Impact, sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText('DUSTOFF ETA ' + HC.fmtTime(W.holdout), Wd / 2 + 2, topY + 30 * s + 2);
      ctx.fillStyle = '#ffd36a'; ctx.fillText('DUSTOFF ETA ' + HC.fmtTime(W.holdout), Wd / 2, topY + 30 * s);
    }
    // ---- hint & prompt (above bar)
    let py = yBar - 18 * s;
    if (W.prompt && !p.dead) {
      ctx.font = `${Math.round(15 * s)}px Oswald, sans-serif`; ctx.textAlign = 'center';
      const tw = ctx.measureText(W.prompt).width + 50 * s;
      ctx.fillStyle = 'rgba(8,8,7,.75)'; rr(ctx, Wd / 2 - tw / 2, py - 26 * s, tw, 30 * s, 5 * s); ctx.fill();
      ctx.fillStyle = '#ffe28a'; ctx.font = `${Math.round(18 * s)}px VT323, monospace`; ctx.fillText('[E]', Wd / 2 - tw / 2 + 20 * s, py - 6 * s);
      ctx.fillStyle = '#eee4cc'; ctx.font = `${Math.round(15 * s)}px Oswald, sans-serif`; ctx.fillText(W.prompt, Wd / 2 + 12 * s, py - 6 * s);
      py -= 40 * s;
    }
    if (p.useT >= 0) {
      const bw = 180 * s;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(Wd / 2 - bw / 2, py - 14 * s, bw, 10 * s);
      ctx.fillStyle = p.useKind === 'bandage' ? '#e8e2d0' : '#5ab8f0'; ctx.fillRect(Wd / 2 - bw / 2 + 2, py - 12 * s, (bw - 4) * (p.useT / 1.4), 6 * s);
      ctx.font = `${Math.round(13 * s)}px Oswald, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ddd';
      ctx.fillText(p.useKind === 'bandage' ? 'Applying bandage…' : 'Injecting MX-7…', Wd / 2, py - 20 * s);
      py -= 40 * s;
    }
    if (H.hintCur) {
      const a = HC.clamp(Math.min(H.hintCur.t * 3, 6 - H.hintCur.t), 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(15 * s)}px Oswald, sans-serif`; ctx.textAlign = 'center';
      const lines = wrap(ctx, H.hintCur.text, 560 * s);
      const bh = lines.length * 20 * s + 14 * s, bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 34 * s;
      ctx.fillStyle = 'rgba(20,24,30,.82)'; rr(ctx, Wd / 2 - bw / 2, py - bh, bw, bh, 6 * s); ctx.fill();
      ctx.fillStyle = '#7fb4e8'; ctx.fillRect(Wd / 2 - bw / 2, py - bh, 3 * s, bh);
      ctx.fillStyle = '#dfe6ee'; lines.forEach((l, i) => ctx.fillText(l, Wd / 2, py - bh + 22 * s + i * 20 * s));
      ctx.globalAlpha = 1;
    }
    // ---- automap
    if (H.automap) automap(ctx, W, s, Wd, yBar);
    // ---- crosshair
    if (!p.dead) crosshair(ctx, W, s);
  };

  function crosshair(ctx, W, s) {
    const p = W.player, w = p.weapon, I = HC.input;
    const x = I.mouse.x, y = I.mouse.y;
    ctx.save();
    ctx.lineWidth = 1.5;
    if (w.melee) {
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,210,.9)'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
    } else {
      const mw = HC.game.mouseWorld();
      const d = Math.max(1, HC.dist(p.x, p.y, mw.x, mw.y));
      let spread = w.spread * (1 + p.moveAmt * 0.8 + p.panic * 1.1) * (p.aiming ? 0.4 : 1);
      const rpx = HC.clamp(Math.tan(spread) * d * 42 * HC.render.cam.zoom, 5, 140);
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, rpx, 0, 7); ctx.stroke();
      ctx.strokeStyle = HC.game.aimTarget ? 'rgba(255,90,70,.95)' : p.aiming ? 'rgba(255,226,138,.95)' : 'rgba(255,245,230,.8)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(x, y, rpx, 0, 7); ctx.stroke();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(x + a * (rpx + 3), y + b * (rpx + 3)); ctx.lineTo(x + a * (rpx + 9), y + b * (rpx + 9)); ctx.stroke(); });
      if (p.reloadT >= 0) { ctx.strokeStyle = '#d8b44a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, rpx + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.reloadT / w.reload)); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
  }

  function automap(ctx, W, s, Wd, yBar) {
    const lv = W.lv, p = W.player;
    ctx.fillStyle = 'rgba(4,6,4,.93)'; ctx.fillRect(0, 0, Wd, yBar);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Wd, yBar); ctx.clip();   // keep map lines off the status bar
    const k = 13 * s;
    const P = (x, y) => [Wd / 2 + ((x - y) - (p.x - p.y)) * k, yBar / 2 + ((x + y) - (p.x + p.y)) * k * 0.5];
    ctx.lineWidth = Math.max(1.5, 2.6 * s); ctx.lineCap = 'round';
    // locked doors whose colour the objective names ("(blue door)") get a pulsing ring
    const objTxt = H.objective.toLowerCase();
    const objCols = ['red', 'blue', 'yellow'].filter((c) => new RegExp(`\\b${c}\\b`).test(objTxt));
    const ringDoors = [];
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const i = lv.idx(x, y);
      if (!lv.seen[i]) continue;
      if (!lv.wk[i] && !lv.voidT[i] && lv.room[i] >= 0) { const a = P(x, y), b = P(x + 1, y), c = P(x + 1, y + 1), d = P(x, y + 1); ctx.fillStyle = 'rgba(80,110,70,.12)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill(); }
      if (!lv.wk[i]) continue;
      const d = lv.doors.get(i), w = lv.windows.get(i), sw = lv.secretWalls.get(i);
      if (sw && sw.open) continue;
      let col = '#b8322a';
      if (d) col = d.lock ? { red: '#ff4a3a', blue: '#4a7aff', yellow: '#ffd23a' }[d.lock] : '#d8c04a';
      if (d && d.lock && objCols.includes(d.lock)) ringDoors.push(d);
      else if (w) col = '#5aa0c0';
      else if (lv.wk[i] >= HC.level.WK.fence) col = '#7a6a4a';
      ctx.strokeStyle = col;
      const c = P(x + 0.5, y + 0.5), m = lv.conn[i];
      ctx.beginPath();
      if (m & 1) { const e = P(x + 0.5, y); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); }
      if (m & 2) { const e = P(x + 1, y + 0.5); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); }
      if (m & 4) { const e = P(x + 0.5, y + 1); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); }
      if (m & 8) { const e = P(x, y + 0.5); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); }
      if (!m) { ctx.moveTo(c[0] - 1, c[1]); ctx.lineTo(c[0] + 1, c[1]); }
      ctx.stroke();
    }
    ringDoors.forEach((d) => {
      const c = P(d.x + 0.5, d.y + 0.5), ph = (W.time * 2.2) % 1;
      ctx.strokeStyle = LOCK_COL[d.lock]; ctx.lineWidth = Math.max(1, 1.6 * s);
      ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(c[0], c[1], k * (0.7 + ph * 1.1), k * (0.35 + ph * 0.55), 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    });
    mapLabels(ctx, W, s, Wd, yBar, k, P);
    // player arrow
    const c = P(p.x, p.y), f = [Math.cos(p.face), Math.sin(p.face)];
    const tip = P(p.x + f[0] * 1.2, p.y + f[1] * 1.2), l = P(p.x - f[0] * 0.6 + f[1] * 0.5, p.y - f[1] * 0.6 - f[0] * 0.5), r = P(p.x - f[0] * 0.6 - f[1] * 0.5, p.y - f[1] * 0.6 + f[0] * 0.5);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(l[0], l[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(r[0], r[1]); ctx.fill();
    ctx.restore();
    const band = ctx.createLinearGradient(0, yBar - 70 * s, 0, yBar);
    band.addColorStop(0, 'rgba(4,6,4,0)'); band.addColorStop(0.35, 'rgba(4,6,4,.9)'); band.addColorStop(1, 'rgba(4,6,4,.95)');
    ctx.fillStyle = band; ctx.fillRect(0, yBar - 70 * s, Wd, 70 * s);
    ctx.font = `${Math.round(20 * s)}px VT323, monospace`; ctx.textAlign = 'left'; ctx.fillStyle = '#b8322a';
    ctx.fillText(`${W.lv.def.num ? 'E1M' + W.lv.def.num + ': ' : ''}${W.lv.def.name.toUpperCase()}`, 20 * s, yBar - 20 * s);
    ctx.textAlign = 'right'; ctx.fillText('TAB — CLOSE MAP', Wd - 20 * s, yBar - 20 * s);
    // legend: this level's key doors (✓ once you hold the key), plain doors, windows
    const leg = Object.entries(W.def.keys || {}).map(([c, nm]) => [LOCK_COL[c], nm.toUpperCase() + (p.keys[c] ? ' ✓' : '')]).concat([['#d8c04a', 'DOOR'], ['#5aa0c0', 'WINDOW']]);
    ctx.font = `${Math.round(17 * s)}px VT323, monospace`; ctx.textAlign = 'left';
    let lx = 20 * s; const ly = yBar - 44 * s;
    ctx.lineWidth = Math.max(1.5, 2.6 * s);
    for (const [col, txt] of leg) {
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(lx, ly - 5 * s); ctx.lineTo(lx + 14 * s, ly - 5 * s); ctx.stroke();
      ctx.fillStyle = '#9d927a'; ctx.fillText(txt, lx + 20 * s, ly);
      lx += 20 * s + ctx.measureText(txt).width + 18 * s;
    }
  }

  // place names on the automap: rooms (cream), outdoor areas (green), buildings (amber, above their top corner).
  // Only what the player has seen; hidden stashes only once found. Places the objective names pulse yellow,
  // the player's current place is brightest. Overlapping labels are nudged, then dropped (lowest priority first).
  const LOCK_COL = { red: '#ff4a3a', blue: '#4a7aff', yellow: '#ffd23a' };
  function mapLabels(ctx, W, s, Wd, yBar, k, P) {
    const lv = W.lv, p = W.player;
    if (!lv.labels) return;
    if (H._objFor !== H.objective || H._objLv !== lv) { H._objFor = H.objective; H._objLv = lv; H._objHit = lv.matchText(H.objective); }
    const hit = H._objHit;
    const pi = lv.inb(p.x | 0, p.y | 0) ? lv.idx(p.x | 0, p.y | 0) : -1;
    const here = pi >= 0 ? lv.placeAt[pi] : -1, hereB = pi >= 0 ? lv.bld[pi] : -1;
    const items = [];
    lv.labels.forEach((lab, i) => {
      if (lab.secret >= 0 && !lv.secretFound[lab.secret]) return;
      if (!lab.seen) { for (const j of lab.own) if (lv.seen[j]) { lab.seen = true; break; } }
      if (!lab.seen) return;
      items.push({ text: lab.name, x: lab.x, y: lab.y, kind: lab.kind === 'area' ? 'area' : 'room', obj: hit.labels.has(i), here: i === here });
    });
    lv.buildings.forEach((b) => {
      if (!b.name) return;
      if (!b.nameSeen) { for (const j of b.tiles) if (lv.seen[j]) { b.nameSeen = true; break; } }
      if (!b.nameSeen) return;
      if (!b.top) { let x0 = 1e9, y0 = 1e9; for (const j of b.tiles) { x0 = Math.min(x0, j % lv.W); y0 = Math.min(y0, (j / lv.W) | 0); } b.top = [x0, y0]; }
      items.push({ text: b.name, x: b.top[0], y: b.top[1], kind: 'bld', obj: hit.buildings.has(b.id), here: b.id === hereB });
    });
    const rank = { room: 0, bld: 1, area: 2 };
    items.sort((a, b) => (a.obj ? 0 : 10) + (a.here ? 0 : 5) + rank[a.kind] - ((b.obj ? 0 : 10) + (b.here ? 0 : 5) + rank[b.kind]));
    const px = { room: Math.round(Math.max(9, k * 0.84)), bld: Math.round(Math.max(10, k * 0.98)), area: Math.round(Math.max(12, k * 1.38)) };
    const font = { room: `600 ${px.room}px Oswald, 'Arial Narrow', sans-serif`, bld: `700 ${px.bld}px Oswald, 'Arial Narrow', sans-serif`, area: `${px.area}px VT323, monospace` };
    const spacing = { room: `${(0.6 * s).toFixed(1)}px`, bld: `${(2.2 * s).toFixed(1)}px`, area: '0px' };
    const col = { room: '#d4caae', bld: '#d6a443', area: '#86b872' };
    const boxes = [];
    const pulse = 0.72 + 0.28 * Math.sin(W.time * 5);
    const canLS = 'letterSpacing' in ctx;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const it of items) {
      ctx.font = font[it.kind]; if (canLS) ctx.letterSpacing = spacing[it.kind];
      const txt = it.text.toUpperCase();
      const w = ctx.measureText(txt).width + (it.obj ? px[it.kind] : 0), h = px[it.kind] * (it.kind === 'area' ? 0.8 : 1);
      let [cx, cy] = P(it.x, it.y);
      if (it.kind === 'bld') cy -= h * 0.9 + 4 * s;
      if (cx + w / 2 < 0 || cx - w / 2 > Wd || cy + h < 0 || cy - h > yBar - 56 * s) continue;
      let placed = null;
      for (const dy of [0, -(h + 3 * s), h + 3 * s]) {
        const bx = { x0: cx - w / 2 - 2, x1: cx + w / 2 + 2, y0: cy + dy - h / 2 - 1, y1: cy + dy + h / 2 + 1 };
        if (!boxes.some((o) => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)) { placed = bx; break; }
      }
      if (!placed) { if (!(it.obj || it.here)) continue; placed = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 }; }
      boxes.push(placed);
      const ty = (placed.y0 + placed.y1) / 2 + (it.kind === 'area' ? 1 : 0.5);
      const tx = cx + (it.obj ? px[it.kind] / 2 : 0);
      ctx.strokeStyle = 'rgba(4,6,4,.92)'; ctx.lineWidth = Math.max(3, 3.4 * s);
      ctx.strokeText(txt, tx, ty);
      ctx.fillStyle = it.obj ? `rgba(255,226,138,${pulse})` : it.here ? '#ffffff' : col[it.kind];
      ctx.fillText(txt, tx, ty);
      if (it.obj) { // objective marker: small diamond before the name
        const mx = placed.x0 + px[it.kind] * 0.45, r = px[it.kind] * 0.28;
        ctx.beginPath(); ctx.moveTo(mx, ty - r); ctx.lineTo(mx + r, ty); ctx.lineTo(mx, ty + r); ctx.lineTo(mx - r, ty); ctx.closePath(); ctx.fill();
      }
    }
    if (canLS) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
  }
  return H;
})();
