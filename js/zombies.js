// Hollow County — zombies: types, perception (sight cone + hearing), flow-field pursuit, door bashing, attacks, deaths.
'use strict';
HC.ZTYPES = {
  shambler: { hp: 55, speed: 0.8, dmg: 9, sight: 11, windup: 0.5, cd: 1.2, knock: 1, pitch: 1 },
  sprinter: { hp: 45, speed: 3.25, dmg: 8, sight: 13, windup: 0.34, cd: 0.9, knock: 1, pitch: 1.25, turn: 9 },
  crawler: { hp: 32, speed: 0.42, dmg: 7, sight: 6, windup: 0.5, cd: 1.3, crawl: true, knock: 0.4, pitch: 0.9 },
  fat: { hp: 150, speed: 0.62, dmg: 14, sight: 10, windup: 0.6, cd: 1.4, bulk: 1.3, knock: 0.45, pitch: 0.7 },
  soldier: { hp: 110, speed: 0.95, dmg: 11, sight: 12, windup: 0.45, cd: 1.1, armor: 0.6, outfit: 'soldier', knock: 0.7, pitch: 0.95 },
  juggernaut: { hp: 1400, speed: 1.35, dmg: 26, sight: 16, windup: 0.75, cd: 1.5, armor: 0.72, outfit: 'eod', noDown: true, boss: true, knock: 0.08, radius: 0.44, pitch: 0.55, turn: 3 },
};

// ------------------------------------------------------------------ flow field toward a target tile
HC.flow = (function () {
  const F = {};
  F.cost = function (lv, i) {
    if (lv.voidT[i]) return 0;
    const fl = HC.gfx.FLOORS[lv.floor[i]]; if (fl && fl.water) return 0;
    if (lv.propAt[i] >= 0 && lv.props[lv.propAt[i]].blocks) return 0;
    if (lv._treeSet && lv._treeSet.has(i)) return 0;
    const k = lv.wk[i];
    if (!k) return 1;
    const d = lv.doors.get(i);
    if (d) { if (d.open || d.broken) return 1; if (d.lock || d.shutter) return 0; return d.barricade ? 12 : 6; }
    const w = lv.windows.get(i);
    if (w) return w.broken ? 3 : 8;
    const s = lv.secretWalls.get(i);
    if (s && s.open) return 1;
    return 0;
  };
  // Dijkstra with small integer costs (bucket queue)
  F.build = function (lv, tx, ty, maxD) {
    const N = lv.N, dist = new Float32Array(N).fill(Infinity);
    if (!lv.inb(tx, ty)) return dist;
    const start = lv.idx(tx, ty);
    dist[start] = 0;
    const buckets = [[start]];
    const MAX = maxD || 220;
    for (let d = 0; d < buckets.length && d <= MAX; d++) {
      const b = buckets[d]; if (!b) continue;
      for (let q = 0; q < b.length; q++) {
        const i = b[q];
        if (dist[i] < d) continue;
        const x = i % lv.W, y = (i / lv.W) | 0;
        for (let k = 0; k < 4; k++) {
          const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= lv.W || ny >= lv.H) continue;
          const j = ny * lv.W + nx;
          const c = F.cost(lv, j);
          if (!c) continue;
          const nd = d + c;
          if (nd < dist[j]) { dist[j] = nd; (buckets[nd] = buckets[nd] || []).push(j); }
        }
      }
    }
    return dist;
  };
  return F;
})();

// ------------------------------------------------------------------ zombie
HC.Zombie = class {
  constructor(W, spec, opts) {
    const T = HC.ZTYPES[spec.type] || HC.ZTYPES.shambler;
    this.W = W; this.type = spec.type; this.T = T;
    this.x = spec.x + (HC.R() - 0.5) * 0.3; this.y = spec.y + (HC.R() - 0.5) * 0.3;
    this.vx = 0; this.vy = 0; this.face = HC.R() * Math.PI * 2;
    const sk = HC.game.skill;
    this.hp = this.maxHp = T.hp * (sk.hp || 1);
    this.speed = T.speed * HC.R.range(0.85, 1.15) * (sk.zspeed || 1);
    this.r = T.radius || 0.28 * (T.bulk || 1);
    this.state = 'idle'; this.stateT = 0;
    const set = spec.outfit || T.outfit || HC.game.pickOutfit();
    this.look = HC.rig.makeZombieLook(set, HC.R);
    if (T.bulk) this.look.bulk = T.bulk;
    if (T.boss) { this.look.bulk = 1.55; this.look.visor = true; }
    this.walk = HC.R() * 6; this.moveAmt = 0; this.alpha = 0;
    this.flash = 0; this.burnT = 0; this.stagger = 0; this.fall = T.crawl ? 1 : 0; this.fallDir = T.crawl ? -1 : 1;
    this.downT = 0; this.getUpT = 0; this.atkT = -1; this.cd = 0; this.groanT = HC.R.range(1, 8); this.percT = HC.R() * 0.3;
    this.lastSeenT = -99; this.lx = this.x; this.ly = this.y; this.target = null; this.bashT = 0; this.stuckT = 0;
    this.drop = spec.drop || null; this.dead = false; this.dying = false; this.eatT = 0;
    this.wanderT = HC.R.range(2, 8);
    if (opts && opts.aware) { this.alert(W.player.x, W.player.y, true); }
    if (opts && opts.investigate) { this.state = 'investigate'; this.target = { x: W.player.x, y: W.player.y }; this.stateT = 0; }
  }
  get boss() { return !!this.T.boss; }
  alert(x, y, sees) {
    if (this.dying || this.dead) return;
    if (sees) { this.state = 'chase'; this.lx = x; this.ly = y; this.lastSeenT = this.W.time; }
    else if (this.state !== 'chase') { this.state = 'investigate'; this.target = { x, y }; this.stateT = 0; }
  }
  ignite(t) { if (this.dead || this.dying) return; if (this.burnT <= 0) HC.audio.play('whoomp', { x: this.x, y: this.y, vol: 0.4 }); this.burnT = Math.max(this.burnT, t); }
  hurt(dmg, sx, sy, kind, o) {
    if (this.dead || this.dying) return false;
    o = o || {};
    let d = dmg;
    if (this.T.armor && kind === 'bullet') d *= this.T.armor;
    if (this.T.boss && kind === 'melee') d *= 0.8;
    if (this.T.boss && kind === 'fire') d *= 1.6;
    if (this.state === 'down' && kind === 'melee') d *= 2;
    this.hp -= d;
    this.flash = 1;
    const dx = this.x - sx, dy = this.y - sy, L = Math.hypot(dx, dy) || 1;
    if (kind !== 'fire') {
      HC.parts.blood(this.x, this.y, this.fall > 0.5 ? 0.2 : 0.9, dx, dy, kind === 'melee' ? 7 : 4 + (o.crit ? 6 : 0), o.crit ? 1.6 : 1);
      if (Math.random() < 0.5) HC.decals.blood(this.x + dx / L * 0.4, this.y + dy / L * 0.4, 0.8);
      HC.audio.play(kind === 'melee' ? 'hit' : 'squish', { x: this.x, y: this.y });
    }
    const kb = (o.knock || 0) * (this.T.knock || 1);
    this.vx += (dx / L) * kb; this.vy += (dy / L) * kb;
    if (kind !== 'fire' && !this.T.noDown) this.stagger = Math.max(this.stagger, kind === 'melee' ? 0.4 : 0.22);
    if (this.T.boss && kind === 'melee' && (o.knock || 0) > 1.5) this.stagger = 0.25;
    if (o.down && !this.T.noDown && !this.T.crawl && this.state !== 'down' && Math.random() < o.down) { this.state = 'down'; this.downT = HC.R.range(1.6, 2.8); this.fallDir = 1; this.face = Math.atan2(-dy, -dx); }
    if (this.state !== 'down') this.alert(this.W.player.x, this.W.player.y, true);
    if (this.hp <= 0) { this.die(kind, dx / L, dy / L); return true; }
    return false;
  }
  die(kind, dx, dy) {
    this.dying = true; this.state = 'dying';
    if (!this.T.crawl) { this.face = Math.atan2(-(dy || 0), -(dx || 0)) + (Math.random() - 0.5) * 0.6; this.fallDir = 1; }
    this.burnt = kind === 'fire' || this.burnT > 0;
    HC.audio.play('zdie', { x: this.x, y: this.y, pitch: this.T.pitch });
    HC.game.onKill(this, kind);
    if (this.T.boss) { HC.audio.play('thud', { x: this.x, y: this.y, vol: 1.5 }); HC.game.shake(0.8); }
    if (this.drop) HC.game.spawnItem(this.drop, this.x, this.y);
  }
  update(dt) {
    const W = this.W, lv = W.lv, p = W.player;
    if (this.dead) return;
    this.flash = Math.max(0, this.flash - dt * 6);
    if (this.bashAnim > 0) this.bashAnim -= dt;
    this.stateT += dt;
    if (this.dying) {
      this.fall = Math.min(1, this.fall + dt * (this.T.crawl ? 3 : 2.3));
      this.vx *= 0.85; this.vy *= 0.85;
      HC.phys.move(lv, this, this.vx * dt, this.vy * dt, this.r * 0.6, true);
      if (this.fall >= 1 && this.stateT > 0.55) { this.dead = true; HC.decals.corpse(this.drawSpec()); }
      return;
    }
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.hp -= 10 * dt;
      if (Math.random() < dt * 8) HC.parts.add({ type: 'flame', x: this.x + (Math.random() - 0.5) * 0.3, y: this.y + (Math.random() - 0.5) * 0.3, z: 0.4 + Math.random() * 0.8, vx: 0, vy: 0, vz: 1.4, life: 0.45, size: 7 });
      if (this.hp <= 0) { this.die('fire'); return; }
    }
    // knockback
    if (Math.abs(this.vx) + Math.abs(this.vy) > 0.01) {
      HC.phys.move(lv, this, this.vx * dt, this.vy * dt, this.r, true);
      const f = Math.exp(-dt * 7); this.vx *= f; this.vy *= f;
    }
    if (this.stagger > 0) { this.stagger = Math.max(0, this.stagger - dt); this.atkT = -1; this.moveAmt *= 0.9; return; }
    // knocked down → get up
    if (this.state === 'down') {
      this.downT -= dt;
      this.fall = Math.min(1, this.fall + dt * 4);
      if (this.downT <= 0) { this.state = 'getup'; }
      return;
    }
    if (this.state === 'getup') {
      this.fall = Math.max(0, this.fall - dt * 1.8);
      if (this.fall <= 0) { this.state = 'chase'; this.lastSeenT = W.time; this.lx = p.x; this.ly = p.y; }
      return;
    }
    const dP = HC.dist(this.x, this.y, p.x, p.y);
    // far & idle: sleep a bit
    if (dP > 30 && this.state === 'idle' && !W.ghost) { this.percT -= dt; if (this.percT > 0) return; this.percT = 0.5; }
    // ---- perception
    this.percT -= dt;
    if (this.percT <= 0) {
      this.percT = 0.18 + Math.random() * 0.1;
      if (!p.dead) {
        let sight = this.T.sight * W.visMul;
        if (p.flashlight && W.dark) {
          const ang = Math.atan2(this.y - p.y, this.x - p.x);
          if (Math.abs(HC.angDiff(p.face, ang)) < 0.55) sight = Math.max(sight, this.T.sight * 1.35);
        }
        if (p.crouch) sight *= 0.6;
        const toP = Math.atan2(p.y - this.y, p.x - this.x);
        const inCone = Math.abs(HC.angDiff(this.face, toP)) < 1.4 || this.state === 'chase';
        if (dP < sight && (inCone || dP < 2.4) && HC.phys.los(lv, this.x, this.y, p.x, p.y)) {
          if (this.state !== 'chase' && this.state !== 'attack') { if (Math.random() < 0.7) HC.audio.play('groan', { x: this.x, y: this.y, pitch: this.T.pitch, muffle: false }); HC.game.onZombieSpotted(this); }
          this.state = this.state === 'attack' ? 'attack' : 'chase';
          this.lx = p.x; this.ly = p.y; this.lastSeenT = W.time;
          this.seesPlayer = true;
        } else this.seesPlayer = false;
      } else if (this.state === 'chase' || this.state === 'attack') {
        this.state = 'eat'; this.target = { x: p.x, y: p.y };
      }
      if (this.state === 'chase' && W.time - this.lastSeenT > 7) { this.state = 'investigate'; this.target = { x: this.lx, y: this.ly }; this.stateT = 0; }
      if (this.state !== 'chase' && this.state !== 'attack' && this.state !== 'eat') {
        for (const n of W.noises) {
          if (n.t > 0.35) continue;
          const d = HC.dist(this.x, this.y, n.x, n.y);
          if (d < n.r) { this.state = 'investigate'; this.target = { x: n.x + (Math.random() - 0.5) * 2, y: n.y + (Math.random() - 0.5) * 2 }; this.stateT = 0; }
        }
      }
    }
    // ---- groans
    this.groanT -= dt;
    if (this.groanT <= 0) {
      const chasing = this.state === 'chase';
      this.groanT = chasing ? HC.R.range(2, 5) : HC.R.range(5, 14);
      if (dP < 22) HC.audio.play('groan', { x: this.x, y: this.y, pitch: this.T.pitch, vol: chasing ? 0.7 : 0.45, muffle: !HC.phys.los(lv, this.x, this.y, p.x, p.y) });
    }
    // ---- behaviour
    let mx = 0, my = 0, spd = 0;
    this.cd -= dt;
    if (this.atkT >= 0) {
      this.atkT += dt / this.T.windup;
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.face += HC.angDiff(this.face, ang) * Math.min(1, dt * 6);
      if (this.atkT >= 1) {
        this.atkT = -1; this.cd = this.T.cd;
        if (!p.dead && dP < 0.95 + this.r && Math.abs(HC.angDiff(this.face, ang)) < 1.1) p.hurt(this.T.dmg, this);
        else HC.audio.play('swing', { x: this.x, y: this.y, vol: 0.5 });
      }
    } else if (this.state === 'chase') {
      if (!p.dead && dP < 0.78 + this.r && this.cd <= 0) {
        this.atkT = 0; HC.audio.play('zattack', { x: this.x, y: this.y, pitch: this.T.pitch });
      } else {
        spd = this.speed;
        const direct = this.seesPlayer && dP < 9;
        let tx = this.lx, ty = this.ly;
        if (!direct) {
          const step = this.flowStep();
          if (step) { tx = step.x; ty = step.y; if (step.bash) { this.bash(step, dt); spd = 0; } }
        } else { tx = p.x; ty = p.y; }
        mx = tx - this.x; my = ty - this.y;
      }
    } else if (this.state === 'investigate' && this.target) {
      mx = this.target.x - this.x; my = this.target.y - this.y;
      spd = this.speed * 0.8;
      if (Math.hypot(mx, my) < 0.6 || this.stateT > 12) { this.state = 'idle'; this.target = null; }
    } else if (this.state === 'eat' && this.target) {
      mx = this.target.x - this.x; my = this.target.y - this.y;
      if (Math.hypot(mx, my) < 0.75) { mx = my = 0; this.eatT += dt; } else spd = this.speed * 0.9;
    } else if (this.state === 'idle') {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = HC.R.range(3, 9);
        if (Math.random() < 0.55) { const a = Math.random() * 6.28, d = HC.R.range(1.5, 4); this.target = { x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d }; }
        else this.target = null;
      }
      if (this.target) { mx = this.target.x - this.x; my = this.target.y - this.y; spd = this.speed * 0.4; if (Math.hypot(mx, my) < 0.4) this.target = null; }
    }
    // separation
    let sx = 0, sy = 0;
    const near = W.mobGrid.near(this.x, this.y);
    for (const o of near) {
      if (o === this || o.dead || o.dying) continue;
      const dx = this.x - o.x, dy = this.y - o.y, d2 = dx * dx + dy * dy, rr = this.r + o.r;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); sx += (dx / d) * (rr - d); sy += (dy / d) * (rr - d); }
    }
    // move
    const L = Math.hypot(mx, my);
    let moving = 0;
    if (spd > 0 && L > 0.05) {
      const ux = mx / L, uy = my / L;
      const ang = Math.atan2(uy, ux);
      this.face += HC.angDiff(this.face, ang) * Math.min(1, dt * (this.T.turn || 5));
      const fx = Math.cos(this.face), fy = Math.sin(this.face);
      const fwd = Math.max(0.25, fx * ux + fy * uy);
      const ox = this.x, oy = this.y;
      HC.phys.move(lv, this, (fx * spd * fwd + sx * 3) * dt, (fy * spd * fwd + sy * 3) * dt, this.r, true);
      moving = Math.hypot(this.x - ox, this.y - oy) / dt;
      if (moving < spd * 0.2 && this.state !== 'idle') { this.stuckT += dt; if (this.stuckT > 1.5) { this.stuckT = 0; this.nudge(); } } else this.stuckT = 0;
    } else if (sx || sy) {
      HC.phys.move(lv, this, sx * 3 * dt, sy * 3 * dt, this.r, true);
    }
    this.moveAmt = HC.damp(this.moveAmt, HC.clamp(moving / Math.max(0.6, this.speed), 0, 1), 8, dt);
    this.walk += dt * (this.T.crawl ? 3 : 2.2 + moving * 2.2);
  }
  nudge() { const a = Math.random() * 6.28; this.vx += Math.cos(a) * 1.2; this.vy += Math.sin(a) * 1.2; }
  // choose next waypoint by descending the flow field (8-neighbourhood)
  flowStep() {
    const W = this.W, lv = W.lv, fd = W.flowDist;
    if (!fd) return null;
    const tx = Math.floor(this.x), ty = Math.floor(this.y);
    if (!lv.inb(tx, ty)) return null;
    const here = fd[lv.idx(tx, ty)];
    let best = here, bx = -1, by = -1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = tx + dx, ny = ty + dy;
      if (!lv.inb(nx, ny)) continue;
      if (dx && dy) { // diagonal only when both orthogonals are open floor
        if (HC.flow.cost(lv, lv.idx(nx, ty)) !== 1 || HC.flow.cost(lv, lv.idx(tx, ny)) !== 1) continue;
      }
      const v = fd[lv.idx(nx, ny)] + (dx && dy ? 0.4 : 0);
      if (v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return here === Infinity ? null : { x: W.player.x, y: W.player.y };
    const j = lv.idx(bx, by);
    const d = lv.doors.get(j), w = lv.windows.get(j);
    if ((d && !d.open && !d.broken) || (w && !w.broken)) {
      const cx = bx + 0.5, cy = by + 0.5;
      if (HC.dist(this.x, this.y, cx, cy) < 1.05) return { x: cx, y: cy, bash: d || w, isDoor: !!d };
    }
    return { x: bx + 0.5, y: by + 0.5 };
  }
  bash(step, dt) {
    const t = step.bash;
    this.face += HC.angDiff(this.face, Math.atan2(step.y - this.y, step.x - this.x)) * Math.min(1, dt * 5);
    this.bashT -= dt;
    if (this.bashT <= 0) {
      this.bashT = 1.1 + Math.random() * 0.4;
      this.bashAnim = 0.35;
      if (step.isDoor) {
        t.hp -= this.T.dmg * (this.T.boss ? 6 : 1.4);
        HC.audio.play('thud', { x: step.x, y: step.y, vol: 0.9 });
        HC.game.noise(step.x, step.y, 7);
        if (t.hp <= 0) HC.game.breakDoor(t);
      } else {
        t.hp -= 1;
        HC.audio.play('thud', { x: step.x, y: step.y, vol: 0.5 });
        if (t.hp <= 0) HC.game.breakWindow(t);
      }
    }
  }
  drawSpec() {
    let pose = null, t = 0;
    if (this.atkT >= 0) { pose = 'lunge'; t = this.atkT; }
    else if (this.bashAnim > 0) { pose = 'lunge'; t = 1 - this.bashAnim / 0.35; }
    else if (this.state === 'eat' && this.eatT > 0) { pose = 'eat'; t = this.eatT; }
    return {
      x: this.x, y: this.y, face: this.face, walk: this.walk, moveAmt: this.moveAmt, zombie: true, look: this.look,
      pose, t, fall: this.fall, fallDir: this.fallDir, flash: this.flash, burn: this.burnT > 0 ? 0.6 : this.burnt ? 1 : 0,
      stagger: this.stagger, chasing: this.state === 'chase' || this.state === 'attack', dead: this.dead || this.dying, burnt: this.burnt, scale: this.T.boss ? 1.3 : 1,
    };
  }
};

// spatial hash for separation / hit queries
HC.MobGrid = class {
  constructor(W, H) { this.W = W; this.H = H; this.cells = new Map(); }
  rebuild(mobs) {
    this.cells.clear();
    for (const m of mobs) {
      if (m.dead) continue;
      const k = ((m.y | 0) >> 1) * 4096 + ((m.x | 0) >> 1);
      let c = this.cells.get(k); if (!c) { c = []; this.cells.set(k, c); } c.push(m);
    }
  }
  near(x, y) {
    const out = [];
    const cx = (x | 0) >> 1, cy = (y | 0) >> 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = this.cells.get((cy + dy) * 4096 + (cx + dx)); if (c) for (const m of c) out.push(m); }
    return out;
  }
};
