// Hollow County — shared world systems: collision, raycasts, noise, decals, particles, pickups, fire, molotovs, helicopter.
'use strict';

// ------------------------------------------------------------------ physics / collision
HC.phys = (function () {
  const P = {};
  const WK = HC.level.WK;
  // collision connectivity: arms reach towards any solid neighbour so thin walls never leave gaps
  P.prepare = function (lv) {
    lv.cconn = new Uint8Array(lv.N);
    const solidish = (x, y) => {
      if (!lv.inb(x, y)) return true;
      const j = lv.idx(x, y);
      if (lv.voidT[j] || lv.wk[j]) return true;
      if (lv.propAt[j] >= 0 && lv.props[lv.propAt[j]].blocks) return true;
      return false;
    };
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const i = lv.idx(x, y);
      if (!lv.wk[i]) continue;
      let m = 0;
      if (solidish(x, y - 1)) m |= 1; if (solidish(x + 1, y)) m |= 2; if (solidish(x, y + 1)) m |= 4; if (solidish(x - 1, y)) m |= 8;
      if (lv.doors.has(i) || lv.windows.has(i)) { const o = (lv.doors.get(i) || lv.windows.get(i)).alongX; m = o ? 10 : 5; }
      lv.cconn[i] = m;
    }
  };
  function wallThick(k) { return k === WK.hedge || k === WK.sandbag ? 0.7 : k === WK.fence || k === WK.woodfence ? 0.32 : 0.44; }
  const out = [];
  P.tileBoxes = function (lv, tx, ty, zombie) {
    out.length = 0;
    if (!lv.inb(tx, ty)) { out.push([tx, ty, tx + 1, ty + 1]); return out; }
    const i = lv.idx(tx, ty);
    if (lv.voidT[i] || (HC.gfx.FLOORS[lv.floor[i]] && HC.gfx.FLOORS[lv.floor[i]].water)) { out.push([tx, ty, tx + 1, ty + 1]); return out; }
    if (lv._treeSet && lv._treeSet.has(i)) { out.push([tx + 0.34, ty + 0.34, tx + 0.66, ty + 0.66]); return out; }
    const pi = lv.propAt[i];
    if (pi >= 0 && lv.props[pi].blocks) {
      const p = lv.props[pi];
      if (p.type === 'streetlamp') out.push([tx + 0.38, ty + 0.38, tx + 0.62, ty + 0.62]);
      else if (p.type === 'trash' || p.type === 'cone' || p.type === 'barrel') out.push([tx + 0.22, ty + 0.22, tx + 0.78, ty + 0.78]);
      else out.push([Math.max(tx + 0.04, p.x + 0.06), Math.max(ty + 0.04, p.y + 0.06), Math.min(tx + 0.96, p.x + p.w - 0.06), Math.min(ty + 0.96, p.y + p.d - 0.06)]);
      return out;
    }
    const k = lv.wk[i];
    if (!k) return out;
    const d = lv.doors.get(i);
    if (d && (d.open || d.broken)) return out;
    const w = lv.windows.get(i);
    if (w && zombie && w.broken) return out;
    const sw = lv.secretWalls.get(i);
    if (sw && sw.open) return out;
    const th = wallThick(k) / 2, a = 0.5 - th, b = 0.5 + th;
    const m = lv.cconn[i];
    out.push([tx + a, ty + a, tx + b, ty + b]);
    if (m & 1) out.push([tx + a, ty, tx + b, ty + a]);
    if (m & 4) out.push([tx + a, ty + b, tx + b, ty + 1]);
    if (m & 8) out.push([tx, ty + a, tx + a, ty + b]);
    if (m & 2) out.push([tx + b, ty + a, tx + 1, ty + b]);
    return out;
  };
  // move a circle through the world, sliding along walls
  P.move = function (lv, e, dx, dy, r, zombie) {
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 0.15));
    const sx = dx / steps, sy = dy / steps;
    let blocked = false;
    for (let s = 0; s < steps; s++) {
      e.x += sx; e.y += sy;
      for (let it = 0; it < 2; it++) {
        const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
          const bs = P.tileBoxes(lv, tx, ty, zombie);
          for (const bx of bs) {
            const cx = HC.clamp(e.x, bx[0], bx[2]), cy = HC.clamp(e.y, bx[1], bx[3]);
            let ddx = e.x - cx, ddy = e.y - cy;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < r * r) {
              blocked = true;
              if (d2 > 1e-8) { const dd = Math.sqrt(d2); e.x += (ddx / dd) * (r - dd); e.y += (ddy / dd) * (r - dd); }
              else {
                // centre inside box: push out along the smallest axis
                const l = e.x - bx[0], rr = bx[2] - e.x, t = e.y - bx[1], bb = bx[3] - e.y;
                const mn = Math.min(l, rr, t, bb);
                if (mn === l) e.x = bx[0] - r; else if (mn === rr) e.x = bx[2] + r; else if (mn === t) e.y = bx[1] - r; else e.y = bx[3] + r;
              }
            }
          }
        }
      }
    }
    return blocked;
  };
  P.solidAt = function (lv, x, y, zombie) {
    const bs = P.tileBoxes(lv, Math.floor(x), Math.floor(y), zombie);
    for (const b of bs) if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return true;
    return false;
  };
  // grid DDA; cb(tx,ty,tEnter) returns true to stop. Returns stop distance or -1.
  P.dda = function (x0, y0, dx, dy, maxD, cb) {
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity, tDY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tMX = dx > 0 ? (tx + 1 - x0) * tDX : dx < 0 ? (x0 - tx) * tDX : Infinity;
    let tMY = dy > 0 ? (ty + 1 - y0) * tDY : dy < 0 ? (y0 - ty) * tDY : Infinity;
    let t = 0;
    for (let guard = 0; guard < 400 && t <= maxD; guard++) {
      if (cb(tx, ty, t)) return t;
      if (tMX < tMY) { t = tMX; tMX += tDX; tx += stepX; } else { t = tMY; tMY += tDY; ty += stepY; }
    }
    return -1;
  };
  P.los = function (lv, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    if (L < 0.01) return true;
    const hit = P.dda(x0, y0, dx / L, dy / L, L, (tx, ty, t) => {
      if (t === 0) return false;
      if (!lv.inb(tx, ty)) return true;
      return lv.opaque[lv.idx(tx, ty)] === 1 && t < L - 0.3;
    });
    return hit < 0;
  };
  return P;
})();

// ------------------------------------------------------------------ decals (baked onto a floor-level canvas)
HC.decals = (function () {
  const D = {};
  D.init = function (lv) {
    const w = (lv.W + lv.H) * HC.HW + 96, h = (lv.W + lv.H) * HC.HH + 96;
    D.canvas = HC.canvas(w, h);
    D.ctx = D.canvas.getContext('2d');
    D.ox = lv.H * HC.HW + 48; D.oy = 48;
    D.ctx.translate(D.ox, D.oy);
    D.ctx.lineCap = 'round';
    for (const d of lv.decals) {
      if (d.kind === 'corpse') D.corpse({ x: d.x, y: d.y, face: HC.R() * 6.28, zombie: true, dead: true, fall: 1, fallDir: 1, look: HC.rig.makeZombieLook('civ', HC.R) });
    }
    if (lv.def.helipad) D.helipad(lv.def.helipad.x, lv.def.helipad.y);
    // road grime / oil stains & scattered litter for lived-in streets
    const r = HC.rng(lv.W * 31 + lv.H);
    for (let n = 0; n < lv.N / 18; n++) {
      const x = r() * lv.W, y = r() * lv.H, i = lv.idx(x | 0, y | 0);
      if (lv.voidT[i] || lv.wk[i]) continue;
      const f = HC.gfx.FLOORS[lv.floor[i]];
      if (!f) continue;
      if (f.n === 'asphalt' || f.n === 'road' || f.n === 'parking') D.stain(x, y, r.range(0.3, 0.9), 'rgba(20,18,16,', r.range(0.12, 0.25));
      else if (f.indoor && r() < 0.5) D.litter(x, y, r);
      else if (r() < 0.25) D.litter(x, y, r);
    }
  };
  const P = (x, y) => [(x - y) * HC.HW, (x + y) * HC.HH];
  D.stain = function (x, y, rad, col, a) {
    const c = D.ctx, p = P(x, y);
    const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad * 40);
    g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)');
    c.save(); c.translate(p[0], p[1]); c.scale(1, 0.5); c.translate(-p[0], -p[1]);
    c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], rad * 40, 0, 7); c.fill(); c.restore();
  };
  D.litter = function (x, y, r) {
    const c = D.ctx, p = P(x, y);
    c.fillStyle = r.pick(['rgba(220,214,196,.55)', 'rgba(170,150,110,.5)', 'rgba(90,110,140,.45)', 'rgba(160,60,40,.4)']);
    c.save(); c.translate(p[0], p[1]); c.rotate(r() * 3); c.fillRect(-2.5, -1.5, r.range(3, 6), r.range(2, 4)); c.restore();
  };
  D.blood = function (x, y, size, dark) {
    if (!D.ctx) return;
    const c = D.ctx, p = P(x, y), s = (size || 1) * 7;
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const ox = (Math.random() - 0.5) * s * 1.6, oy = (Math.random() - 0.5) * s * 0.8;
      const rr = s * (0.25 + Math.random() * 0.5);
      c.fillStyle = dark ? `rgba(58,10,8,${0.5 + Math.random() * 0.3})` : `rgba(${110 + Math.random() * 30 | 0},14,10,${0.45 + Math.random() * 0.35})`;
      c.beginPath(); c.ellipse(p[0] + ox, p[1] + oy, rr, rr * 0.5, 0, 0, 7); c.fill();
    }
  };
  D.pool = function (x, y, size) {
    if (!D.ctx) return;
    const c = D.ctx, p = P(x, y);
    c.fillStyle = 'rgba(70,8,6,.55)';
    c.beginPath(); c.ellipse(p[0] + 4, p[1] + 1, size * 20, size * 10, 0, 0, 7); c.fill();
  };
  D.corpse = function (h) {
    if (!D.ctx) return;
    D.pool(h.x - Math.cos(h.face) * 0.5, h.y - Math.sin(h.face) * 0.5, 0.8);
    HC.rig.drawCorpse(D.ctx, Object.assign({}, h, { flash: 0, burn: h.burnt ? 1 : 0, dark: 0.92 }));
  };
  D.scorch = function (x, y, r) {
    D.stain(x, y, r, 'rgba(12,10,8,', 0.55);
  };
  D.helipad = function (x, y) {
    const c = D.ctx, p = P(x, y);
    c.save(); c.translate(p[0], p[1]); c.scale(1, 0.5); c.rotate(Math.PI / 4);
    c.strokeStyle = 'rgba(230,226,200,.75)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.stroke();
    c.fillStyle = 'rgba(230,226,200,.8)';
    c.fillRect(-46, -60, 18, 120); c.fillRect(28, -60, 18, 120); c.fillRect(-28, -9, 56, 18);
    c.restore();
  };
  return D;
})();

// ------------------------------------------------------------------ particles
HC.parts = (function () {
  const PT = { list: [] };
  const MAX = 700;
  PT.add = function (p) {
    if (PT.list.length > MAX) PT.list.shift();
    p.life = p.life || 1; p.t = 0; p.z = p.z || 0; p.vz = p.vz || 0;
    PT.list.push(p);
    return p;
  };
  PT.blood = function (x, y, z, dx, dy, n, force) {
    if (!HC.settings.gore) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const sp = (force || 1) * (0.8 + Math.random() * 2.2);
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.3;
      PT.add({ type: 'blood', x, y, z: z + (Math.random() - 0.5) * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: Math.random() * 2.5, life: 1.2, size: 1 + Math.random() * 1.5 });
    }
  };
  PT.sparks = function (x, y, z, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = 1 + Math.random() * 3;
      PT.add({ type: 'spark', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: Math.random() * 3, life: 0.25 + Math.random() * 0.25, col: col || [255, 210, 120] });
    }
    PT.add({ type: 'dust', x, y, z, vx: 0, vy: 0, vz: 0.4, life: 0.6, size: 6 });
  };
  PT.update = function (dt, lv) {
    const L = PT.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      if (p.type === 'tracer' || p.type === 'muzzle' || p.type === 'flashlight') continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'blood' || p.type === 'spark' || p.type === 'shell' || p.type === 'glass' || p.type === 'debris') {
        p.vz -= 9.8 * dt; p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          if (p.type === 'blood') { HC.decals.blood(p.x, p.y, p.size * 0.35); L.splice(i, 1); continue; }
          if (p.type === 'shell' || p.type === 'glass' || p.type === 'debris') { p.vz = -p.vz * 0.35; p.vx *= 0.5; p.vy *= 0.5; if (Math.abs(p.vz) < 0.4) { p.vz = 0; p.vx = p.vy = 0; } }
          else { L.splice(i, 1); continue; }
        }
      } else if (p.type === 'smoke' || p.type === 'dust' || p.type === 'flame' || p.type === 'ember') {
        p.z += p.vz * dt; p.vx *= 0.98; p.vy *= 0.98;
      }
    }
  };
  // world-space draw (after sorted pass). glow=true pass draws additive stuff after lighting.
  PT.draw = function (ctx, glow) {
    const now = performance.now() / 1000;
    for (const p of PT.list) {
      const k = p.t / p.life;
      const sx = (p.x - p.y) * HC.HW, sy = (p.x + p.y) * HC.HH - p.z * HC.ZP;
      if (!glow) {
        if (p.type === 'blood') { ctx.fillStyle = 'rgba(120,14,10,.9)'; ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size); }
        else if (p.type === 'smoke') { const r = p.size * (0.6 + k); ctx.fillStyle = `rgba(${p.col || '60,58,56'},${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
        else if (p.type === 'dust') { const r = p.size * (0.5 + k); ctx.fillStyle = `rgba(150,140,120,${0.3 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
        else if (p.type === 'shell') { ctx.fillStyle = '#c8a040'; ctx.fillRect(sx - 1, sy - 0.5, 2.2, 1.2); }
        else if (p.type === 'glass') { ctx.fillStyle = 'rgba(200,225,235,.8)'; ctx.fillRect(sx - 1, sy - 1, 2, 1.5); }
        else if (p.type === 'debris') { ctx.fillStyle = p.col || '#7a5a3a'; ctx.fillRect(sx - 1.5, sy - 1, 3, 2); }
      } else {
        if (p.type === 'spark') { ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${1 - k})`; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
        else if (p.type === 'muzzle') {
          const a = 1 - k;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size);
          g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(0.3, `rgba(255,200,90,${a * 0.8})`); g.addColorStop(1, 'rgba(255,120,30,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, 7); ctx.fill();
          ctx.strokeStyle = `rgba(255,230,160,${a})`; ctx.lineWidth = 2;
          const ex = ((p.x + p.dx * 0.5) - (p.y + p.dy * 0.5)) * HC.HW, ey = ((p.x + p.dx * 0.5) + (p.y + p.dy * 0.5)) * HC.HH - p.z * HC.ZP;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        } else if (p.type === 'tracer') {
          const a = 1 - k;
          const ex = (p.x2 - p.y2) * HC.HW, ey = (p.x2 + p.y2) * HC.HH - p.z * HC.ZP;
          const g = ctx.createLinearGradient(sx, sy, ex, ey);
          g.addColorStop(0, `rgba(255,220,150,0)`); g.addColorStop(0.7, `rgba(255,230,170,${0.55 * a})`); g.addColorStop(1, `rgba(255,250,220,${0.9 * a})`);
          ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        } else if (p.type === 'flame' || p.type === 'ember') {
          const r = p.size * (1 - k * 0.6);
          const flick = 0.8 + Math.sin(now * 30 + p.x * 10) * 0.2;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
          g.addColorStop(0, `rgba(255,236,160,${0.9 * (1 - k) * flick})`); g.addColorStop(0.45, `rgba(255,130,30,${0.6 * (1 - k)})`); g.addColorStop(1, 'rgba(200,40,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
        }
      }
    }
  };
  return PT;
})();

// ------------------------------------------------------------------ pickups
HC.PICKUPS = {
  ammo9: { name: 'a box of 9mm rounds', ammo: 'ammo9', n: 15 },
  shells: { name: 'a box of shotgun shells', ammo: 'shells', n: 6 },
  ammo556: { name: 'a 5.56mm magazine', ammo: 'ammo556', n: 30 },
  medkit: { name: 'a first aid kit', hp: 25, snd: 'pickupHealth' },
  pills: { name: 'painkillers', hp: 10, snd: 'pickupHealth' },
  bandage: { name: 'a bandage', inv: 'bandage', max: 9 },
  antiviral: { name: 'a dose of MX-7 antiviral', inv: 'antiviral', max: 5 },
  molotov: { name: 'a molotov cocktail', inv: 'molotov', max: 5 },
  jacket: { name: 'a leather jacket', armor: 50 },
  vest: { name: 'a police vest', armor: 100 },
  bat: { name: 'a baseball bat', weapon: 'bat' },
  axe: { name: 'a FIRE AXE!', weapon: 'axe' },
  pistol: { name: 'an M9 pistol', weapon: 'pistol', ammo: 'ammo9', n: 12 },
  shotgun: { name: 'a SHOTGUN!', weapon: 'shotgun', ammo: 'shells', n: 6 },
  rifle: { name: 'an M16 RIFLE!', weapon: 'rifle', ammo: 'ammo556', n: 30 },
  keyred: { key: 'red' }, keyblue: { key: 'blue' }, keyyellow: { key: 'yellow' },
  note: { note: 1 },
};

// ------------------------------------------------------------------ fires & projectiles & helicopter
HC.fx = (function () {
  const F = {};
  F.fire = function (W, x, y, r, life, perm) {
    const f = { x, y, r, life, t: 0, perm: !!perm, snd: 0 };
    W.fires.push(f);
    return f;
  };
  F.updateFires = function (W, dt) {
    for (let i = W.fires.length - 1; i >= 0; i--) {
      const f = W.fires[i];
      f.t += dt;
      const k = f.perm ? 1 : HC.clamp(1 - (f.t - f.life + 1.5) / 1.5, 0, 1) * HC.clamp(f.t * 3, 0, 1);
      if (!f.perm && f.t > f.life) { HC.decals.scorch(f.x, f.y, f.r * 1.2); W.fires.splice(i, 1); continue; }
      // emit flames
      const n = f.perm ? 1 : 2;
      for (let j = 0; j < n; j++) {
        if (Math.random() > 0.7 * k + 0.1) continue;
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * f.r * 0.85;
        HC.parts.add({ type: 'flame', x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, z: 0.05, vx: 0, vy: 0, vz: 1.2 + Math.random(), life: 0.5 + Math.random() * 0.4, size: 7 + Math.random() * 7 });
      }
      if (Math.random() < 0.08) HC.parts.add({ type: 'smoke', x: f.x, y: f.y, z: 0.8, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: 1, life: 2.5, size: 10, col: '40,38,36' });
      f.snd -= dt;
      if (f.snd <= 0) { f.snd = 0.3 + Math.random() * 0.4; HC.audio.play('crackle', { x: f.x, y: f.y, vol: f.perm ? 0.4 : 0.8 }); }
      // damage
      if (k > 0.3) {
        for (const m of W.mobs) {
          if (m.dead) continue;
          if (HC.dist(m.x, m.y, f.x, f.y) < f.r) m.ignite(6);
        }
        const p = W.player;
        if (p && !p.dead && HC.dist(p.x, p.y, f.x, f.y) < f.r * (f.perm ? 0.7 : 0.85)) p.burn(dt);
      }
    }
  };
  F.throwMolotov = function (W, x, y, tx, ty) {
    let dx = tx - x, dy = ty - y; const L = Math.hypot(dx, dy) || 1;
    const dist = Math.min(8.5, L); dx /= L; dy /= L;
    const T = 0.45 + dist * 0.06;
    W.projs.push({ kind: 'molotov', x: x + dx * 0.4, y: y + dy * 0.4, z: 1.1, vx: dx * dist / T, vy: dy * dist / T, vz: 0.5 * 9.8 * T - 1.1 / T, spin: 0 });
    HC.audio.play('throwIt', { x, y });
  };
  F.updateProjs = function (W, dt) {
    const lv = W.lv;
    for (let i = W.projs.length - 1; i >= 0; i--) {
      const p = W.projs[i];
      p.vz -= 9.8 * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      p.spin += dt * 14;
      let hit = false;
      if (HC.phys.solidAt(lv, nx, ny, false) && p.z < HC.WALLH) hit = true;
      else { p.x = nx; p.y = ny; p.z += p.vz * dt; }
      if (Math.random() < 0.6) HC.parts.add({ type: 'ember', x: p.x, y: p.y, z: p.z + 0.1, vx: 0, vy: 0, vz: 0.3, life: 0.3, size: 4 });
      for (const m of W.mobs) { if (!m.dead && HC.dist(m.x, m.y, p.x, p.y) < 0.45 && p.z < 1.6) { hit = true; break; } }
      if (hit || p.z <= 0) {
        W.projs.splice(i, 1);
        HC.audio.play('glass', { x: p.x, y: p.y });
        HC.audio.play('whoomp', { x: p.x, y: p.y });
        for (let k = 0; k < 10; k++) HC.parts.add({ type: 'glass', x: p.x, y: p.y, z: 0.2, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: Math.random() * 2, life: 1.2 });
        F.fire(W, p.x, p.y, 1.7, 9);
        HC.game.noise(p.x, p.y, 13);
        HC.game.shake(0.25);
      }
    }
  };
  // ---- helicopter (finale)
  F.heli = function (W, lz) {
    W.heli = { x: lz.x + 16, y: lz.y - 18, z: 7, tx: lz.x, ty: lz.y, state: 'approach', t: 0, rot: 0, snd: HC.audio.loop('heli', { vol: 0.05 }) };
  };
  F.updateHeli = function (W, dt) {
    const h = W.heli; if (!h) return;
    h.t += dt; h.rot += dt * 28;
    if (h.state === 'approach') {
      const k = Math.min(1, dt * 0.35);
      h.x = HC.lerp(h.x, h.tx, k); h.y = HC.lerp(h.y, h.ty, k);
      if (HC.dist(h.x, h.y, h.tx, h.ty) < 0.3) { h.state = 'descend'; h.t = 0; }
    } else if (h.state === 'descend') {
      h.z = HC.lerp(h.z, 0.15, Math.min(1, dt * 0.6));
      if (h.z < 0.35) { h.state = 'landed'; h.t = 0; HC.game.onHeliLanded(); }
    }
    const p = W.player;
    if (p) {
      const d = HC.dist(p.x, p.y, h.x, h.y);
      h.snd.set(HC.clamp(1.2 / (1 + d * d / 90), 0, 0.9), HC.clamp(((h.x - p.x) - (h.y - p.y)) / 14, -0.8, 0.8));
    }
    if (h.z < 3 && Math.random() < 0.7) {
      const a = Math.random() * 6.28, r = 1.5 + Math.random() * 2.5;
      HC.parts.add({ type: 'dust', x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, z: 0.1, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 0.2, life: 0.8, size: 9 });
    }
    if (Math.random() < dt * 1.5) HC.game.noise(h.x, h.y, 22);
  };
  // medevac helicopter body, built from iso boxes once and cached. Local frame: nose toward +x.
  let heliSpr = null;
  const OX = 4.6, OY = 1.1;          // local offset so every coordinate in the sprite is positive
  function heliSprite() {
    if (heliSpr) return heliSpr;
    const G = HC.gfx, c = G.spriteCanvas(7, 2.2, 2.6), x = c.getContext('2d');
    x.translate(0, 0);
    const b = (x0, y0, z0, x1, y1, z1, st) => G.box(x, x0 + OX, y0 + OY, z0, x1 + OX, y1 + OY, z1, Object.assign({ line: 'rgba(0,0,0,.35)' }, st));
    const olive = '#56603f', dark = '#3e4630', glass = '#7f9aa0';
    // skids + struts
    b(-1.3, 0.72, 0, 1.5, 0.82, 0.07, { c: '#2a2a26' }); b(-1.3, -0.82, 0, 1.5, -0.72, 0.07, { c: '#2a2a26' });
    [-0.8, 0.9].forEach((sx) => { b(sx, 0.6, 0.07, sx + 0.08, 0.7, 0.45, { c: '#2a2a26' }); });
    // tail boom + fin + stabiliser
    b(-4.3, -0.17, 1.05, -1.3, 0.17, 1.38, { c: olive, t: '#65704a' });
    b(-4.45, -0.07, 1.05, -4.05, 0.07, 2.3, { c: dark });
    b(-3.9, -0.6, 1.1, -3.6, 0.6, 1.18, { c: dark });
    // cabin
    b(-1.4, -0.72, 0.35, 1.1, 0.72, 1.62, { c: olive, t: '#6a7550' });
    b(1.1, -0.6, 0.4, 1.9, 0.6, 1.35, { s: glass, e: glass, t: olive });
    b(-0.8, -0.46, 1.62, 0.7, 0.46, 1.98, { c: dark, t: '#4a5238' });
    // side door opening + red cross on the camera-facing side
    const P = G.P;
    const q = (x0, z0, x1, z1) => [P(x0 + OX, 0.72 + OY, z0), P(x1 + OX, 0.72 + OY, z0), P(x1 + OX, 0.72 + OY, z1), P(x0 + OX, 0.72 + OY, z1)];
    G.poly(x, q(-0.9, 0.45, 0.2, 1.45)); x.fillStyle = '#1a1c18'; x.fill();
    G.poly(x, q(0.35, 0.7, 0.95, 1.3)); x.fillStyle = '#eeeae0'; x.fill();
    G.poly(x, q(0.58, 0.78, 0.72, 1.22)); x.fillStyle = '#c0261c'; x.fill();
    G.poly(x, q(0.43, 0.93, 0.87, 1.07)); x.fill();
    G.poly(x, q(-3.6, 1.12, -2.2, 1.3)); x.fillStyle = 'rgba(230,230,210,.5)'; x.fill();
    heliSpr = c;
    return c;
  }
  F.drawHeli = function (ctx, h) {
    const P = (x, y, z) => [(x - y) * HC.HW, (x + y) * HC.HH - z * HC.ZP];
    const g = P(h.x, h.y, 0);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.4 - h.z * 0.05)})`;
    ctx.beginPath(); ctx.ellipse(g[0] - 20, g[1], 150, 62, 0, 0, 7); ctx.fill();
    const spr = heliSprite();
    const o = P(h.x - OX, h.y - OY, h.z);
    ctx.drawImage(spr, o[0] - spr.ox, o[1] - spr.oy, spr.w, spr.h);
    // main rotor: two blades + motion blur disc
    const hub = P(h.x, h.y, h.z + 2.08);
    ctx.save(); ctx.translate(hub[0], hub[1]); ctx.scale(1, 0.5);
    ctx.fillStyle = 'rgba(30,32,28,.16)'; ctx.beginPath(); ctx.arc(0, 0, 250, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(24,24,22,.7)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) { const a = h.rot + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 250, -Math.sin(a) * 250); ctx.lineTo(Math.cos(a) * 250, Math.sin(a) * 250); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(hub[0], hub[1], 5, 0, 7); ctx.fill();
    // tail rotor + blinking beacon
    const tr = P(h.x - 4.25, h.y + 0.1, h.z + 1.9);
    ctx.strokeStyle = 'rgba(24,24,22,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tr[0] - Math.cos(h.rot * 1.7) * 26, tr[1] - Math.sin(h.rot * 1.7) * 26); ctx.lineTo(tr[0] + Math.cos(h.rot * 1.7) * 26, tr[1] + Math.sin(h.rot * 1.7) * 26); ctx.stroke();
    if (Math.sin(h.t * 7) > 0.6) { const bc = P(h.x, h.y, h.z + 2.0); ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.arc(bc[0], bc[1] - 4, 3, 0, 7); ctx.fill(); }
  };
  return F;
})();
