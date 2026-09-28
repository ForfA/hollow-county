// Hollow County — game loop, state machine, level flow, scripting, interaction, camera, audio mix.
'use strict';
HC.game = (function () {
  const G = {};
  const SKILLS = [
    { name: 'Weekend Prepper', dmg: 0.6, inf: 0.03, infTime: 320, ammo: 1.5, zspeed: 0.92, hp: 0.85 },
    { name: 'Survivor', dmg: 1, inf: 0.065, infTime: 240, ammo: 1, zspeed: 1, hp: 1 },
    { name: 'Dead Man Walking', dmg: 1.4, inf: 0.14, infTime: 180, ammo: 0.8, zspeed: 1.1, hp: 1.15 },
  ];
  G.SKILLS = SKILLS;
  G.skill = SKILLS[1]; G.skillIdx = 1;
  let W = null, state = 'boot', last = 0, levelIdx = 0, levelLoad = null;
  let totals = { kills: 0, secrets: 0, time: 0 };
  let zoomMul = 1, shakeAmt = 0, amb = [], ambT = 10, beatT = 0, musicT = 0, intensity = 0, deathShown = false;
  const canvas = document.getElementById('game');
  const USE_LABEL = { breaker: 'Throw the breakers', call: 'Call Dustoff on 34.90', panel: 'Bridge firing panel' };
  G.state = () => state;
  G.world = () => W;

  // ------------------------------------------------------------ helpers used by entities
  G.msg = (t, k) => HC.hud.msg(t, k);
  G.noise = (x, y, r) => { if (W) W.noises.push({ x, y, r, t: 0 }); };
  G.shake = (a) => { if (HC.settings.shake) shakeAmt = Math.max(shakeAmt, a); };
  G.flashHurt = (a) => { HC.hud.hurtFlash = Math.max(HC.hud.hurtFlash, a); };
  G.hitStop = (t) => { if (W) W.hitStop = Math.max(W.hitStop, t); };
  // Aim point under the cursor. Characters are drawn at different heights (a crawler lies at ground level, a
  // standing zombie spans 0..1.4 units), so a fixed-height unprojection aims *behind* low targets. If the cursor
  // is over a visible zombie's on-screen body we aim at that zombie; otherwise at the chest-height ground point.
  G.aimTarget = null;
  G.mouseWorld = () => {
    const mx = HC.input.mouse.x, my = HC.input.mouse.y;
    let best = null, bd = 1;
    if (W && !W.ghost) {
      const z = HC.render.cam.zoom;
      for (const m of W.mobs) {
        if (m.dead || m.dying || m.alpha < 0.5) continue;
        const sc = (m.T.boss ? 1.3 : 1), bulk = (m.look.bulk || 1) * sc;
        const g = HC.render.worldToScreen(m.x, m.y, 0);
        let d;
        if (m.fall > 0.5) {                     // prone: a flat ellipse around the body on the ground
          d = Math.hypot((mx - g[0]) / (30 * z * sc), (my - g[1] + 4 * z) / (15 * z * sc));
        } else {                                // standing: a box from the feet to the top of the head
          const top = HC.render.worldToScreen(m.x, m.y, 1.45 * sc)[1], hw = 13 * z * bulk;
          if (my < top || my > g[1] + 5 * z) continue;
          d = Math.abs(mx - g[0]) / hw;
        }
        if (d < bd) { bd = d; best = m; }
      }
    }
    G.aimTarget = best;
    return best ? { x: best.x, y: best.y } : HC.render.screenToWorld(mx, my, 0.75);
  };
  G.pickOutfit = () => {
    const d = W && W.def;
    if (!d) return 'civ';
    if (d.outfitMix) return d.outfitMix[(Math.random() * d.outfitMix.length) | 0];
    return d.outfits || 'civ';
  };
  G.spawnItem = (type, x, y) => { W.items.push({ type, x, y, drop: true }); HC.parts.sparks(x, y, 0.4, 6, [255, 230, 120]); };
  G.onKill = (m) => { if (!W.ghost) W.stats.kills++; };
  G.onZombieSpotted = () => {
    if (W.ghost) return;
    if (!W.flags.spotted) { W.flags.spotted = true; W.player.bark('firstZed', 0.8); if (W.def.num === 1) HC.hud.hint('Gunfire is LOUD — every dead thing nearby hears it. Your bat (1) is quiet. Hold RMB to steady your aim.'); }
  };
  G.damageDoor = function (d, dmg, byPlayer) {
    if (d.lock || d.shutter || d.broken) return;
    d.hp -= dmg;
    HC.audio.play('thud', { x: d.x + 0.5, y: d.y + 0.5, vol: 0.8 });
    for (let i = 0; i < 4; i++) HC.parts.add({ type: 'debris', x: d.x + 0.5, y: d.y + 0.5, z: 0.8, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 2, life: 1.5, col: '#7a5a3a' });
    if (byPlayer && d.barricade && !W.flags.barricadeHint) { W.flags.barricadeHint = true; G.msg('The boards are giving way...'); }
    if (d.hp <= 0) G.breakDoor(d);
  };
  G.breakDoor = function (d) {
    d.broken = true; d.open = 1; d.barricade = false;
    HC.level.refreshTile(d.i);
    HC.audio.play('thud', { x: d.x + 0.5, y: d.y + 0.5, vol: 1.3 });
    for (let i = 0; i < 10; i++) HC.parts.add({ type: 'debris', x: d.x + 0.5, y: d.y + 0.5, z: 0.6, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: Math.random() * 3, life: 2, col: '#6a4a2a' });
    G.noise(d.x + 0.5, d.y + 0.5, 10);
    W.flowDirty = true;
  };
  G.breakWindow = function (w) {
    if (w.broken) return;
    w.broken = true;
    HC.level.refreshTile(w.i);
    HC.audio.play('glass', { x: w.x + 0.5, y: w.y + 0.5 });
    for (let i = 0; i < 12; i++) HC.parts.add({ type: 'glass', x: w.x + 0.5, y: w.y + 0.5, z: 1.1, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 2, life: 1.6 });
    G.noise(w.x + 0.5, w.y + 0.5, 9);
    W.flowDirty = true;
  };
  function toggleDoor(d) {
    const cx = d.x + 0.5, cy = d.y + 0.5;
    if (d.open) {
      const blocked = W.mobs.some((m) => !m.dead && HC.dist(m.x, m.y, cx, cy) < 0.7) || HC.dist(W.player.x, W.player.y, cx, cy) < 0.62;
      if (blocked) { G.msg('Something is in the way.'); return; }
      d.open = 0; HC.audio.play('doorClose', { x: cx, y: cy });
    } else { d.open = 1; HC.audio.play('doorOpen', { x: cx, y: cy }); }
    HC.level.refreshTile(d.i);
    G.noise(cx, cy, 3);
    W.flowDirty = true;
  }

  // ------------------------------------------------------------ world construction
  function makeWorld(def, load, opts) {
    opts = opts || {};
    const lv = HC.level.load(def);
    HC.phys.prepare(lv);
    HC.render.prepare(lv);
    const w = {
      lv, def, mobs: [], items: [], fires: [], projs: [], flashes: [], noises: [], timers: [], time: 0, clock: def.time, frame: 0, visStamp: 1, dtFrame: 0.016,
      stats: { kills: 0, items: 0, secrets: 0 }, fired: {}, pickedTypes: {}, flags: {}, prompt: null, holdout: 0, heli: null, alarm: null,
      flowT: 0, flowTile: -1, flowDist: null, flowDirty: true, mobGrid: new HC.MobGrid(), hitStop: 0, allVisible: !!opts.title, ghost: !!opts.title,
      indoor: false, dark: false, visMul: 1, ambient: [255, 255, 255], spawnCount: {},
    };
    W = w; HC.W = w;
    HC.decals.init(lv);
    HC.parts.list.length = 0;
    if (opts.title) w.player = { x: -999, y: -999, dead: true, face: 0, flashlight: false };
    else w.player = new HC.Player(w, lv.start.x, lv.start.y, load);
    lv.mobs.forEach((m) => w.mobs.push(new HC.Zombie(w, m)));
    lv.items.forEach((it) => w.items.push(Object.assign({}, it)));
    lv.fx.forEach((f) => { if (f.kind === 'fire') HC.fx.fire(w, f.x, f.y, 0.7, Infinity, true); });
    // first frame lighting state
    w.dark = HC.render.ambient(w).reduce((a, b) => a + b, 0) / 765 < 0.45;
    if (w.player.flashlight !== undefined && !opts.title) w.player.flashlight = w.dark;
    return w;
  }
  function startAmbience() {
    stopAmbience();
    const wx = W.def.weather || {};
    amb.push({ k: 'wind', h: HC.audio.loop('wind', { vol: 0.12, fade: 2 }) });
    if (wx.rain) amb.push({ k: 'rain', h: HC.audio.loop('rain', { vol: 0.22, fade: 2 }) });
  }
  function stopAmbience() { amb.forEach((a) => a.h.stop(1)); amb = []; if (W && W.alarm && W.alarm.snd) W.alarm.snd.stop(0.3); }

  // ------------------------------------------------------------ flow
  G.boot = function () {
    HC.render.init(canvas);
    requestAnimationFrame(frame);
    // Dev/test hook (only when running locally): #test=title | #test=1..4 [&x=..&y=..&face=..&clock=..&bot=1&shots=1]
    const q = new URLSearchParams(location.hash.slice(1));
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (q.has('test') && local) {   // dev-only: ignored on the published site
      const t = q.get('test');
      HC.audio.init();
      if (t === 'title') { G.toTitle(false); return; }
      if (t === 'ebs') { HC.screens.ebs(() => G.toTitle(true)); return; }
      const idx = (+t || 1) - 1;
      const load = HC.newLoadout();
      if (q.has('arsenal')) { Object.assign(load.weapons, { shotgun: 1, rifle: 1, axe: 1 }); Object.assign(load.ammo, { ammo9: 150, shells: 50, ammo556: 210 }); load.mags.shotgun = 6; load.mags.rifle = 30; load.inv.molotov = 3; }
      levelIdx = idx; levelLoad = load;
      W = makeWorld(HC.LEVELS[idx], load);
      if (q.has('x')) { W.player.x = +q.get('x') + 0.5; W.player.y = +q.get('y') + 0.5; }
      if (q.has('face')) W.player.face = +q.get('face');
      if (q.has('clock')) W.clock = +q.get('clock');
      if (q.has('flash')) W.player.flashlight = q.get('flash') === '1';
      HC.render.cam.x = W.player.x; HC.render.cam.y = W.player.y;
      state = 'play';
      runActions(W.def.script.start);
      if (q.has('bot')) G.bot = true;
      if (q.has('god')) G.god = true;
      return;
    }
    HC.screens.boot(() => {
      HC.audio.init();
      const ready = document.fonts && document.fonts.load
        ? Promise.race([Promise.all(['Anton', 'Oswald', 'Special Elite', 'VT323'].map((f) => document.fonts.load(`16px "${f}"`))).catch(() => {}), new Promise((r) => setTimeout(r, 2500))])
        : Promise.resolve();
      ready.then(() => {
        HC.screens.logo();
        state = 'ebs';
        HC.screens.ebs(() => G.toTitle(true));
      });
    });
  };
  G.toTitle = function (slam) {
    stopAmbience();
    canvas.classList.remove('grey', 'nocursor');
    W = makeWorld(HC.TITLE_LEVEL, null, { title: true });
    HC.render.cam.x = 20; HC.render.cam.y = 14; HC.render.cam.zoom = 1.6;
    state = 'title';
    HC.audio.music.play('title', 0.5);
    amb.push({ k: 'rain', h: HC.audio.loop('rain', { vol: 0.16, fade: 2 }) });
    if (slam) HC.audio.play('slam');
    HC.screens.title(slam);
  };
  G.newGame = function (skillIdx) {
    G.skillIdx = skillIdx; G.skill = SKILLS[skillIdx];
    totals = { kills: 0, secrets: 0, time: 0 };
    HC.clearSave();
    stopAmbience();
    HC.audio.music.play('title');
    state = 'story';
    HC.screens.story(HC.story.intro.head, HC.story.intro.text, () => G.startLevel(0, HC.newLoadout()));
  };
  G.continueGame = function () {
    const s = HC.loadSave(); if (!s) return;
    G.skillIdx = s.skill || 1; G.skill = SKILLS[G.skillIdx];
    totals = s.totals || { kills: 0, secrets: 0, time: 0 };
    G.startLevel(s.level, s.load);
  };
  G.startLevel = function (idx, load) {
    levelIdx = idx; levelLoad = JSON.parse(JSON.stringify(load));
    const def = HC.LEVELS[idx];
    stopAmbience();
    HC.audio.music.stop(1);
    HC.writeSave({ level: idx, load: levelLoad, skill: G.skillIdx, totals });
    state = 'card';
    canvas.classList.remove('grey');
    deathShown = false;
    W = makeWorld(def, load);
    HC.hud.reset();
    const cam = HC.render.cam; cam.x = W.player.x; cam.y = W.player.y;
    HC.screens.card(def, () => {
      state = 'play';
      canvas.classList.add('nocursor');
      HC.audio.music.play(def.music);
      startAmbience();
      runActions(def.script.start);
      if (def.num === 1) HC.hud.hint('WASD move · Mouse aim · Left click attack · Hold right click to steady aim · Shift sprint · E use · Esc pause');
      if (W.dark) HC.hud.hint('It\'s dark. F toggles your flashlight — the dead notice the beam.');
    });
  };
  G.pause = function () { if (state !== 'play') return; state = 'paused'; canvas.classList.remove('nocursor'); HC.screens.pause(); };
  G.resume = function () { HC.screens.clear(); state = 'play'; canvas.classList.add('nocursor'); };
  G.retry = function () { HC.screens.clear(); G.startLevel(levelIdx, levelLoad); };
  G.quitToTitle = function () { HC.screens.clear(); HC.hud.reset(); G.toTitle(false); };

  function readNote(it) {
    const notes = HC.story.notes[W.def.id] || [];
    const n = notes[it.note];
    if (!n) return;
    state = 'reading';
    canvas.classList.remove('nocursor');
    HC.screens.note(n, () => {
      state = 'play'; canvas.classList.add('nocursor');
      if (!it.read) { it.read = true; runActions(W.def.script.note && W.def.script.note[it.note]); }
    });
  }

  G.onPlayerDeath = function (kind) {
    state = 'dead';
    W.deathT = 0;
    HC.audio.music.stop(2);
    HC.audio.play('sting');
    canvas.classList.add('grey');
    canvas.classList.remove('nocursor');
    HC.hud.automap = false;
  };
  function showDeath() {
    deathShown = true;
    const p = W.player, def = W.def;
    const pool = HC.story.death[p.deathKind] || HC.story.death.zombie;
    const by = pool[(Math.random() * pool.length) | 0].replace('{place}', def.name);
    const dayN = parseInt((def.day || 'DAY 1').replace(/\D/g, ''), 10) || 1;
    const mins = Math.max(1, Math.floor((dayN - 1) * 1440 + W.clock - (17 * 60 + 40)));
    const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    const parts = []; if (d) parts.push(`${d} day${d > 1 ? 's' : ''}`); if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`); parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
    HC.screens.death({ by, time: 'You survived ' + parts.join(', ') + '.' }, () => G.retry(), () => G.quitToTitle());
  }

  function finishLevel() {
    if (state !== 'play') return;
    const p = W.player, lv = W.lv, def = W.def;
    state = 'inter';
    canvas.classList.remove('nocursor');
    stopAmbience();
    if (W.heli && W.heli.snd) W.heli.snd.stop(1.5);
    const st = {
      def, time: Math.floor(W.time),
      kills: lv.killTotal ? Math.round(100 * Math.min(1, W.stats.kills / lv.killTotal)) : 100,
      items: lv.itemTotal ? Math.round(100 * Math.min(1, W.stats.items / lv.itemTotal)) : 100,
      secrets: lv.secrets ? Math.round(100 * W.stats.secrets / lv.secrets) : 100,
    };
    totals.kills += W.stats.kills; totals.secrets += W.stats.secrets; totals.time += W.time;
    const load = p.save();
    load.keys = undefined;
    const next = levelIdx + 1;
    if (next >= HC.LEVELS.length) {
      HC.clearSave();
      const kind = p.infection === null ? 'good' : 'bad';
      HC.audio.music.play(kind === 'good' ? 'ending' : 'title', 2);
      state = 'ending';
      HC.screens.ending(kind, { kills: totals.kills, secrets: totals.secrets, time: totals.time, skill: G.skill.name }, () => G.toTitle(false));
      return;
    }
    HC.writeSave({ level: next, load, skill: G.skillIdx, totals });
    HC.audio.music.play('inter', 1);
    HC.screens.intermission(st, () => {
      const diary = HC.story.diary[levelIdx];
      state = 'story';
      if (diary) HC.screens.story(diary.head, diary.text, () => G.startLevel(next, load));
      else G.startLevel(next, load);
    });
  }
  G.onHeliLanded = function () {
    HC.hud.radio(HC.story.radio.m4_heli);
    const lv = W.lv;
    for (let i = 0; i < lv.N; i++) if (lv.exits[i] === 2) lv.exits[i] = 1;
    HC.hud.setObjective('GET TO THE HELICOPTER!');
    W.holdout = 0;
    G.shake(0.3);
  };

  // ------------------------------------------------------------ scripting
  function spawnGroup(name) {
    const g = W.lv.spawns[name]; if (!g) return;
    W.spawnCount[name] = (W.spawnCount[name] || 0) + 1;
    if (W.spawnCount[name] > 1) W.lv.killTotal += g.length;
    for (const s of g) {
      const z = new HC.Zombie(W, s, { aware: true });
      W.mobs.push(z);
      HC.parts.add({ type: 'dust', x: s.x, y: s.y, z: 0.2, vx: 0, vy: 0, vz: 0.5, life: 0.8, size: 10 });
    }
  }
  function runActions(list) {
    if (!list || !W) return;
    for (const a of list) {
      const k = a[0];
      switch (k) {
        case 'radio': if (HC.story.radio[a[1]]) HC.hud.radio(HC.story.radio[a[1]]); break;
        case 'bark': W.timers.push({ t: a[2] || 0, actions: [['sayPool', a[1]]] }); break;
        case 'sayPool': W.player.bark(a[1]); break;
        case 'say': W.player.say(a[1], 3.4); break;
        case 'objective': HC.hud.setObjective(a[1]); break;
        case 'hint': HC.hud.hint(a[1]); break;
        case 'msg': G.msg(a[1]); break;
        case 'spawn': spawnGroup(a[1]); break;
        case 'open':
          W.lv.doors.forEach((d) => { if (d.tag === a[1]) { d.open = 1; d.shutter = true; HC.level.refreshTile(d.i); HC.audio.play('thud', { x: d.x, y: d.y, vol: 0.7 }); } });
          W.flowDirty = true; break;
        case 'alarm': W.alarm = { t: a[1], nt: 0, snd: HC.audio.loop('alarm', { vol: 0.16, fade: 0.2 }) }; break;
        case 'music': HC.audio.music.play(a[1], 1); W.music = a[1]; break;
        case 'noise': G.noise(a[1], a[2], a[3]); break;
        case 'timer': W.timers.push({ t: a[1], actions: a[2] }); break;
        case 'holdout': W.holdout = a[1]; break;
        case 'heli': HC.fx.heli(W, W.def.helipad); HC.hud.setObjective('Dustoff inbound — keep the LZ clear!'); break;
        case 'sound': HC.audio.play(a[1]); break;
      }
    }
  }

  // ------------------------------------------------------------ interaction
  function findInteract() {
    const p = W.player, lv = W.lv;
    let best = null, bestS = 9;
    for (const it of W.items) {
      if (it.taken || it.type !== 'note') continue;
      const d = HC.dist(p.x, p.y, it.x, it.y);
      if (d < 1.1 && d < bestS) { bestS = d; best = { kind: 'note', it, label: it.read ? 'Read note again' : 'Read note' }; }
    }
    const fx = p.x + Math.cos(p.face) * 0.7, fy = p.y + Math.sin(p.face) * 0.7;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = Math.floor(fx) + dx, ty = Math.floor(fy) + dy;
      if (!lv.inb(tx, ty)) continue;
      const i = lv.idx(tx, ty), cx = tx + 0.5, cy = ty + 0.5;
      const d = HC.dist(p.x, p.y, cx, cy);
      if (d > 1.55) continue;
      const ang = Math.abs(HC.angDiff(p.face, Math.atan2(cy - p.y, cx - p.x)));
      const sc = d + ang * 0.45;
      if (sc >= bestS) continue;
      const door = lv.doors.get(i);
      if (door && !door.broken) {
        let label;
        const gate = door.kind === HC.level.WK.fence || door.kind === HC.level.WK.woodfence;
        if (door.lock) { const nm = (W.def.keys && W.def.keys[door.lock]) || door.lock + ' key'; label = p.keys[door.lock] ? `Unlock with the ${nm}` : `Locked — needs the ${nm}`; }
        else if (door.barricade) label = 'Boarded up — break it down (attack it)';
        else if (door.shutter) label = door.open ? 'Rolling shutter (open)' : 'Rolling shutter — locked down';
        else label = door.open ? (gate ? 'Close gate' : 'Close door') : (gate ? 'Open gate' : 'Open door');
        bestS = sc; best = { kind: 'door', door, label };
        continue;
      }
      const sw = lv.secretWalls.get(i);
      if (sw && !sw.open && d < 1.3) { bestS = sc; best = { kind: 'secret', sw, i, label: 'This panel looks loose…' }; continue; }
      const pi = lv.propAt[i];
      if (pi >= 0 && lv.props[pi].use) { const pr = lv.props[pi]; bestS = sc; best = { kind: 'use', pr, label: USE_LABEL[pr.use.switch] || 'Use' }; }
    }
    return best;
  }
  function doInteract(it) {
    const p = W.player;
    if (it.kind === 'note') { readNote(it.it); return; }
    if (it.kind === 'door') {
      const d = it.door;
      if (d.lock) {
        if (p.keys[d.lock]) { const nm = (W.def.keys && W.def.keys[d.lock]) || d.lock; d.lock = null; d.hp = d.maxHp = 100; G.msg(`Unlocked with the ${nm}.`, 'good'); HC.audio.play('click', { f: 900 }); toggleDoor(d); }
        else { HC.audio.play('locked', { x: d.x, y: d.y }); const nm = (W.def.keys && W.def.keys[d.lock]) || d.lock + ' key'; p.say(HC.story.barks.locked[0].replace('{key}', nm)); }
        return;
      }
      if (d.barricade) { p.bark('barricade'); return; }
      if (d.shutter) { if (!d.open) { HC.audio.play('locked', { x: d.x, y: d.y }); p.say('Won\'t budge. It must run off the power somewhere.'); } return; }
      toggleDoor(d);
      if (!W.flags.doorHint) { W.flags.doorHint = true; HC.hud.hint('The dead can\'t open doors — but they WILL break them down. Close doors behind you.'); }
      return;
    }
    if (it.kind === 'secret') {
      it.sw.open = true;
      HC.level.refreshTile(it.i);
      HC.audio.play('thud', { x: it.sw.x + 0.5, y: it.sw.y + 0.5 });
      for (let i = 0; i < 8; i++) HC.parts.add({ type: 'debris', x: it.sw.x + 0.5, y: it.sw.y + 0.5, z: 0.8, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 2, life: 1.5, col: '#8a8070' });
      G.msg('The panel comes loose.');
      W.flowDirty = true;
      return;
    }
    if (it.kind === 'use') {
      const pr = it.pr, name = pr.use.switch;
      const once = name !== 'panel';
      if (once && pr.used) { G.msg('Already done.'); return; }
      pr.used = true; pr.var = 1;
      HC.audio.play('click', { f: 700 }); HC.audio.play('thud', { vol: 0.5 });
      runActions(W.def.script.switch && W.def.script.switch[name]);
    }
  }

  G._run = (list) => runActions(list);                // test hooks
  G._interact = () => { const it = findInteract(); if (it) doInteract(it); return it && it.label; };

  // ------------------------------------------------------------ per-frame update
  function update(dt) {
    const I = HC.input, p = W.player, lv = W.lv;
    if (I.hit('Escape')) { G.pause(); return; }
    if (I.hit('Tab')) HC.hud.automap = !HC.hud.automap;
    if (I.wheel) zoomMul = HC.clamp(zoomMul * (I.wheel > 0 ? 0.9 : 1.1), 0.65, 1.55);
    HC.hud.update(dt, W);
    if (W.hitStop > 0) { W.hitStop -= dt; return; }
    W.time += dt; W.clock += dt;
    for (const n of W.noises) n.t += dt;
    W.noises = W.noises.filter((n) => n.t < 0.6);
    for (let i = W.timers.length - 1; i >= 0; i--) { const t = W.timers[i]; t.t -= dt; if (t.t <= 0) { W.timers.splice(i, 1); runActions(t.actions); } }
    for (let i = W.flashes.length - 1; i >= 0; i--) { W.flashes[i].t += dt; if (W.flashes[i].t > W.flashes[i].life) W.flashes.splice(i, 1); }
    if (G.god) { p.hp = 100; p.infection = null; }
    if (G.bot) {   // test harness: aim at and shoot the nearest visible zombie
      let best = null, bd = 11;
      for (const m of W.mobs) { if (m.dead || m.dying) continue; const d = HC.dist(m.x, m.y, p.x, p.y); if (d < bd && HC.phys.los(lv, p.x, p.y, m.x, m.y)) { bd = d; best = m; } }
      if (best) { const s = HC.render.worldToScreen(best.x, best.y, 0.75); I.mouse.x = s[0]; I.mouse.y = s[1]; I.mouse.l = true; I.mouse.lp = true; }
      else I.mouse.l = false;
    }
    p.update(dt);
    if (state !== 'play') return;
    // interaction
    const it = findInteract();
    W.prompt = it ? it.label : null;
    if (I.hit('KeyE') && it) doInteract(it);
    // pickups
    for (const item of W.items) {
      if (item.taken || item.type === 'note') continue;
      if (HC.dist(p.x, p.y, item.x, item.y) > 0.62) continue;
      if (p.tryPickup(item)) {
        item.taken = true;
        if (!item.drop) W.stats.items++;
        if (item.type.startsWith('key') && !W.flags.keyHint) { W.flags.keyHint = true; HC.hud.hint('Keys open doors marked with the same colour. Walk up and press E.'); }
        if (!W.pickedTypes[item.type]) { W.pickedTypes[item.type] = true; runActions(W.def.script.pickup && W.def.script.pickup[item.type]); }
      }
    }
    // flow field toward the player
    const pt = lv.idx(p.x | 0, p.y | 0);
    W.flowT -= dt;
    if (W.flowDirty || pt !== W.flowTile || W.flowT <= 0) { W.flowDist = HC.flow.build(lv, p.x | 0, p.y | 0); W.flowTile = pt; W.flowT = 0.6; W.flowDirty = false; }
    // mobs
    W.mobGrid.rebuild(W.mobs);
    for (const m of W.mobs) m.update(dt);
    if ((W.frame & 63) === 0) W.mobs = W.mobs.filter((m) => !m.dead);
    HC.fx.updateFires(W, dt);
    HC.fx.updateProjs(W, dt);
    HC.fx.updateHeli(W, dt);
    HC.parts.update(dt, lv);
    // tile triggers
    const ti = lv.trig[pt];
    if (ti >= 0) { const name = lv.trigNames[ti]; if (!W.fired[name]) { W.fired[name] = true; runActions(W.def.script.trig && W.def.script.trig[name]); } }
    const si = lv.secretId[pt];
    if (si >= 0 && !lv.secretFound[si]) {
      lv.secretFound[si] = 1; W.stats.secrets++;
      G.msg('You found a hidden stash!', 'good'); HC.audio.play('secret'); p.bark('secret', 0.7);
    }
    if (lv.exits[pt] === 1) { finishLevel(); return; }
    if (lv.exits[pt] === 2 && !W.flags.lzHint) { W.flags.lzHint = true; p.say('This is the LZ. Now I need someone to land on it.'); }
    // roofs & indoor
    const b = lv.bld[pt];
    for (const bd of lv.buildings) bd.alpha = HC.approach(bd.alpha, bd.id === b ? 0 : 1, dt * 4);
    W.indoor = b >= 0 && !lv.buildings[b].noRoof;
    // alarm & holdout
    if (W.alarm) {
      W.alarm.t -= dt; W.alarm.nt -= dt;
      if (W.alarm.nt <= 0) { W.alarm.nt = 2.5; G.noise(p.x, p.y, 45); }
      if (W.alarm.t <= 0) { W.alarm.snd.stop(1); W.alarm = null; G.msg('The alarm finally dies.'); }
    }
    if (W.holdout > 0) W.holdout = Math.max(0.01, W.holdout - dt);
    // late hints
    if (W.time > 80 && !W.flags.mapHint) { W.flags.mapHint = true; HC.hud.hint('TAB opens the automap.'); }
    if (p.bleed > 0 && !W.flags.bleedHint) { W.flags.bleedHint = true; HC.hud.hint('Bleeding drains your health until you stop it. Press B to apply a bandage.'); }
    if (p.infection !== null && !W.flags.infHint) { W.flags.infHint = true; HC.hud.hint('You\'re infected. The fever will kill you. MX-7 antiviral (V) holds it back.'); }
    audioMix(dt);
  }
  function updateDead(dt) {
    W.time += dt; W.deathT += dt;
    HC.hud.update(dt, W);
    W.player.update(dt);
    W.mobGrid.rebuild(W.mobs);
    for (const m of W.mobs) m.update(dt);
    HC.fx.updateFires(W, dt);
    HC.parts.update(dt, W.lv);
    if (W.deathT > 2.8 && !deathShown) showDeath();
  }
  function updateTitle(dt) {
    W.time += dt;
    W.mobGrid.rebuild(W.mobs);
    for (const m of W.mobs) m.update(dt);
    HC.fx.updateFires(W, dt);
    HC.parts.update(dt, W.lv);
    const cam = HC.render.cam;
    cam.x = 20 + Math.sin(W.time * 0.045) * 7; cam.y = 14 + Math.cos(W.time * 0.035) * 4;
    const { w, h } = HC.render.size();
    cam.zoom = HC.clamp(Math.min(w / 1500, h / 860) * 1.9, 1, 2.8);
  }
  function audioMix(dt) {
    const p = W.player;
    HC.audio.listener.x = p.x; HC.audio.listener.y = p.y;
    musicT -= dt;
    if (musicT <= 0) {
      musicT = 0.4;
      let n = 0;
      for (const m of W.mobs) if (!m.dead && !m.dying && m.state === 'chase' && HC.dist(m.x, m.y, p.x, p.y) < 16) n++;
      const target = W.music === 'boss' ? 1 : HC.clamp(n / 4, 0, 1);
      intensity = HC.lerp(intensity, target, target > intensity ? 0.5 : 0.12);
      HC.audio.music.intensity(intensity);
    }
    beatT -= dt;
    if ((p.hp < 30 || p.panic > 0.65) && beatT <= 0 && !p.dead) { beatT = p.hp < 15 ? 0.55 : 0.8; HC.audio.play('heartbeat', { vol: 0.35 + (1 - p.hp / 100) * 0.4 }); }
    for (const a of amb) if (a.k === 'rain') a.h.set(W.indoor ? 0.07 : 0.22);
    ambT -= dt;
    if (ambT <= 0) { ambT = HC.R.range(14, 34); if (Math.random() < 0.55) HC.audio.play('distantShot'); else HC.audio.play('dog'); }
  }
  function updateCamera(dt) {
    const cam = HC.render.cam;
    const { w, h } = HC.render.size();
    const p = W.player;
    const base = HC.clamp(Math.min(w / 1500, h / 860) * 1.95, 1.05, 2.9);
    cam.zoom = HC.damp(cam.zoom, base * zoomMul * (state === 'dead' ? 1.45 : 1), state === 'dead' ? 0.6 : 4, dt);
    let tx = p.x, ty = p.y;
    if (state === 'play' && !p.dead) {
      const mw = G.mouseWorld();
      let ox = mw.x - p.x, oy = mw.y - p.y;
      const L = Math.hypot(ox, oy), mx = p.aiming ? 4.5 : 2.4;
      if (L > mx) { ox *= mx / L; oy *= mx / L; }
      const k = p.aiming ? 0.5 : 0.28;
      tx += ox * k; ty += oy * k;
    }
    cam.x = HC.damp(cam.x, tx, 5, dt); cam.y = HC.damp(cam.y, ty, 5, dt);
    shakeAmt = Math.max(0, shakeAmt - dt * 2.5);
    cam.sx = (Math.random() - 0.5) * shakeAmt * 16; cam.sy = (Math.random() - 0.5) * shakeAmt * 16;
  }

  // ------------------------------------------------------------ main loop
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    try {
      if (W && (state === 'play' || state === 'dead' || state === 'title' || state === 'paused' || state === 'reading')) {
        W.dtFrame = dt;
        if (state === 'play') update(dt);
        else if (state === 'dead') updateDead(dt);
        else if (state === 'title') updateTitle(dt);
        if (state !== 'title') updateCamera(state === 'play' || state === 'dead' ? dt : 0);
        const t0 = performance.now();
        HC.render.computeVis(W);
        const t1 = performance.now();
        HC.render.draw(W, { noCut: W.ghost });
        const t2 = performance.now();
        if (state !== 'title' && W && !W.ghost) HC.hud.draw(HC.render.ctx(), W);
        const t3 = performance.now();
        const pf = G.perf = G.perf || { n: 0, vis: 0, draw: 0, hud: 0, total: 0 };
        pf.n++; pf.vis += t1 - t0; pf.draw += t2 - t1; pf.hud += t3 - t2; pf.total += dt * 1000;
      }
    } catch (e) {
      console.error(e);
      if (!G._errShown) { G._errShown = true; HC.hud.msg('Error: ' + e.message, 'bad'); }
    }
    HC.input.endFrame();
    requestAnimationFrame(frame);
  }
  return G;
})();

HC.game.boot();
