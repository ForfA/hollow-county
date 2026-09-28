// Hollow County — player: movement, weapons, melee & hitscan, items, moodles (bleeding/panic/endurance/infection), interaction.
'use strict';
HC.WEAPONS = {
  fists: { slot: 1, melee: 1, name: 'Fists', dmg: 9, range: 0.95, arc: 1.3, rate: 0.42, knock: 1.4, down: 0.12, noise: 2.5 },
  bat: { slot: 1, melee: 1, name: 'Baseball Bat', dmg: 36, range: 1.45, arc: 1.8, rate: 0.62, knock: 2.6, down: 0.35, noise: 3, dur: 70 },
  axe: { slot: 1, melee: 1, name: 'Fire Axe', dmg: 72, range: 1.5, arc: 1.6, rate: 0.8, knock: 2.2, down: 0.3, noise: 3, dur: 150 },
  pistol: { slot: 2, name: 'M9 Pistol', dmg: 27, rate: 0.19, mag: 15, ammo: 'ammo9', spread: 0.04, noise: 17, reload: 1.35, range: 20, knock: 0.7, shake: 0.12, snd: 'pistol' },
  shotgun: { slot: 3, name: 'Shotgun', dmg: 14, pellets: 8, rate: 0.9, mag: 6, ammo: 'shells', spread: 0.22, noise: 24, reload: 2.2, range: 13, knock: 1.3, shake: 0.4, snd: 'shotgun', pump: true, down: 0.25 },
  rifle: { slot: 4, name: 'M16 Rifle', dmg: 31, rate: 0.095, auto: 1, mag: 30, ammo: 'ammo556', spread: 0.05, noise: 26, reload: 2.0, range: 26, knock: 0.8, shake: 0.15, snd: 'rifle', pierce: 1 },
};
HC.AMMO_MAX = { ammo9: 150, shells: 50, ammo556: 210 };
HC.AMMO_NAME = { ammo9: '9MM', shells: 'SHELLS', ammo556: '5.56' };

HC.newLoadout = () => ({
  hp: 100, armor: 0, weapons: { fists: 1, bat: 1, pistol: 1 }, mags: { pistol: 15, shotgun: 0, rifle: 0 },
  ammo: { ammo9: 30, shells: 0, ammo556: 0 }, inv: { bandage: 2, antiviral: 1, molotov: 0 }, dur: { bat: 70, axe: 150 },
  cur: 'pistol', last: 'bat', infection: null, bleed: 0,
});

HC.Player = class {
  constructor(W, x, y, load) {
    this.W = W; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.r = 0.26;
    this.face = W.lv.def.startFace || 0; this.walk = 0; this.moveAmt = 0;
    const L = JSON.parse(JSON.stringify(load));
    Object.assign(this, L);
    this.keys = {};
    this.endurance = 1; this.panic = 0; this.flashlight = !!W.dark; this.aiming = false;
    this.swingT = -1; this.swingHit = false; this.fireCd = 0; this.reloadT = -1; this.recoil = 0;
    this.useT = -1; this.useKind = null; this.hurtT = 0; this.grinT = 0; this.lookT = 0; this.look = 0;
    this.bleedT = 0; this.stepPhase = 0; this.grabT = 0; this.dead = false; this.fall = 0; this.deathT = 0;
    this.sayText = null; this.sayT = 0; this.lastMoodles = {};
    this.lookSpec = Object.assign({}, HC.rig.OUTFITS.medic);
    this.lowAmmoWarned = {};
  }
  get weapon() { return HC.WEAPONS[this.cur]; }
  save() {
    const o = {};
    ['hp', 'armor', 'weapons', 'mags', 'ammo', 'inv', 'dur', 'cur', 'last', 'infection', 'bleed'].forEach((k) => { o[k] = JSON.parse(JSON.stringify(this[k])); });
    return o;
  }
  say(text, dur) { this.sayText = text; this.sayT = dur || 2.8; }
  bark(pool, chance) {
    if (chance !== undefined && Math.random() > chance) return;
    const list = HC.story.barks[pool]; if (!list) return;
    this.say(list[(Math.random() * list.length) | 0]);
  }
  // ------------------------------------------------------------ damage
  hurt(dmg, src) {
    if (this.dead) return;
    const sk = HC.game.skill;
    let d = dmg * sk.dmg;
    if (this.armor > 0) { const a = Math.min(this.armor, d * 0.4); this.armor -= a; d -= a; }
    this.hp -= d;
    this.hurtT = 0.5; this.grabT = 0.35;
    this.panic = Math.min(1, this.panic + 0.18);
    HC.audio.play('phurt');
    HC.game.shake(0.35); HC.game.flashHurt(Math.min(1, d / 25));
    const dx = this.x - src.x, dy = this.y - src.y;
    HC.parts.blood(this.x, this.y, 1, dx, dy, 6);
    HC.decals.blood(this.x, this.y, 0.7);
    this.vx += dx * 2; this.vy += dy * 2;
    if (src.T && src.T.boss) { this.vx += dx * 6; this.vy += dy * 6; }
    // wounds
    const bitten = Math.random() < (this.armor > 0 ? 0.45 : 0.75);
    if (Math.random() < 0.35 && this.bleed < 2) { this.bleed++; this.bleedT = 0; HC.game.msg('You are bleeding. Press B to bandage.', 'warn'); this.bark('bleed', 0.6); }
    if (bitten && this.infection === null && Math.random() < sk.inf * (this.armor > 0 ? 0.45 : 1)) {
      this.infection = 0;
      this.bark('bitten');
      HC.game.msg('You\'ve been bitten. You feel feverish.', 'bad');
    }
    if (this.hp <= 0) this.die(src.T ? 'zombie' : 'zombie');
  }
  burn(dt) {
    if (this.dead) return;
    this.hp -= 16 * dt * HC.game.skill.dmg;
    this.hurtT = 0.3;
    if (Math.random() < dt * 3) { HC.audio.play('phurt'); HC.game.flashHurt(0.4); }
    if (this.hp <= 0) this.die('fire');
  }
  die(kind) {
    if (this.dead) return;
    this.dead = true; this.hp = 0; this.deathKind = kind; this.fallDir = 1;
    HC.audio.play('pdie');
    HC.game.onPlayerDeath(kind);
  }
  // ------------------------------------------------------------ update
  update(dt) {
    const W = this.W, I = HC.input, lv = W.lv, sk = HC.game.skill;
    this.sayT -= dt; this.hurtT -= dt; this.grinT -= dt; this.grabT -= dt;
    if (this.dead) { this.fall = Math.min(1, this.fall + dt * 2); this.deathT += dt; return; }
    // look direction for the HUD face
    this.lookT -= dt; if (this.lookT <= 0) { this.lookT = HC.R.range(0.8, 2.2); this.look = HC.R.pick([-1, 0, 0, 1]); }
    // ---- aiming
    const mw = HC.game.mouseWorld();
    const ta = Math.atan2(mw.y - this.y, mw.x - this.x);
    this.face += HC.angDiff(this.face, ta) * Math.min(1, dt * (this.swingT >= 0 ? 10 : 22));
    this.aiming = I.mouse.r && !this.weapon.melee;
    // ---- movement (screen-relative)
    let ix = 0, iy = 0;
    if (I.down.KeyW || I.down.ArrowUp) { ix -= 1; iy -= 1; }
    if (I.down.KeyS || I.down.ArrowDown) { ix += 1; iy += 1; }
    if (I.down.KeyA || I.down.ArrowLeft) { ix -= 1; iy += 1; }
    if (I.down.KeyD || I.down.ArrowRight) { ix += 1; iy -= 1; }
    const il = Math.hypot(ix, iy);
    const wantSprint = (I.down.ShiftLeft || I.down.ShiftRight) && il > 0 && !this.aiming && this.endurance > 0.04 && this.useT < 0;
    let spd = 2.5;
    if (wantSprint) spd = 4.1;
    if (this.aiming) spd = 1.4;
    if (this.endurance < 0.25) spd *= 0.8;
    if (this.grabT > 0) spd *= 0.45;
    if (this.useT >= 0) spd *= 0.4;
    if (this.infection !== null && this.infection > 0.55) spd *= 0.9;
    const tvx = il ? (ix / il) * spd : 0, tvy = il ? (iy / il) * spd : 0;
    const acc = il ? 14 : 10;
    this.vx = HC.damp(this.vx, tvx, acc, dt); this.vy = HC.damp(this.vy, tvy, acc, dt);
    const ox = this.x, oy = this.y;
    HC.phys.move(lv, this, this.vx * dt, this.vy * dt, this.r, false);
    const moved = Math.hypot(this.x - ox, this.y - oy) / Math.max(dt, 1e-4);
    this.moveAmt = HC.damp(this.moveAmt, HC.clamp(moved / 2.6, 0, 1.3), 10, dt);
    const sprinting = wantSprint && moved > 1;
    this.walk += dt * (moved * 2.9);
    // footsteps
    const ph = Math.floor(this.walk / Math.PI);
    if (ph !== this.stepPhase && moved > 0.4) {
      this.stepPhase = ph;
      const f = HC.gfx.FLOORS[lv.floor[lv.idx(this.x | 0, this.y | 0)]];
      HC.audio.play('step', { vol: sprinting ? 0.5 : 0.28, soft: f && f.soft });
      HC.game.noise(this.x, this.y, sprinting ? 6.5 : 1.6);
    }
    // endurance
    if (sprinting) this.endurance = Math.max(0, this.endurance - dt * 0.11);
    else this.endurance = Math.min(1, this.endurance + dt * (moved > 0.3 ? 0.05 : 0.1));
    if (this.endurance < 0.05 && sprinting) this.bark('tired', 0.01);
    // panic from nearby chasing zombies
    let threat = 0;
    for (const m of W.mobs) if (!m.dead && !m.dying && (m.state === 'chase' || m.state === 'attack') && HC.dist(m.x, m.y, this.x, this.y) < 6) threat++;
    this.panic = HC.clamp(this.panic + (threat > 2 ? threat * 0.05 : -0.07) * dt, 0, 1);
    if (threat >= 5 && Math.random() < dt * 0.05) this.bark('panic');
    // bleeding
    if (this.bleed > 0) {
      this.bleedT += dt;
      this.hp -= this.bleed * 0.55 * dt;
      if (Math.random() < dt * this.bleed * 1.5) HC.decals.blood(this.x, this.y, 0.35);
      if (this.bleed === 1 && this.bleedT > 40) { this.bleed = 0; HC.game.msg('The bleeding has stopped.'); }
      if (this.hp <= 0) { this.die('zombie'); return; }
    }
    // infection
    if (this.infection !== null) {
      const prev = this.infection;
      this.infection += dt / sk.infTime;
      [[0.25, 'sick1'], [0.55, 'sick2'], [0.8, 'sick3']].forEach(([th, b]) => { if (prev < th && this.infection >= th) { this.bark(b); HC.audio.play('moodle'); } });
      if (this.infection > 0.8) this.hp -= 0.7 * dt;
      if (this.infection >= 1 || this.hp <= 0) { this.die('infection'); return; }
    }
    // ---- weapons & actions
    this.fireCd -= dt; this.recoil = Math.max(0, this.recoil - dt * 8);
    const w = this.weapon;
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      if (this.reloadT >= w.reload) this.finishReload();
    }
    if (this.swingT >= 0) {
      this.swingT += dt / w.rate;
      if (!this.swingHit && this.swingT > 0.42) { this.swingHit = true; this.meleeHit(); }
      if (this.swingT >= 1) this.swingT = -1;
    }
    if (this.useT >= 0) {
      this.useT += dt;
      if (this.useT >= 1.4) this.finishUse();
    }
    const canAct = this.useT < 0;
    if (canAct && (I.mouse.lp || (I.mouse.l && (w.auto || w.melee)))) this.attack();
    if (I.hit('KeyR') && canAct) this.startReload();
    for (const [code, slot] of [['Digit1', 1], ['Digit2', 2], ['Digit3', 3], ['Digit4', 4]]) if (I.hit(code)) this.selectSlot(slot);
    if (I.hit('KeyQ')) this.switchTo(this.last);
    if (I.hit('KeyF')) { this.flashlight = !this.flashlight; HC.audio.play('click', { f: 2600, vol: 0.5 }); }
    if (I.hit('KeyB') && canAct) this.startUse('bandage');
    if (I.hit('KeyV') && canAct) this.startUse('antiviral');
    if (I.hit('KeyG') && canAct) this.throwMolotov(mw);
    // moodle change chime
    const md = this.moodles();
    for (const m of md) if (!this.lastMoodles[m.id] || this.lastMoodles[m.id] < m.lvl) { if (m.lvl >= 2 || m.id === 'bleed' || m.id === 'sick') HC.audio.play('moodle'); }
    this.lastMoodles = {}; for (const m of md) this.lastMoodles[m.id] = m.lvl;
  }
  // ------------------------------------------------------------ weapons
  selectSlot(slot) {
    let pick = null;
    if (slot === 1) pick = this.weapons.axe ? 'axe' : this.weapons.bat ? 'bat' : 'fists';
    else for (const k in HC.WEAPONS) if (HC.WEAPONS[k].slot === slot && this.weapons[k]) pick = k;
    if (pick) this.switchTo(pick);
  }
  switchTo(k) {
    if (!k || !this.weapons[k] || k === this.cur) return;
    this.last = this.cur; this.cur = k; this.reloadT = -1; this.swingT = -1; this.fireCd = 0.25;
    HC.audio.play('click', { f: 1300, vol: 0.5 });
  }
  attack() {
    const w = this.weapon;
    if (this.fireCd > 0 || this.reloadT >= 0) return;
    if (w.melee) {
      this.fireCd = w.rate; this.swingT = 0; this.swingHit = false;
      HC.audio.play('swing', { x: this.x, y: this.y });
      return;
    }
    if (this.mags[this.cur] <= 0) {
      if (this.ammo[w.ammo] > 0) this.startReload();
      else { HC.audio.play('empty'); this.fireCd = 0.3; if (HC.input.mouse.lp) { this.bark('noAmmo', 0.4); HC.game.msg(`No ${HC.AMMO_NAME[w.ammo]} ammo.`, 'warn'); } }
      return;
    }
    this.mags[this.cur]--;
    this.fireCd = w.rate;
    this.recoil = 1;
    const W = this.W;
    HC.audio.play(w.snd, { x: this.x, y: this.y });
    if (w.pump) setTimeout(() => HC.audio.play('pump', { x: this.x, y: this.y, vol: 0.6 }), 380);
    HC.game.noise(this.x, this.y, w.noise);
    HC.game.shake(w.shake);
    const mx = this.x + Math.cos(this.face) * 0.65, my = this.y + Math.sin(this.face) * 0.65;
    HC.parts.add({ type: 'muzzle', x: mx, y: my, z: 1.0, dx: Math.cos(this.face), dy: Math.sin(this.face), life: 0.06, size: w.pellets ? 16 : 11 });
    W.flashes.push({ x: mx, y: my, t: 0, life: 0.07, r: 7 });
    HC.parts.add({ type: 'shell', x: this.x, y: this.y, z: 1.0, vx: Math.cos(this.face + 1.6) * 1.6, vy: Math.sin(this.face + 1.6) * 1.6, vz: 1.6, life: 2.5 });
    let spread = w.spread * (1 + this.moveAmt * 0.8 + this.panic * 1.1) * (this.aiming ? 0.4 : 1);
    if (this.infection !== null && this.infection > 0.55) spread *= 1.35;
    const n = w.pellets || 1;
    for (let i = 0; i < n; i++) this.fireRay(this.face + (Math.random() - 0.5) * 2 * spread, w, mx, my);
    const left = this.mags[this.cur] + this.ammo[w.ammo];
    if (left > 0 && left <= (w.mag / 3 | 0) + 1 && !this.lowAmmoWarned[w.ammo]) { this.lowAmmoWarned[w.ammo] = true; this.bark('lowAmmo', 0.6); }
    if (left > w.mag) this.lowAmmoWarned[w.ammo] = false;
    if (this.mags[this.cur] === 0 && this.ammo[w.ammo] > 0) setTimeout(() => { if (this.cur && this.weapon === w && this.mags[this.cur] === 0) this.startReload(); }, 250);
  }
  fireRay(ang, w, ox, oy) {
    const W = this.W, lv = W.lv;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let wallT = w.range, hitKind = 'none';
    const wins = [];
    HC.phys.dda(ox, oy, dx, dy, w.range, (tx, ty, t) => {
      if (!lv.inb(tx, ty)) { wallT = t; hitKind = 'wall'; return true; }
      const i = lv.idx(tx, ty);
      const win = lv.windows.get(i);
      if (win && !win.broken) wins.push({ win, t: t + 0.45 });
      if (lv.opaque[i] && t > 0) {
        wallT = t + 0.4; hitKind = 'wall';
        const d = lv.doors.get(i);
        if (d && !d.open && !d.broken && (d.barricade || !d.lock) && !d.shutter) HC.game.damageDoor(d, w.dmg * 0.5, false);
        return true;
      }
      return false;
    });
    // mobs along the ray
    const hits = [];
    for (const m of W.mobs) {
      if (m.dead || m.dying) continue;
      const rx = m.x - ox, ry = m.y - oy;
      const tc = rx * dx + ry * dy;
      if (tc < 0 || tc > wallT) continue;
      const px = rx - tc * dx, py = ry - tc * dy;
      const rr = m.r + 0.08;
      if (px * px + py * py < rr * rr) hits.push({ m, t: tc - Math.sqrt(rr * rr - px * px - py * py) });
    }
    hits.sort((a, b) => a.t - b.t);
    let endT = wallT, hitMob = false;
    const pierce = (w.pierce || 0) + 1;
    for (let k = 0; k < Math.min(pierce, hits.length); k++) {
      const h = hits[k];
      const crit = Math.random() < 0.12;
      const dmg = w.dmg * HC.R.range(0.85, 1.15) * (crit ? 2.2 : 1) * (h.t > w.range * 0.6 ? 0.8 : 1);
      h.m.hurt(dmg, this.x, this.y, 'bullet', { knock: w.knock, crit, down: w.down });
      endT = h.t; hitMob = true;
    }
    for (const wi of wins) if (wi.t < endT) HC.game.breakWindow(wi.win);
    const ex = ox + dx * endT, ey = oy + dy * endT;
    HC.parts.add({ type: 'tracer', x: ox, y: oy, x2: ex, y2: ey, z: 1.0, life: 0.07 });
    if (!hitMob && hitKind === 'wall') { HC.parts.sparks(ex - dx * 0.1, ey - dy * 0.1, 0.9 + Math.random() * 0.4, 5); if (Math.random() < 0.3) HC.audio.play('ricochet', { x: ex, y: ey, vol: 0.5 }); }
  }
  meleeHit() {
    const W = this.W, w = this.weapon;
    let any = false;
    for (const m of W.mobs) {
      if (m.dead || m.dying) continue;
      const d = HC.dist(this.x, this.y, m.x, m.y);
      if (d > w.range + m.r) continue;
      const a = Math.atan2(m.y - this.y, m.x - this.x);
      if (Math.abs(HC.angDiff(this.face, a)) > w.arc / 2 && d > 0.55) continue;
      if (!HC.phys.los(W.lv, this.x, this.y, m.x, m.y)) continue;
      const killed = m.hurt(w.dmg * HC.R.range(0.85, 1.15), this.x, this.y, 'melee', { knock: w.knock, down: w.down });
      any = true;
      if (killed) { HC.game.hitStop(0.05); if (Math.random() < 0.08) this.bark('kill'); }
      if (w.dur) {
        this.dur[this.cur]--;
        if (this.dur[this.cur] <= 0) {
          HC.game.msg(`Your ${w.name.toLowerCase()} broke!`, 'bad');
          HC.audio.play('thud', { vol: 0.6 });
          this.weapons[this.cur] = 0; this.dur[this.cur] = HC.WEAPONS[this.cur].dur;
          this.cur = this.weapons.axe ? 'axe' : this.weapons.bat ? 'bat' : 'fists';
          break;
        }
      }
    }
    if (!any) {
      // bash doors / windows / barricades in front of us
      const fx = this.x + Math.cos(this.face) * 0.9, fy = this.y + Math.sin(this.face) * 0.9;
      const lv = W.lv, i = lv.idx(fx | 0, fy | 0);
      const d = lv.doors.get(i), win = lv.windows.get(i);
      if (d && !d.open && !d.broken && !d.lock && !d.shutter) { HC.game.damageDoor(d, w.dmg * 0.9, true); any = true; }
      else if (win && !win.broken) { HC.game.breakWindow(win); any = true; }
      else if (lv.opaque[i]) { HC.audio.play('thud', { x: fx, y: fy, vol: 0.5 }); any = true; }
    }
    if (any) { HC.game.shake(0.15); HC.game.noise(this.x, this.y, w.noise + 2); }
  }
  startReload() {
    const w = this.weapon;
    if (w.melee || this.reloadT >= 0 || this.mags[this.cur] >= w.mag || this.ammo[w.ammo] <= 0) return;
    this.reloadT = 0; this.swingT = -1;
    HC.audio.play('magout', { x: this.x, y: this.y });
  }
  finishReload() {
    const w = this.weapon;
    const need = w.mag - this.mags[this.cur], got = Math.min(need, this.ammo[w.ammo]);
    this.mags[this.cur] += got; this.ammo[w.ammo] -= got; this.reloadT = -1;
    HC.audio.play('magin', { x: this.x, y: this.y });
    if (w.pump) setTimeout(() => HC.audio.play('pump', { vol: 0.6 }), 120);
  }
  startUse(kind) {
    if (this.inv[kind] <= 0) { HC.game.msg(kind === 'bandage' ? 'No bandages.' : 'No MX-7.', 'warn'); return; }
    if (kind === 'bandage' && this.bleed === 0 && this.hp >= 100) { HC.game.msg('You don\'t need a bandage.'); return; }
    if (kind === 'antiviral' && this.infection === null) { HC.game.msg('You aren\'t infected. Save it.'); return; }
    this.useT = 0; this.useKind = kind; this.reloadT = -1;
    HC.audio.play(kind === 'bandage' ? 'squish' : 'click', { vol: 0.5 });
  }
  finishUse() {
    const k = this.useKind; this.useT = -1;
    this.inv[k]--;
    if (k === 'bandage') { this.bleed = 0; this.hp = Math.min(100, this.hp + 6); this.bark('heal', 0.5); HC.audio.play('pickupHealth'); }
    else { this.infection = null; this.hp = Math.min(100, this.hp + 10); this.bark('cured'); HC.audio.play('pickupHealth'); HC.game.msg('The fever recedes. For now.', 'good'); }
  }
  throwMolotov(mw) {
    if (this.inv.molotov <= 0) { HC.game.msg('No molotovs.', 'warn'); return; }
    if (this.fireCd > 0) return;
    this.inv.molotov--; this.fireCd = 0.6; this.swingT = 0; this.swingHit = true;
    HC.fx.throwMolotov(this.W, this.x, this.y, mw.x, mw.y);
  }
  // ------------------------------------------------------------ pickups
  tryPickup(it) {
    const D = HC.PICKUPS[it.type];
    if (!D || D.note) return false;
    let took = false, msg = '';
    if (D.key) {
      this.keys[D.key] = true; took = true;
      const nm = (this.W.lv.def.keys && this.W.lv.def.keys[D.key]) || `${D.key} key`;
      msg = `Picked up the ${nm}.`; HC.audio.play('pickupKey'); this.bark('key', 0.5); this.grinT = 1;
    } else if (D.weapon) {
      const had = this.weapons[D.weapon];
      if (!had) { this.weapons[D.weapon] = 1; took = true; this.grinT = 1.6; this.bark('weapon', 0.6); if (HC.WEAPONS[D.weapon].melee) this.dur[D.weapon] = HC.WEAPONS[D.weapon].dur; }
      else if (HC.WEAPONS[D.weapon].melee && this.dur[D.weapon] < HC.WEAPONS[D.weapon].dur) { this.dur[D.weapon] = HC.WEAPONS[D.weapon].dur; took = true; }
      if (D.ammo && this.ammo[D.ammo] < HC.AMMO_MAX[D.ammo]) { this.ammo[D.ammo] = Math.min(HC.AMMO_MAX[D.ammo], this.ammo[D.ammo] + D.n); took = true; }
      if (took) { msg = `You got ${D.name}`; HC.audio.play('pickupWeapon'); if (!had && (HC.WEAPONS[D.weapon].slot > HC.WEAPONS[this.cur].slot || this.weapon.melee)) this.switchTo(D.weapon); }
    } else if (D.ammo) {
      if (this.ammo[D.ammo] < HC.AMMO_MAX[D.ammo]) { this.ammo[D.ammo] = Math.min(HC.AMMO_MAX[D.ammo], this.ammo[D.ammo] + Math.round(D.n * HC.game.skill.ammo)); took = true; msg = `Picked up ${D.name}.`; HC.audio.play('pickup'); }
    } else if (D.hp) {
      if (this.hp < 100) { this.hp = Math.min(100, this.hp + D.hp); took = true; msg = `Picked up ${D.name}.`; HC.audio.play(D.snd); }
    } else if (D.inv) {
      if (this.inv[D.inv] < D.max) { this.inv[D.inv]++; took = true; msg = `Picked up ${D.name}.`; HC.audio.play('pickup'); }
    } else if (D.armor) {
      if (this.armor < D.armor) { this.armor = D.armor; took = true; msg = `Picked up ${D.name}.`; HC.audio.play('pickupWeapon'); }
    }
    if (took) HC.game.msg(msg, 'pick');
    return took;
  }
  // ------------------------------------------------------------ moodles
  moodles() {
    const m = [];
    if (this.bleed > 0) m.push({ id: 'bleed', lvl: this.bleed + 1, name: this.bleed > 1 ? 'Bleeding Heavily' : 'Bleeding' });
    if (this.hp < 70) m.push({ id: 'pain', lvl: this.hp < 20 ? 4 : this.hp < 40 ? 3 : 2, name: this.hp < 20 ? 'Agony' : this.hp < 40 ? 'Severe Pain' : 'Pain' });
    if (this.panic > 0.25) m.push({ id: 'panic', lvl: this.panic > 0.8 ? 4 : this.panic > 0.55 ? 3 : 2, name: this.panic > 0.8 ? 'Extreme Panic' : this.panic > 0.55 ? 'Panic' : 'Anxious' });
    if (this.endurance < 0.6) m.push({ id: 'tired', lvl: this.endurance < 0.12 ? 4 : this.endurance < 0.3 ? 3 : 2, name: this.endurance < 0.12 ? 'Exhausted' : this.endurance < 0.3 ? 'Winded' : 'Short of Breath' });
    if (this.infection !== null && this.infection > 0.08) m.push({ id: 'sick', lvl: this.infection > 0.8 ? 4 : this.infection > 0.55 ? 3 : 2, name: this.infection > 0.8 ? 'Fever' : this.infection > 0.55 ? 'Nauseous' : 'Queasy' });
    if (this.grinT > 0) m.push({ id: 'happy', lvl: 1, good: true, name: 'Relieved' });
    return m;
  }
  drawSpec() {
    const w = this.cur;
    return {
      x: this.x, y: this.y, face: this.face, walk: this.walk, moveAmt: HC.clamp(this.moveAmt, 0, 1), look: this.lookSpec,
      weapon: this.useT >= 0 ? null : w, aiming: this.aiming || (!this.weapon.melee && this.fireCd > -0.4),
      recoil: this.recoil, swingT: this.swingT, fall: this.fall, fallDir: 1, dead: this.dead,
      flash: this.hurtT > 0.3 ? (this.hurtT - 0.3) * 3 : 0,
    };
  }
};
