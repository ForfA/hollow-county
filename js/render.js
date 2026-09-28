// Hollow County — world renderer: floors, decals, line-of-sight, depth-sorted walls/props/actors, roofs, cutaways, lightmap, weather.
'use strict';
HC.render = (function () {
  const R = {};
  const G = HC.gfx, WK = HC.level.WK;
  let cv, ctx, dpr = 1, Wd = 1, Ht = 1;
  let lm, lctx, fogTex, grainTex;
  const cam = { x: 0, y: 0, zoom: 1.7, sx: 0, sy: 0 };
  R.cam = cam;

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    lm = HC.canvas(8, 8); lctx = lm.getContext('2d');
    resize();
    addEventListener('resize', resize);
    fogTex = HC.canvas(256, 256);
    const fx = fogTex.getContext('2d'), id = fx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const n = HC.fbm(x / 32, y / 32, 8, 77, 4);   // period 8 cells = 256px → seamless tiling
      const i = (y * 256 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 205; id.data[i + 3] = HC.clamp((n - 0.35) * 420, 0, 255);
    }
    fx.putImageData(id, 0, 0);
  };
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    Wd = window.innerWidth; Ht = window.innerHeight;
    cv.width = Math.floor(Wd * dpr); cv.height = Math.floor(Ht * dpr);
    lm.width = Math.ceil(Wd / 2); lm.height = Math.ceil(Ht / 2);
  }
  R.size = () => ({ w: Wd, h: Ht, dpr });
  R.ctx = () => ctx;
  const camIX = () => (cam.x - cam.y) * HC.HW + cam.sx;
  const camIY = () => (cam.x + cam.y) * HC.HH - 0.8 * HC.ZP + cam.sy;
  R.worldToScreen = (x, y, z) => [((x - y) * HC.HW - camIX()) * cam.zoom + Wd / 2, ((x + y) * HC.HH - (z || 0) * HC.ZP - camIY()) * cam.zoom + Ht / 2];
  R.screenToWorld = (sx, sy, z) => HC.unIso((sx - Wd / 2) / cam.zoom + camIX(), (sy - Ht / 2) / cam.zoom + camIY() + (z || 0) * HC.ZP);
  function setCam(c, scale) {
    const z = cam.zoom * (scale || 1);
    c.setTransform(z * dpr, 0, 0, z * dpr, (Wd / 2 - camIX() * cam.zoom) * dpr * (scale || 1), (Ht / 2 - camIY() * cam.zoom) * dpr * (scale || 1));
  }

  // ------------------------------------------------------------ per-level caches
  R.prepare = function (lv) {
    lv.floorSpr = new Array(lv.N);
    lv.texS = new Array(lv.N); lv.texE = new Array(lv.N);
    lv.cut = new Float32Array(lv.N);
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const i = lv.idx(x, y);
      if (lv.voidT[i]) continue;
      const v = (HC.hash2(x, y, 11) * 4) | 0;
      lv.floorSpr[i] = G.floor(lv.floor[i], v, lv.roadOrient[i]);
      if (lv.wk[i]) {
        lv.texS[i] = lv.faceTex(i, lv.inb(x, y + 1) ? lv.idx(x, y + 1) : -1);
        lv.texE[i] = lv.faceTex(i, lv.inb(x + 1, y) ? lv.idx(x + 1, y) : -1);
      }
    }
    const edgeF = lv.def.edgeFloor ? G.floorId[lv.def.edgeFloor] : G.floorId.grass;
    lv.edgeSpr = [0, 1, 2, 3].map((v) => G.floor(edgeF, v, 0));
    lv.doorCol = new Map();
    lv.doors.forEach((d, i) => lv.doorCol.set(i, d.lock ? '#7c8288' : d.barricade ? '#6a4a32' : ['#8a6446', '#d6d0c2', '#6e5038', '#a88c6a'][(HC.hash2(d.x, d.y, 4) * 4) | 0]));
  };

  // ------------------------------------------------------------ visibility (line of sight + vision cone)
  R.computeVis = function (W) {
    const lv = W.lv, p = W.player;
    W.frame++;
    const st = (W.frame % 65535) + 1;
    W.visStamp = st;
    if (!p || W.allVisible) { W.visPoly = null; return; }
    const pts = [];
    const N = 260, px = p.x, py = p.y;
    const face = p.dead ? 0 : p.face;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const diff = p.dead ? 0 : Math.abs(HC.angDiff(face, a));
      const range = diff < 1.7 ? 24 : diff > 2.15 ? 3.2 : HC.lerp(24, 3.2, (diff - 1.7) / 0.45);
      const dx = Math.cos(a), dy = Math.sin(a);
      let dist = range;
      HC.phys.dda(px, py, dx, dy, range, (tx, ty, t) => {
        if (!lv.inb(tx, ty)) { dist = t; return true; }
        const i = lv.idx(tx, ty);
        lv.vis[i] = st; lv.seen[i] = 1;
        if (lv.opaque[i] && t > 0) { dist = Math.min(range, t + 0.55); return true; }
        return false;
      });
      pts.push(px + dx * dist, py + dy * dist);
    }
    W.visPoly = pts;
    const tx = px | 0, ty = py | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (lv.inb(tx + dx, ty + dy)) { const i = lv.idx(tx + dx, ty + dy); lv.vis[i] = st; lv.seen[i] = 1; }
  };
  const isVis = (W, i) => W.allVisible || W.lv.vis[i] === W.visStamp;
  R.isVis = isVis;

  // ------------------------------------------------------------ ambient light from clock/weather
  const SKY = [[0, [34, 40, 78]], [240, [30, 36, 72]], [300, [70, 64, 104]], [345, [150, 120, 130]], [400, [222, 206, 196]], [540, [250, 246, 236]], [960, [255, 248, 232]],
    [1050, [252, 214, 176]], [1130, [214, 146, 118]], [1190, [120, 92, 120]], [1250, [58, 58, 98]], [1320, [40, 46, 86]], [1440, [34, 40, 78]]];
  R.ambient = function (W) {
    const t = ((W.clock % 1440) + 1440) % 1440;
    let a = SKY[0], b = SKY[1];
    for (let i = 0; i < SKY.length - 1; i++) if (t >= SKY[i][0] && t <= SKY[i + 1][0]) { a = SKY[i]; b = SKY[i + 1]; break; }
    const k = (t - a[0]) / Math.max(1, b[0] - a[0]);
    let c = HC.mix(a[1], b[1], k);
    const wx = W.lv.def.weather || {};
    if (wx.overcast || wx.rain) { const g = (c[0] + c[1] + c[2]) / 3; c = HC.mix(c, [g, g, g * 1.04], 0.45).map((v) => v * 0.8); }
    if (wx.fog) c = HC.mix(c, [150, 156, 166], 0.18);
    if (W.indoor) c = c.map((v) => v * 0.7);
    return c;
  };

  // ------------------------------------------------------------ main draw
  const list = [];
  let pool = [], poolN = 0;
  function item(k, t, a, b) { let o = pool[poolN]; if (!o) { o = pool[poolN] = {}; } poolN++; o.k = k; o.t = t; o.a = a; o.b = b; o.big = false; list.push(o); return o; }

  R.draw = function (W, opts) {
    const lv = W.lv, p = W.ghost ? null : W.player;
    opts = opts || {};
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, cv.width, cv.height);
    setCam(ctx);
    // visible tile bounds
    const m = 3;
    const c0 = R.screenToWorld(0, 0, 0), c1 = R.screenToWorld(Wd, 0, 0), c2 = R.screenToWorld(0, Ht, 3.5), c3 = R.screenToWorld(Wd, Ht, 3.5);
    const minX = Math.max(0, Math.floor(Math.min(c0.x, c1.x, c2.x, c3.x)) - m), maxX = Math.min(lv.W - 1, Math.ceil(Math.max(c0.x, c1.x, c2.x, c3.x)) + m);
    const minY = Math.max(0, Math.floor(Math.min(c0.y, c1.y, c2.y, c3.y)) - m), maxY = Math.min(lv.H - 1, Math.ceil(Math.max(c0.y, c1.y, c2.y, c3.y)) + m);
    const vx0 = camIX() - Wd / 2 / cam.zoom - 80, vx1 = camIX() + Wd / 2 / cam.zoom + 80;
    const vy0 = camIY() - Ht / 2 / cam.zoom - 40, vy1 = camIY() + Ht / 2 / cam.zoom + 160;
    // ---- floors (beyond the map edge, the border tiles continue so the world never ends in a black void)
    const oMinX = Math.floor(Math.min(c0.x, c1.x, c2.x, c3.x)) - m, oMaxX = Math.ceil(Math.max(c0.x, c1.x, c2.x, c3.x)) + m;
    const oMinY = Math.floor(Math.min(c0.y, c1.y, c2.y, c3.y)) - m, oMaxY = Math.ceil(Math.max(c0.y, c1.y, c2.y, c3.y)) + m;
    for (let y = oMinY; y <= oMaxY; y++) for (let x = oMinX; x <= oMaxX; x++) {
      const outside = x < 0 || y < 0 || x >= lv.W || y >= lv.H;
      const i = HC.clamp(y, 0, lv.H - 1) * lv.W + HC.clamp(x, 0, lv.W - 1);
      let spr = lv.floorSpr[i];
      if (outside) spr = lv.edgeSpr[(HC.hash2(x, y, 2) * 4) | 0] || spr;
      if (!spr) continue;
      const sx = (x - y) * HC.HW, sy = (x + y) * HC.HH;
      if (sx < vx0 || sx > vx1 || sy < vy0 - 40 || sy > vy1) continue;
      ctx.drawImage(spr, sx - HC.HW - 0.5, sy - 0.5, spr.width / 2, spr.height / 2);
    }
    // ---- decals
    const D = HC.decals;
    if (D.canvas) {
      const sx0 = Math.max(0, Math.floor(vx0 + D.ox)), sy0 = Math.max(0, Math.floor(vy0 - 40 + D.oy));
      const sw = Math.min(D.canvas.width - sx0, Math.ceil(vx1 - vx0)), sh = Math.min(D.canvas.height - sy0, Math.ceil(vy1 - vy0 + 40));
      if (sw > 0 && sh > 0) ctx.drawImage(D.canvas, sx0, sy0, sw, sh, sx0 - D.ox, sy0 - D.oy, sw, sh);
    }
    // ---- out-of-sight darkening (floor level)
    if (W.visPoly) {
      const br = W.ambient ? (W.ambient[0] + W.ambient[1] + W.ambient[2]) / 765 : 1;
      ctx.fillStyle = `rgba(6,8,14,${HC.lerp(0.62, 0.4, HC.clamp(br, 0, 1)).toFixed(3)})`;
      ctx.beginPath();
      ctx.rect(vx0 - 100, vy0 - 300, vx1 - vx0 + 200, vy1 - vy0 + 600);
      const vp = W.visPoly;
      ctx.moveTo((vp[0] - vp[1]) * HC.HW, (vp[0] + vp[1]) * HC.HH);
      for (let k = 2; k < vp.length; k += 2) ctx.lineTo((vp[k] - vp[k + 1]) * HC.HW, (vp[k] + vp[k + 1]) * HC.HH);
      ctx.closePath();
      ctx.fill('evenodd');
    }
    // ---- collect drawables
    list.length = 0; poolN = 0;
    const pk = p ? p.x + p.y : -999;
    const inBld = p ? lv.bld[lv.idx(p.x | 0, p.y | 0)] : -1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const i = y * lv.W + x;
      const sx = (x - y) * HC.HW, sy = (x + y) * HC.HH;
      if (sx < vx0 || sx > vx1 || sy < vy0 || sy > vy1 + 60) continue;
      if (lv.wk[i]) {
        const sw = lv.secretWalls.get(i);
        if (!(sw && sw.open)) {
          // cutaway target
          let cutT = 0;
          if (p && !opts.noCut) {
            const kd = x + y + 1 - pk, hd = Math.abs((x - y) - (p.x - p.y));
            const wide = inBld >= 0 && lv.bld[i] === inBld;
            if (kd > 0.3 && ((kd < 5.2 && hd < 2.6 + kd * 0.2) || (wide && kd < 11 && hd < 7))) cutT = 1;
          }
          lv.cut[i] = HC.approach(lv.cut[i], cutT, W.dtFrame * 5);
          item(x + y + 1, 1, i);
        }
      }
      if (!opts.noRoof && lv.bld[i] >= 0) {
        const b = lv.buildings[lv.bld[i]];
        if (!b.noRoof && b.alpha > 0.01) item(x + y + 1.5, 6, i, b);
      }
    }
    for (const pr of lv.props) {
      if (pr.x > maxX + 1 || pr.y > maxY + 1 || pr.x + pr.w < minX - 1 || pr.y + pr.d < minY - 1) continue;
      const o = item(pr.x + pr.w / 2 + pr.y + pr.d / 2, 4, pr);
      if (pr.w > 1 || pr.d > 1) o.big = true;
    }
    for (const t of lv.trees) {
      if (t.x < minX - 2 || t.x > maxX + 2 || t.y < minY - 2 || t.y > maxY + 2) continue;
      item(t.x + t.y + 1.1, 5, t);
    }
    for (const it of W.items) {
      if (it.taken) continue;
      if (it.x < minX || it.x > maxX + 1 || it.y < minY || it.y > maxY + 1) continue;
      if (!isVis(W, lv.idx(it.x | 0, it.y | 0))) continue;
      item(it.x + it.y - 0.25, 9, it);
    }
    for (const mb of W.mobs) {
      if (mb.dead) continue;
      if (mb.x < minX - 1 || mb.x > maxX + 1 || mb.y < minY - 1 || mb.y > maxY + 1) continue;
      const seen = W.allVisible || isVis(W, lv.idx(mb.x | 0, mb.y | 0)) || (p && HC.dist(mb.x, mb.y, p.x, p.y) < 1.6);
      mb.alpha = HC.approach(mb.alpha, seen ? 1 : 0, W.dtFrame * 4);
      if (mb.alpha <= 0.01) continue;
      item(mb.x + mb.y + (mb.fall > 0.5 ? -0.3 : 0), 7, mb);
    }
    if (p) item(p.x + p.y + (p.fall > 0.5 ? -0.3 : 0), 8, p);
    for (const pr of W.projs) item(pr.x + pr.y, 10, pr);
    // big props: resolve ordering against nearby actors
    for (const o of list) {
      if (!o.big) continue;
      const pr = o.a;
      for (const q of list) {
        if (q.t < 7 || q.t > 10) continue;
        const e = q.a;
        if (e.x < pr.x - 1.5 || e.x > pr.x + pr.w + 1.5 || e.y < pr.y - 1.5 || e.y > pr.y + pr.d + 1.5) continue;
        if (e.x >= pr.x + pr.w || e.y >= pr.y + pr.d) q.k = Math.max(q.k, o.k + 0.01);
        else if (e.x <= pr.x || e.y <= pr.y) q.k = Math.min(q.k, o.k - 0.01);
      }
    }
    list.sort((a, b) => a.k - b.k);
    // ---- draw sorted
    for (const o of list) {
      switch (o.t) {
        case 1: drawWallTile(W, o.a); break;
        case 4: drawProp(W, o.a); break;
        case 5: drawTree(W, o.a, p); break;
        case 6: drawRoof(W, o.a, o.b); break;
        case 7: ctx.globalAlpha = o.a.alpha; HC.rig.draw(ctx, o.a.drawSpec()); ctx.globalAlpha = 1; break;
        case 8: HC.rig.draw(ctx, o.a.drawSpec()); break;
        case 9: drawItem(W, o.a); break;
        case 10: drawMolotov(o.a); break;
      }
    }
    HC.parts.draw(ctx, false);
    if (W.heli) HC.fx.drawHeli(ctx, W.heli);
    // x-ray silhouette of the player
    if (p && !p.dead) { ctx.globalAlpha = 0.22; HC.rig.draw(ctx, Object.assign(p.drawSpec(), { noShadow: true, tintCol: [200, 220, 255], tintAmt: 0.5 })); ctx.globalAlpha = 1; }
    // ---- lighting
    drawLighting(W);
    // ---- glow pass
    setCam(ctx);
    ctx.globalCompositeOperation = 'lighter';
    HC.parts.draw(ctx, true);
    drawLampHalos(W, minX, maxX, minY, maxY);
    for (const it of W.items) {
      if (it.taken || !(it.type === 'note' || it.type.startsWith('key') || it.type === 'antiviral')) continue;
      if (!isVis(W, lv.idx(it.x | 0, it.y | 0))) continue;
      const s = [(it.x - it.y) * HC.HW, (it.x + it.y) * HC.HH - 6];
      const tw = 0.5 + 0.5 * Math.sin(W.time * 3 + it.x);
      const col = it.type === 'keyred' ? '255,80,60' : it.type === 'keyblue' ? '90,140,255' : it.type === 'keyyellow' ? '255,210,80' : it.type === 'antiviral' ? '90,200,255' : '255,245,210';
      const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 16);
      g.addColorStop(0, `rgba(${col},${0.35 + tw * 0.3})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], 16, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // ---- weather
    drawWeather(W);
  };

  // ------------------------------------------------------------ element renderers
  function kindName(k) { return HC.level.KIND_NAME(k); }
  function drawWallTile(W, i) {
    const lv = W.lv, x = i % lv.W, y = (i / lv.W) | 0;
    const sx = (x - y) * HC.HW, sy = (x + y) * HC.HH;
    const dark = !isVis(W, i);
    const cut = lv.cut[i];
    const win = lv.windows.get(i), door = lv.doors.get(i);
    const texS = lv.texS[i], texE = lv.texE[i];
    const draw = (isCut) => {
      let spr;
      if (win) spr = G.windowTile({ alongX: win.alongX, texS, texE, dark, broken: win.broken, cut: isCut });
      else if (door) {
        const gate = door.kind === WK.fence || door.kind === WK.woodfence;
        if (gate) return;
        spr = G.doorFrame({ alongX: door.alongX, texS, texE, dark, cut: isCut, lock: door.lock });
      } else spr = G.wall({ kind: kindName(lv.wk[i]), conn: lv.conn[i], texS, texE, dark, cut: isCut });
      G.drawSprite(ctx, spr, sx, sy);
    };
    if (cut > 0.01) { draw(true); if (cut < 0.99) { ctx.globalAlpha = 1 - cut; draw(false); ctx.globalAlpha = 1; } }
    else draw(false);
    if (door && cut < 0.6) { ctx.globalAlpha = 1 - cut; drawDoorPanel(W, door, dark); ctx.globalAlpha = 1; }
  }
  function drawDoorPanel(W, d, dark) {
    const lv = W.lv;
    d.anim = HC.approach(d.anim, d.open || d.broken ? 1 : 0, W.dtFrame * 5);
    const x = d.x, y = d.y;
    const gate = d.kind === WK.fence || d.kind === WK.woodfence;
    const h = gate ? 1.3 : 1.6;
    ctx.save();
    ctx.translate((x - y) * HC.HW, (x + y) * HC.HH);
    let col = lv.doorCol.get(d.i) || '#8a6446';
    if (gate) col = d.kind === WK.fence ? '#8d9296' : '#7e6448';
    if (d.shutter) {
      if (d.anim < 0.98) {
        const top = HC.lerp(0, 1.55, d.anim);
        const [a0, a1] = d.alongX ? [[0.02, 0.5], [0.98, 0.5]] : [[0.5, 0.02], [0.5, 0.98]];
        G.orientedSlab(ctx, a0[0], a0[1], a1[0], a1[1], 0.08, top, 1.62, '#8a9096', dark);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.6;
        for (let z = top + 0.1; z < 1.6; z += 0.12) { const p0 = G.P(a0[0], a0[1] + 0.04, z), p1 = G.P(a1[0], a1[1] + 0.04, z); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
      }
      ctx.restore(); return;
    }
    if (d.broken) {
      const [a0, a1] = d.alongX ? [[0.1, 0.62], [0.9, 0.95]] : [[0.62, 0.1], [0.95, 0.9]];
      G.orientedSlab(ctx, a0[0], a0[1], a1[0], a1[1], 0.55, 0, 0.06, col, dark);
      ctx.restore(); return;
    }
    const th = d.anim * 1.45;
    let hx, hy, ex, ey;
    if (d.alongX) { hx = 0.06; hy = 0.5; ex = hx + Math.cos(th) * 0.88; ey = hy + Math.sin(th) * 0.88; }
    else { hx = 0.5; hy = 0.06; ex = hx + Math.sin(th) * 0.88; ey = hy + Math.cos(th) * 0.88; }
    G.orientedSlab(ctx, hx, hy, ex, ey, 0.08, 0, h, col, dark);
    if (d.lock && d.anim < 0.5) {
      const lc = { red: '#d23a2a', blue: '#3a6ad2', yellow: '#e2b632' }[d.lock];
      const mx = (hx + ex) / 2, my = (hy + ey) / 2;
      G.orientedSlab(ctx, hx + (ex - hx) * 0.1, hy + (ey - hy) * 0.1 + (d.alongX ? 0.05 : 0), ex - (ex - hx) * 0.1, ey - (ey - hy) * 0.1 + (d.alongX ? 0.05 : 0), 0.02, 0.9, 1.05, lc, dark);
      const pp = G.P(mx + (d.alongX ? 0 : 0.06), my + (d.alongX ? 0.06 : 0), 1.25);
      ctx.fillStyle = lc; ctx.fillRect(pp[0] - 2, pp[1] - 2, 4, 4);
    }
    if (d.barricade && !d.broken) {
      const n = Math.max(1, Math.ceil((d.hp / d.maxHp) * 3));
      for (let k = 0; k < n; k++) {
        const z0 = 0.35 + k * 0.45;
        const a0 = d.alongX ? [0.0, 0.58] : [0.58, 0.0], a1 = d.alongX ? [1.0, 0.58] : [0.58, 1.0];
        ctx.save();
        const pa = G.P(a0[0], a0[1], z0 + (k % 2 ? 0.25 : 0)), pb = G.P(a1[0], a1[1], z0 + (k % 2 ? 0 : 0.25));
        ctx.strokeStyle = dark ? '#3a2a1c' : '#8a6a44'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawProp(W, pr) {
    const lv = W.lv;
    let dark = true;
    for (let yy = pr.y; yy < pr.y + pr.d && dark; yy++) for (let xx = pr.x; xx < pr.x + pr.w; xx++) if (isVis(W, lv.idx(xx, yy))) { dark = false; break; }
    const spr = G.prop(pr.type, pr.w, pr.d, { face: pr.face, col: pr.col, var: pr.var, dark, cross: pr.cross });
    if (spr) G.drawSprite(ctx, spr, (pr.x - pr.y) * HC.HW, (pr.x + pr.y) * HC.HH);
  }
  function drawTree(W, t, p) {
    const lv = W.lv;
    const dark = !isVis(W, lv.idx(t.x, t.y)) && !W.allVisible;
    const spr = G.tree(t.v % 6, dark);
    let a = 1;
    if (p) {
      const k = t.x + t.y + 1 - (p.x + p.y), hd = Math.abs((t.x - t.y) - (p.x - p.y));
      if (k > 0 && k < 6 && hd < 2.4) a = 0.35;
    }
    t.alpha = HC.approach(t.alpha === undefined ? 1 : t.alpha, a, W.dtFrame * 3);
    ctx.globalAlpha = t.alpha;
    G.drawSprite(ctx, spr, (t.x - 1 - (t.y - 1)) * HC.HW, (t.x - 1 + t.y - 1) * HC.HH);
    ctx.globalAlpha = 1;
  }
  function drawRoof(W, i, b) {
    const lv = W.lv, x = i % lv.W, y = (i / lv.W) | 0;
    const spr = G.roof(b.roofCol, lv.roofEdge[i], b.flat);
    let a = b.alpha;
    const p = W.ghost ? null : W.player;
    if (p && x + y + 1 > p.x + p.y) {
      // roofs in front of the player open up in a soft circle so the street stays readable
      const dx = ((x + 0.5) - (y + 0.5) - (p.x - p.y)) * HC.HW, dy = ((x + y + 1) * HC.HH - HC.WALLH * HC.ZP) - ((p.x + p.y) * HC.HH - 30);
      const d = Math.hypot(dx, dy * 1.3);
      a *= HC.clamp((d - 150) / 140, 0.18, 1);
    }
    ctx.globalAlpha = a;
    G.drawSprite(ctx, spr, (x - y) * HC.HW, (x + y) * HC.HH - HC.WALLH * HC.ZP - 1);
    ctx.globalAlpha = 1;
  }
  function drawItem(W, it) {
    const spr = G.item(it.type);
    const bob = it.type.startsWith('key') || it.type === 'antiviral' ? Math.sin(W.time * 3 + it.x) * 1.5 - 2 : 0;
    G.drawSprite(ctx, spr, (it.x - 0.5 - (it.y - 0.5)) * HC.HW, (it.x - 0.5 + it.y - 0.5) * HC.HH + bob);
  }
  function drawMolotov(pr) {
    const s = G.P(pr.x, pr.y, pr.z);
    ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(pr.spin);
    ctx.fillStyle = '#4a6a3a'; ctx.fillRect(-2, -5, 4, 9); ctx.fillStyle = '#e8e0c8'; ctx.fillRect(-1, -8, 2, 3);
    ctx.restore();
    const g = G.P(pr.x, pr.y, 0); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(g[0], g[1], 4, 2, 0, 0, 7); ctx.fill();
  }

  // ------------------------------------------------------------ lighting
  function worldTx(c) { c.transform(HC.HW, HC.HH, -HC.HW, HC.HH, 0, 0); }
  function glow(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`);
    g.addColorStop(0.45, `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a * 0.45})`);
    g.addColorStop(1, `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  function flickerOf(l, t) {
    if (!l.flicker) return 1;
    const n = HC.hash2(Math.floor(t * 12), (l.x * 7 + l.y * 13) | 0, 3);
    if (n < l.flicker * 0.5) return 0.15;
    return 0.85 + 0.15 * Math.sin(t * 40 + l.x);
  }
  function drawLighting(W) {
    const amb = R.ambient(W);
    W.ambient = amb;
    const bright = (amb[0] + amb[1] + amb[2]) / 765;
    W.dark = bright < 0.45;
    W.visMul = HC.clamp(0.45 + bright * 0.7, 0.5, 1);
    const lv = W.lv, p = W.ghost ? null : W.player, t = W.time;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = HC.rgb(amb);
    lctx.fillRect(0, 0, lm.width, lm.height);
    if (bright > 0.96 && !W.fires.length && !W.flashes.length) return;
    lctx.globalCompositeOperation = 'lighter';
    const z = cam.zoom * 0.5;
    const setL = () => lctx.setTransform(z, 0, 0, z, (Wd / 2 - camIX() * cam.zoom) * 0.5, (Ht / 2 - camIY() * cam.zoom) * 0.5);
    const lightK = HC.clamp((0.9 - bright) * 1.4, 0.15, 1);
    // static lights
    for (const l of lv.lights) {
      if (Math.abs(l.x - cam.x) + Math.abs(l.y - cam.y) > 40) continue;
      const f = flickerOf(l, t) * lightK;
      if (f <= 0.02) continue;
      setL(); worldTx(lctx);
      glow(lctx, l.x, l.y, l.r, l.col, 0.95 * f);
      setL();
      const s = G.P(l.x, l.y, 1.1);
      glow(lctx, s[0], s[1], l.r * 26, l.col, 0.35 * f);
    }
    // fires
    for (const fi of W.fires) {
      const fl = 0.8 + Math.sin(t * 17 + fi.x * 3) * 0.12 + Math.sin(t * 29) * 0.08;
      setL(); worldTx(lctx); glow(lctx, fi.x, fi.y, fi.r * 3.6 * fl, [255, 150, 60], 0.95);
      setL(); const s = G.P(fi.x, fi.y, 0.8); glow(lctx, s[0], s[1], fi.r * 60 * fl, [255, 140, 50], 0.4);
    }
    // muzzle flashes
    for (let i = W.flashes.length - 1; i >= 0; i--) {
      const f = W.flashes[i];
      setL(); worldTx(lctx); glow(lctx, f.x, f.y, f.r, [255, 214, 150], 0.9 * (1 - f.t / f.life));
    }
    // burning zombies
    for (const m of W.mobs) if (!m.dead && m.burnT > 0) { setL(); worldTx(lctx); glow(lctx, m.x, m.y, 3.2, [255, 140, 50], 0.8); }
    // player: personal glow + flashlight
    if (p && !p.dead) {
      setL(); worldTx(lctx);
      glow(lctx, p.x, p.y, 2.6, [150, 150, 170], 0.45 * lightK);
      if (p.flashlight) {
        const len = 12, half = 0.5;
        lctx.save();
        const g = lctx.createRadialGradient(p.x, p.y, 0.3, p.x, p.y, len);
        g.addColorStop(0, 'rgba(255,248,225,0.95)'); g.addColorStop(0.55, 'rgba(255,240,210,0.55)'); g.addColorStop(1, 'rgba(255,236,200,0)');
        lctx.fillStyle = g;
        lctx.beginPath(); lctx.moveTo(p.x, p.y); lctx.arc(p.x, p.y, len, p.face - half, p.face + half); lctx.closePath(); lctx.fill();
        lctx.restore();
        setL();
        const s = G.P(p.x + Math.cos(p.face) * 3, p.y + Math.sin(p.face) * 3, 1);
        glow(lctx, s[0], s[1], 90, [255, 240, 210], 0.28);
      }
    }
    if (W.heli) { setL(); worldTx(lctx); glow(lctx, W.heli.x, W.heli.y, 5, [230, 240, 255], 0.9); }
    // composite
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lm, 0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawLampHalos(W, minX, maxX, minY, maxY) {
    if (!W.dark) return;
    for (const l of W.lv.lights) {
      if (l.x < minX || l.x > maxX + 1 || l.y < minY || l.y > maxY + 1) continue;
      const f = flickerOf(l, W.time); if (f < 0.2) continue;
      const s = G.P(l.x, l.y, l.z);
      const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 14);
      g.addColorStop(0, `rgba(${l.col[0]},${l.col[1]},${l.col[2]},${0.55 * f})`); g.addColorStop(1, `rgba(${l.col[0]},${l.col[1]},${l.col[2]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], 14, 0, 7); ctx.fill();
    }
  }

  // ------------------------------------------------------------ weather
  const drops = [];
  function drawWeather(W) {
    const wx = W.lv.def.weather || {};
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (wx.fog) {
      if (!fogPat) fogPat = ctx.createPattern(fogTex, 'repeat');
      const layer = (scale, par, drift, a) => {
        const s = scale * cam.zoom;
        fogPat.setTransform(new DOMMatrix().translate(-(camIX() * cam.zoom * par + W.time * drift), -(camIY() * cam.zoom * par)).scale(s / 256));
        ctx.globalAlpha = a; ctx.fillStyle = fogPat; ctx.fillRect(0, 0, Wd, Ht);
      };
      layer(320, 0.6, 9, W.indoor ? 0.12 : 0.34);
      layer(224, 0.8, -14, W.indoor ? 0.06 : 0.2);
      ctx.globalAlpha = 1;
    }
    if (wx.rain && !W.indoor) {
      while (drops.length < 260) drops.push({ x: Math.random() * Wd, y: Math.random() * Ht, s: 0.6 + Math.random() * 0.6 });
      ctx.strokeStyle = 'rgba(190,200,215,.28)'; ctx.lineWidth = 1;
      ctx.beginPath();
      const dt = Math.min(0.05, W.dtFrame);
      for (const d of drops) {
        d.x += -180 * d.s * dt; d.y += 900 * d.s * dt;
        if (d.y > Ht) { d.y = -20; d.x = Math.random() * (Wd + 200); if (Math.random() < 0.5) splashes.push({ x: Math.random() * Wd, y: Math.random() * Ht, t: 0 }); }
        if (d.x < -20) d.x = Wd + 20;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4 * d.s, d.y + 18 * d.s);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,210,225,.3)';
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.t += dt;
        if (s.t > 0.25) { splashes.splice(i, 1); continue; }
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 2 + s.t * 16, 1 + s.t * 8, 0, 0, 7); ctx.stroke();
      }
    }
  }
  const splashes = [];
  let fogPat = null;
  return R;
})();
