// Hollow County — procedural graphics: textures, iso box rendering, sprite caches for floors/walls/props/trees/items.
'use strict';
HC.gfx = (function () {
  const G = {};
  const T = 128;                    // texture px per world unit
  const SS = 2;                     // sprite supersampling
  const P = (x, y, z) => [(x - y) * HC.HW, (x + y) * HC.HH - (z || 0) * HC.ZP];
  G.P = P;

  // ------------------------------------------------------------ texture helpers
  function tex(w, h, fn) { const c = HC.canvas(w, h); fn(c.getContext('2d'), w, h); return c; }
  function grain(ctx, w, h, amt, scale, seed, period) {
    const id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const n = (HC.fbm(x / scale, y / scale, (period || w) / scale, seed, 3) - 0.5) * amt + (Math.random() - 0.5) * amt * 0.35;
      d[i] = HC.clamp(d[i] * (1 + n), 0, 255); d[i + 1] = HC.clamp(d[i + 1] * (1 + n), 0, 255); d[i + 2] = HC.clamp(d[i + 2] * (1 + n), 0, 255);
    }
    ctx.putImageData(id, 0, 0);
  }
  const C = HC.rgb;
  function speckle(ctx, w, h, n, cols, size, rng) {
    for (let i = 0; i < n; i++) { ctx.fillStyle = C(rng.pick(cols), rng.range(0.25, 0.8)); const s = rng.range(size * 0.5, size); ctx.fillRect(rng() * w, rng() * h, s, s); }
  }

  // ------------------------------------------------------------ floors
  const FLOOR_GEN = {
    grass(ctx, w, h, r) {
      ctx.fillStyle = C([84, 97, 57]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.35, 22, r.int(0, 999), w);
      for (let i = 0; i < 420; i++) {
        const x = r() * w, y = r() * h, l = r.range(3, 7);
        ctx.strokeStyle = C(r.pick([[62, 76, 42], [104, 116, 66], [118, 124, 70], [74, 88, 50]]), 0.7);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r.range(-2, 2), y - l); ctx.stroke();
      }
      if (r() < 0.4) speckle(ctx, w, h, 6, [[190, 180, 90], [200, 200, 200]], 3, r);
    },
    asphalt(ctx, w, h, r) {
      ctx.fillStyle = C([60, 62, 64]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.22, 30, r.int(0, 999), w);
      speckle(ctx, w, h, 500, [[40, 40, 42], [90, 90, 92], [75, 74, 70]], 2, r);
      if (r() < 0.35) { ctx.strokeStyle = 'rgba(25,25,25,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); let x = r() * w, y = r() * h; ctx.moveTo(x, y); for (let i = 0; i < 6; i++) { x += r.range(-16, 16); y += r.range(-16, 16); ctx.lineTo(x, y); } ctx.stroke(); }
    },
    concrete(ctx, w, h, r) {
      ctx.fillStyle = C([146, 143, 134]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.16, 26, r.int(0, 999), w);
      speckle(ctx, w, h, 160, [[120, 118, 110], [170, 166, 156]], 2, r);
      ctx.strokeStyle = 'rgba(80,78,72,.55)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.strokeStyle = 'rgba(90,88,82,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    },
    dirt(ctx, w, h, r) {
      ctx.fillStyle = C([112, 93, 68]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.3, 18, r.int(0, 999), w);
      speckle(ctx, w, h, 220, [[88, 72, 52], [140, 120, 92], [96, 104, 60]], 3, r);
    },
    gravel(ctx, w, h, r) {
      ctx.fillStyle = C([118, 112, 102]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.2, 14, r.int(0, 999), w);
      for (let i = 0; i < 500; i++) { ctx.fillStyle = C(r.pick([[90, 86, 80], [150, 146, 138], [130, 118, 100], [70, 68, 64]])); ctx.beginPath(); ctx.arc(r() * w, r() * h, r.range(0.8, 2.2), 0, 7); ctx.fill(); }
    },
    lino(ctx, w, h, r) {
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = C((i + j) % 2 ? [206, 199, 176] : [150, 164, 146]); ctx.fillRect(i * s, j * s, s, s); }
      grain(ctx, w, h, 0.14, 30, r.int(0, 999), w);
      ctx.strokeStyle = 'rgba(60,60,50,.18)'; ctx.lineWidth = 1;
      for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke(); }
    },
    wood(ctx, w, h, r) {
      const pl = 6, ph = h / pl;
      for (let i = 0; i < pl; i++) {
        const base = r.pick([[138, 96, 58], [124, 86, 52], [148, 104, 64], [116, 80, 50]]);
        ctx.fillStyle = C(base); ctx.fillRect(0, i * ph, w, ph);
        for (let k = 0; k < 7; k++) { ctx.strokeStyle = C(HC.shade(base, r.range(0.8, 1.15)), 0.5); ctx.beginPath(); const yy = i * ph + r() * ph; ctx.moveTo(0, yy); ctx.bezierCurveTo(w * 0.3, yy + r.range(-2, 2), w * 0.6, yy + r.range(-2, 2), w, yy); ctx.stroke(); }
        ctx.fillStyle = 'rgba(40,24,12,.6)'; ctx.fillRect(0, i * ph, w, 1.4);
        const cut = r() * w; ctx.fillRect(cut, i * ph, 1.4, ph);
      }
      grain(ctx, w, h, 0.12, 30, r.int(0, 999), w);
    },
    carpet(ctx, w, h, r, p) {
      ctx.fillStyle = C(p || [112, 92, 106]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.2, 10, r.int(0, 999), w);
      speckle(ctx, w, h, 900, [HC.shade(p || [112, 92, 106], 0.8), HC.shade(p || [112, 92, 106], 1.2)], 1.5, r);
    },
    tile(ctx, w, h, r) {
      const n = 4, s = w / n;
      ctx.fillStyle = C([160, 164, 158]); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = C(HC.shade([206, 210, 202], r.range(0.95, 1.03))); ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2); }
      grain(ctx, w, h, 0.1, 30, r.int(0, 999), w);
    },
    mall(ctx, w, h, r) {
      const s = w / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = C((i + j) % 2 ? [196, 184, 158] : [178, 166, 140]); ctx.fillRect(i * s, j * s, s, s); }
      grain(ctx, w, h, 0.1, 40, r.int(0, 999), w);
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,80,64,.4)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1); ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(s, h); ctx.moveTo(0, s); ctx.lineTo(w, s); ctx.stroke();
    },
    water(ctx, w, h, r) {
      ctx.fillStyle = C([30, 42, 48]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.3, 30, r.int(0, 999), w);
      ctx.strokeStyle = 'rgba(150,170,175,.14)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { const y = r() * h, x = r() * w; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 3, x + 22, y); ctx.stroke(); }
    },
    slab(ctx, w, h, r) {
      ctx.fillStyle = C([124, 124, 120]); ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, 0.18, 34, r.int(0, 999), w);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(40,36,30,.08)'; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, r.range(8, 30), r.range(6, 20), r() * 3, 0, 7); ctx.fill(); }
    },
  };
  const FLOORS = [
    null,
    { n: 'grass', g: 'grass', soft: 1 },
    { n: 'asphalt', g: 'asphalt' },
    { n: 'road', g: 'asphalt', line: 'yellow' },
    { n: 'concrete', g: 'concrete' },
    { n: 'dirt', g: 'dirt', soft: 1 },
    { n: 'lino', g: 'lino', indoor: 1 },
    { n: 'wood', g: 'wood', indoor: 1 },
    { n: 'carpet', g: 'carpet', indoor: 1, soft: 1, p: [112, 92, 106] },
    { n: 'tile', g: 'tile', indoor: 1 },
    { n: 'mall', g: 'mall', indoor: 1 },
    { n: 'gravel', g: 'gravel', soft: 1 },
    { n: 'parking', g: 'asphalt', line: 'white' },
    { n: 'slab', g: 'slab', indoor: 1 },
    { n: 'carpet2', g: 'carpet', indoor: 1, soft: 1, p: [84, 98, 118] },
    { n: 'carpet3', g: 'carpet', indoor: 1, soft: 1, p: [96, 110, 84] },
    { n: 'yard', g: 'slab' },          // outdoor concrete pad (checkpoint, loading dock)
    { n: 'water', g: 'water', water: 1 },
  ];
  G.FLOORS = FLOORS;
  G.floorId = {};
  FLOORS.forEach((f, i) => { if (f) G.floorId[f.n] = i; });
  const floorCache = {};          // key -> diamond canvas
  function toDiamond(src, bleed) {
    const c = HC.canvas(64 * SS + 2, 32 * SS + 2), x = c.getContext('2d');
    const s = SS * (1 + (bleed || 0.035));
    x.translate(32 * SS + 1, 16 * SS + 1);
    x.transform((32 / T) * s, (16 / T) * s, (-32 / T) * s, (16 / T) * s, 0, 0);
    x.translate(-T / 2, -T / 2);
    x.drawImage(src, 0, 0);
    return c;
  }
  G.floor = function (id, variant, orient) {
    const key = id + ':' + variant + ':' + (orient || 0);
    let c = floorCache[key];
    if (c) return c;
    const f = FLOORS[id];
    const r = HC.rng(id * 977 + variant * 131 + 7);
    const src = tex(T, T, (ctx, w, h) => {
      FLOOR_GEN[f.g](ctx, w, h, r, f.p);
      if (f.line === 'yellow') {
        ctx.fillStyle = 'rgba(206,168,58,.85)';
        if (orient) ctx.fillRect(w / 2 - 3, 12, 6, h * 0.55); else ctx.fillRect(12, h / 2 - 3, w * 0.55, 6);
      } else if (f.line === 'white') {
        ctx.fillStyle = 'rgba(214,212,200,.8)';
        if (orient) ctx.fillRect(0, 0, w, 5); else ctx.fillRect(0, 0, 5, h);
      }
      ctx.fillStyle = `rgba(0,0,0,${0.02 + variant * 0.018})`; ctx.fillRect(0, 0, w, h);
    });
    c = floorCache[key] = toDiamond(src);
    return c;
  };

  // ------------------------------------------------------------ wall textures (T px/unit wide, 2 units tall, v from top)
  const WALL_TEX = {};
  function wallTex(key, fn) {
    if (WALL_TEX[key]) return WALL_TEX[key];
    const c = tex(T, T * 2, fn);
    WALL_TEX[key] = c;
    return c;
  }
  const topPx = (z) => (HC.WALLH - z) * T;   // v coordinate for height z on a full-height wall
  const WT = {
    siding(col) {
      return wallTex('siding' + col, (ctx, w, h) => {
        const c = HC.col(col), bh = 0.17 * T;
        ctx.fillStyle = C(HC.shade(c, 0.9)); ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < topPx(0.18); y += bh) {
          const g = ctx.createLinearGradient(0, y, 0, y + bh);
          g.addColorStop(0, C(HC.shade(c, 1.08))); g.addColorStop(0.85, C(HC.shade(c, 0.93))); g.addColorStop(1, C(HC.shade(c, 0.62)));
          ctx.fillStyle = g; ctx.fillRect(0, y, w, bh);
        }
        ctx.fillStyle = C([118, 114, 106]); ctx.fillRect(0, topPx(0.18), w, h);
        grain(ctx, w, h, 0.12, 24, 3, w);
        ctx.fillStyle = C(HC.shade(c, 1.12)); ctx.fillRect(0, 0, w, 6);
      });
    },
    brick(col) {
      return wallTex('brick' + col, (ctx, w, h) => {
        const r = HC.rng(44), base = HC.col(col || '#8a4a3a');
        ctx.fillStyle = C([150, 142, 128]); ctx.fillRect(0, 0, w, h);
        const bh = 0.095 * T, bw = 0.25 * T;
        for (let row = 0, y = 0; y < h; row++, y += bh) {
          for (let x = -(row % 2) * bw / 2; x < w; x += bw) {
            ctx.fillStyle = C(HC.shade(base, r.range(0.8, 1.12)));
            ctx.fillRect(x + 1.2, y + 1.2, bw - 2.4, bh - 2.4);
          }
        }
        grain(ctx, w, h, 0.18, 12, 9, w);
        ctx.fillStyle = C([98, 92, 84]); ctx.fillRect(0, topPx(0.12), w, h);
      });
    },
    plaster(col, pat) {
      return wallTex('plaster' + col + pat, (ctx, w, h) => {
        const c = HC.col(col);
        ctx.fillStyle = C(c); ctx.fillRect(0, 0, w, h);
        if (pat === 1) { for (let x = 0; x < w; x += 16) { ctx.fillStyle = C(HC.shade(c, 0.9), 0.6); ctx.fillRect(x, 0, 7, h); } }
        if (pat === 2) { const r = HC.rng(8); for (let i = 0; i < 70; i++) { ctx.fillStyle = C(HC.shade(c, r.range(0.75, 0.88)), 0.8); const x = (i % 7) * 18 + ((i / 7 | 0) % 2) * 9, y = (i / 7 | 0) * 24; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); } }
        if (pat === 3) { ctx.fillStyle = C(HC.shade(c, 0.78)); ctx.fillRect(0, topPx(0.95), w, topPx(0) - topPx(0.95)); ctx.fillStyle = C([230, 226, 214]); ctx.fillRect(0, topPx(0.97), w, 5); }
        grain(ctx, w, h, 0.08, 30, 5, w);
        ctx.fillStyle = C([228, 224, 212]); ctx.fillRect(0, topPx(0.09), w, 0.09 * T);   // baseboard
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, topPx(0.09), w, 1.5);
      });
    },
    cblock(col) {
      return wallTex('cblock' + (col || ''), (ctx, w, h) => {
        const c = HC.col(col || '#8e8c86');
        ctx.fillStyle = C(HC.shade(c, 0.7)); ctx.fillRect(0, 0, w, h);
        const bh = 0.2 * T, bw = 0.5 * T, r = HC.rng(3);
        for (let row = 0, y = 0; y < h; row++, y += bh) for (let x = -(row % 2) * bw / 2; x < w; x += bw) { ctx.fillStyle = C(HC.shade(c, r.range(0.92, 1.05))); ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3); }
        grain(ctx, w, h, 0.14, 16, 21, w);
      });
    },
    hosp() {
      return wallTex('hosp', (ctx, w, h) => {
        ctx.fillStyle = C([214, 214, 204]); ctx.fillRect(0, 0, w, h);
        const y0 = topPx(0.95);
        ctx.fillStyle = C([128, 158, 146]); ctx.fillRect(0, y0, w, h - y0);
        ctx.strokeStyle = 'rgba(70,90,80,.35)'; ctx.lineWidth = 1;
        for (let y = y0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, h); ctx.stroke(); }
        ctx.fillStyle = C([90, 110, 102]); ctx.fillRect(0, y0 - 4, w, 5);
        grain(ctx, w, h, 0.07, 30, 12, w);
      });
    },
    panel() {
      return wallTex('panel', (ctx, w, h) => {
        const r = HC.rng(19);
        for (let x = 0; x < w; x += 16) { ctx.fillStyle = C(HC.shade([112, 78, 50], r.range(0.85, 1.12))); ctx.fillRect(x, 0, 16, h); ctx.fillStyle = 'rgba(30,18,8,.5)'; ctx.fillRect(x, 0, 1.5, h); }
        grain(ctx, w, h, 0.14, 8, 41, w);
      });
    },
    metal(col) {
      return wallTex('metal' + (col || ''), (ctx, w, h) => {
        const c = HC.col(col || '#7b8084');
        for (let x = 0; x < w; x += 8) { const g = ctx.createLinearGradient(x, 0, x + 8, 0); g.addColorStop(0, C(HC.shade(c, 0.8))); g.addColorStop(0.5, C(HC.shade(c, 1.1))); g.addColorStop(1, C(HC.shade(c, 0.8))); ctx.fillStyle = g; ctx.fillRect(x, 0, 8, h); }
        grain(ctx, w, h, 0.2, 20, 77, w);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(110,60,30,.18)'; ctx.fillRect(Math.random() * w, Math.random() * h * 0.2, 3, Math.random() * h); }
      });
    },
    woodfence() {
      return wallTex('woodfence', (ctx, w, h) => {
        const r = HC.rng(5);
        for (let x = 0; x < w; x += 14) { ctx.fillStyle = C(HC.shade([126, 100, 72], r.range(0.8, 1.1))); ctx.fillRect(x + 1, 0, 12, h); }
        grain(ctx, w, h, 0.2, 10, 55, w);
      });
    },
    hedge() {
      return wallTex('hedge', (ctx, w, h) => {
        const r = HC.rng(6);
        ctx.fillStyle = C([46, 62, 34]); ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 700; i++) { ctx.fillStyle = C(r.pick([[58, 78, 40], [70, 92, 46], [40, 54, 30], [84, 104, 54]])); ctx.beginPath(); ctx.arc(r() * w, r() * h, r.range(1.5, 4), 0, 7); ctx.fill(); }
      });
    },
    sandbag() {
      return wallTex('sandbag', (ctx, w, h) => {
        const r = HC.rng(7), bh = 0.16 * T, bw = 0.42 * T;
        ctx.fillStyle = C([80, 72, 54]); ctx.fillRect(0, 0, w, h);
        for (let row = 0, y = 0; y < h; row++, y += bh) for (let x = -(row % 2) * bw / 2; x < w; x += bw) {
          const g = ctx.createLinearGradient(0, y, 0, y + bh); const c = HC.shade([150, 136, 100], r.range(0.85, 1.05));
          g.addColorStop(0, C(HC.shade(c, 1.1))); g.addColorStop(1, C(HC.shade(c, 0.7)));
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2 - 1, bh / 2 - 0.5, 0, 0, 7); ctx.fill();
        }
        grain(ctx, w, h, 0.18, 8, 33, w);
      });
    },
  };
  G.WT = WT;

  // ------------------------------------------------------------ iso box
  // Draws a box in local iso coords. fills: string colour or {tex, top(z anchor)}.
  function faceFill(ctx, fill, face, x0, y0, x1, y1, zt) {
    if (typeof fill === 'string') { ctx.fillStyle = fill; return; }
    const pat = ctx.createPattern(fill.tex, 'repeat');
    const top = fill.top !== undefined ? fill.top : HC.WALLH;
    const k = 1 / T;
    let o;
    if (face === 's') { o = P(0, y1, top); pat.setTransform(new DOMMatrix([32 * k, 16 * k, 0, 40 * k, o[0], o[1]])); }
    else { o = P(x1, 0, top); pat.setTransform(new DOMMatrix([-32 * k, 16 * k, 0, 40 * k, o[0], o[1]])); }
    ctx.fillStyle = pat;
  }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  G.poly = poly;
  function box(ctx, x0, y0, z0, x1, y1, z1, st) {
    const s = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
    const e = [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)];
    const t = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
    const sf = st.s || st.c, ef = st.e || st.c;
    if (sf && !st.noS) { poly(ctx, s); faceFill(ctx, sf, 's', x0, y0, x1, y1); ctx.fill(); if (st.shS !== 0) { ctx.fillStyle = `rgba(0,0,0,${st.shS === undefined ? 0.04 : st.shS})`; ctx.fill(); } }
    if (ef && !st.noE) { poly(ctx, e); faceFill(ctx, ef, 'e', x0, y0, x1, y1); ctx.fill(); ctx.fillStyle = `rgba(0,0,0,${st.shE === undefined ? 0.24 : st.shE})`; ctx.fill(); }
    if (!st.noT) { poly(ctx, t); ctx.fillStyle = st.t || (typeof st.c === 'string' ? st.c : '#2a2826'); ctx.fill(); if (st.shT) { ctx.fillStyle = `rgba(255,255,255,${st.shT})`; ctx.fill(); } }
    if (st.line) {
      ctx.strokeStyle = st.line; ctx.lineWidth = st.lw || 0.6; ctx.lineJoin = 'round';
      poly(ctx, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z1)]); ctx.stroke();
      ctx.beginPath(); const a = P(x1, y1, z0), b = P(x1, y1, z1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); const c2 = P(x0, y1, z1), d2 = P(x1, y0, z1); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d2[0], d2[1]); ctx.stroke();
    }
    return { s, e, t };
  }
  G.box = box;
  // draw on a face (south face y=y1 or east face x=x1): fn(u,v)->point mapping helpers
  G.onS = (y, x, z) => P(x, y, z);
  G.onE = (x, y, z) => P(x, y, z);

  // oriented thin box (for swinging doors). corners given by base segment (ax,ay)->(bx,by), thickness th, height h
  G.orientedSlab = function (ctx, ax, ay, bx, by, th, z0, z1, col, dark) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * th / 2, ny = (dx / L) * th / 2;
    const c = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
    // faces: 4 sides; draw those facing camera (+x+y)
    const sides = [];
    for (let i = 0; i < 4; i++) {
      const p = c[i], q = c[(i + 1) % 4];
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const onx = ey, ony = -ex;                // outward normal for CCW? decide by centroid
      const mx = (p[0] + q[0]) / 2 - (ax + bx) / 2, my = (p[1] + q[1]) / 2 - (ay + by) / 2;
      const sgn = onx * mx + ony * my >= 0 ? 1 : -1;
      const vx = onx * sgn, vy = ony * sgn;
      const facing = vx + vy;
      if (facing > 0) sides.push({ p, q, depth: (p[0] + q[0] + p[1] + q[1]) / 2, shade: vx > vy ? 0.26 : 0.06 });
    }
    sides.sort((a, b) => a.depth - b.depth);
    const base = HC.col(col);
    for (const s of sides) {
      poly(ctx, [P(s.p[0], s.p[1], z0), P(s.q[0], s.q[1], z0), P(s.q[0], s.q[1], z1), P(s.p[0], s.p[1], z1)]);
      ctx.fillStyle = C(HC.shade(base, (1 - s.shade) * (dark ? 0.55 : 1))); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    poly(ctx, c.map((p) => P(p[0], p[1], z1))); ctx.fillStyle = C(HC.shade(base, dark ? 0.4 : 0.7)); ctx.fill();
  };

  // ------------------------------------------------------------ wall tiles
  // spec: {kind, conn(NESW bits), texS, texE, cap, dark, cut}
  const wallCache = {};
  const TH = 0.2, C0 = 0.5 - TH / 2, C1 = 0.5 + TH / 2;
  G.WALL_TH = TH;
  function spriteCanvas(wTiles, hTiles, zMax) {
    const w = (wTiles + hTiles) * HC.HW, h = (wTiles + hTiles) * HC.HH + zMax * HC.ZP;
    const c = HC.canvas((w + 4) * SS, (h + 4) * SS);
    const x = c.getContext('2d');
    x.scale(SS, SS);
    x.translate(hTiles * HC.HW + 2, zMax * HC.ZP + 2);
    c.ox = hTiles * HC.HW + 2; c.oy = zMax * HC.ZP + 2; c.w = w + 4; c.h = h + 4;
    return c;
  }
  G.spriteCanvas = spriteCanvas;

  function armBoxes(conn) {
    const b = [];
    if (conn & 1) b.push([C0, 0, C1, C0]);
    if (conn & 8) b.push([0, C0, C0, C1]);
    b.push([C0, C0, C1, C1]);
    if (conn & 2) b.push([C1, C0, 1, C1]);
    if (conn & 4) b.push([C0, C1, C1, 1]);
    return b;
  }
  G.wallBoxes = function (kind, conn) {
    const th = kind === 'hedge' || kind === 'sandbag' ? 0.62 : kind === 'fence' || kind === 'woodfence' ? 0.08 : TH;
    const a = 0.5 - th / 2, b = 0.5 + th / 2;
    const out = [];
    if (conn & 1) out.push([a, 0, b, a]);
    if (conn & 8) out.push([0, a, a, b]);
    out.push([a, a, b, b]);
    if (conn & 2) out.push([b, a, 1, b]);
    if (conn & 4) out.push([a, b, b, 1]);
    return out;
  };

  G.wall = function (sp) {
    const key = [sp.kind, sp.conn, sp.texS && sp.texS.k, sp.texE && sp.texE.k, sp.dark ? 1 : 0, sp.cut ? 1 : 0, sp.broken ? 1 : 0].join('|');
    let c = wallCache[key];
    if (c) return c;
    c = wallCache[key] = spriteCanvas(1, 1, HC.WALLH + 0.2);
    const ctx = c.getContext('2d');
    const k = sp.kind;
    let hgt = HC.WALLH, th = TH;
    if (k === 'fence') hgt = 1.35; if (k === 'woodfence') hgt = 1.3; if (k === 'hedge') hgt = 0.95; if (k === 'sandbag') hgt = 0.72;
    if (sp.cut) hgt = Math.min(hgt, 0.22);
    const boxes = G.wallBoxes(k, sp.conn);
    // floor shadow (ambient occlusion)
    if (k !== 'fence' && !sp.cut) {
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (const bx of boxes) {
        poly(ctx, [P(bx[0] - 0.06, bx[3], 0), P(bx[2] + 0.12, bx[3], 0), P(bx[2] + 0.12, Math.min(1, bx[3] + 0.16), 0), P(bx[0] - 0.02, Math.min(1, bx[3] + 0.16), 0)]); ctx.fill();
        poly(ctx, [P(bx[2], bx[1] - 0.06, 0), P(Math.min(1, bx[2] + 0.14), bx[1], 0), P(Math.min(1, bx[2] + 0.14), bx[3] + 0.1, 0), P(bx[2], bx[3] + 0.1, 0)]); ctx.fill();
      }
      ctx.restore(); void g;
    }
    const dk = sp.dark ? 0.45 : 0;
    const fillS = sp.texS ? { tex: sp.texS.t, top: hgt === HC.WALLH ? HC.WALLH : hgt } : '#555';
    const fillE = sp.texE ? { tex: sp.texE.t, top: hgt === HC.WALLH ? HC.WALLH : hgt } : '#555';
    if (sp.cut && sp.texS) fillS.top = HC.WALLH; if (sp.cut && sp.texE) fillE.top = HC.WALLH;
    if (k === 'fence') {
      // chain-link: posts + mesh panels
      for (const bx of boxes) {
        const alongX = bx[2] - bx[0] > bx[3] - bx[1] + 0.01, alongY = bx[3] - bx[1] > bx[2] - bx[0] + 0.01;
        if (alongX || alongY) {
          const pts = alongX ? [P(bx[0], 0.5, 0), P(bx[2], 0.5, 0), P(bx[2], 0.5, hgt), P(bx[0], 0.5, hgt)] : [P(0.5, bx[1], 0), P(0.5, bx[3], 0), P(0.5, bx[3], hgt), P(0.5, bx[1], hgt)];
          poly(ctx, pts); ctx.fillStyle = sp.dark ? 'rgba(70,74,78,.18)' : 'rgba(150,156,160,.22)'; ctx.fill();
          ctx.save(); poly(ctx, pts); ctx.clip();
          ctx.strokeStyle = sp.dark ? 'rgba(90,94,98,.5)' : 'rgba(170,176,180,.7)'; ctx.lineWidth = 0.45;
          for (let i = -30; i < 30; i++) { ctx.beginPath(); ctx.moveTo(pts[0][0] + i * 3, pts[0][1] - 80); ctx.lineTo(pts[0][0] + i * 3 + 80, pts[0][1]); ctx.moveTo(pts[0][0] + i * 3, pts[0][1] + 10); ctx.lineTo(pts[0][0] + i * 3 + 80, pts[0][1] - 70); ctx.stroke(); }
          ctx.restore();
          const r0 = alongX ? P(bx[0], 0.5, hgt) : P(0.5, bx[1], hgt), r1 = alongX ? P(bx[2], 0.5, hgt) : P(0.5, bx[3], hgt);
          ctx.strokeStyle = sp.dark ? '#555' : '#9aa0a4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
        }
      }
      box(ctx, 0.46, 0.46, 0, 0.54, 0.54, hgt + 0.05, { c: sp.dark ? '#4a4c4e' : '#8d9296', t: '#b0b4b8' });
      return c;
    }
    for (const bx of boxes) {
      const endS = bx[3] === 1 && (bx[2] - bx[0]) < 0.9;     // thin end facing south
      const endE = bx[2] === 1 && (bx[3] - bx[1]) < 0.9;
      box(ctx, bx[0], bx[1], 0, bx[2], bx[3], hgt, {
        s: endS && k !== 'hedge' && k !== 'sandbag' ? (sp.cap2 || '#77716a') : fillS,
        e: endE && k !== 'hedge' && k !== 'sandbag' ? (sp.cap2 || '#77716a') : fillE,
        t: sp.cap || (k === 'hedge' ? '#3f5a2e' : k === 'sandbag' ? '#8a7c5a' : '#2b2927'), shS: 0.03 + dk, shE: 0.26 + dk * 0.8,
      });
    }
    if (k === 'hedge') { // leafy lumps on top
      const r = HC.rng(sp.conn * 13 + 1);
      for (const bx of boxes) for (let i = 0; i < 4; i++) {
        const px = HC.lerp(bx[0], bx[2], r()), py = HC.lerp(bx[1], bx[3], r()); const q = P(px, py, hgt);
        ctx.fillStyle = C(HC.shade([70, 94, 48], (sp.dark ? 0.5 : 1) * r.range(0.8, 1.2))); ctx.beginPath(); ctx.arc(q[0], q[1], r.range(4, 7), 0, 7); ctx.fill();
      }
    }
    return c;
  };

  // window tile: sill + lintel + glass
  G.windowTile = function (sp) {
    const key = ['win', sp.alongX ? 1 : 0, sp.texS && sp.texS.k, sp.texE && sp.texE.k, sp.dark ? 1 : 0, sp.broken ? 1 : 0, sp.cut ? 1 : 0].join('|');
    let c = wallCache[key]; if (c) return c;
    c = wallCache[key] = spriteCanvas(1, 1, HC.WALLH + 0.2);
    const ctx = c.getContext('2d');
    const dk = sp.dark ? 0.45 : 0;
    const fs = sp.texS ? { tex: sp.texS.t } : '#666', fe = sp.texE ? { tex: sp.texE.t } : '#666';
    const [x0, y0, x1, y1] = sp.alongX ? [0, C0, 1, C1] : [C0, 0, C1, 1];
    const st = { s: sp.alongX ? fs : '#77716a', e: sp.alongX ? '#77716a' : fe, t: '#2b2927', shS: 0.03 + dk, shE: 0.26 + dk * 0.8 };
    box(ctx, x0, y0, 0, x1, y1, 0.8, st);
    if (sp.cut) return c;
    // glass
    const gp = sp.alongX ? [P(0.05, 0.5, 0.8), P(0.95, 0.5, 0.8), P(0.95, 0.5, 1.5), P(0.05, 0.5, 1.5)] : [P(0.5, 0.05, 0.8), P(0.5, 0.95, 0.8), P(0.5, 0.95, 1.5), P(0.5, 0.05, 1.5)];
    if (!sp.broken) {
      poly(ctx, gp); ctx.fillStyle = sp.dark ? 'rgba(60,80,90,.45)' : 'rgba(150,190,205,.42)'; ctx.fill();
      ctx.save(); poly(ctx, gp); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gp[0][0] + 6, gp[3][1] + 20); ctx.lineTo(gp[0][0] + 20, gp[3][1] - 4); ctx.stroke(); ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(170,200,210,.5)';
      poly(ctx, [gp[0], [gp[0][0] + 6, gp[0][1] - 6], [gp[0][0] + 2, gp[0][1] - 16]]); ctx.fill();
      poly(ctx, [gp[2], [gp[2][0] - 8, gp[2][1] + 4], [gp[2][0] - 3, gp[2][1] + 14]]); ctx.fill();
    }
    // frame posts
    const fc = sp.dark ? '#6d6b66' : '#d8d4c8';
    if (sp.alongX) { box(ctx, 0, C0 + 0.03, 0.8, 0.07, C1 - 0.03, 1.5, { c: fc }); box(ctx, 0.93, C0 + 0.03, 0.8, 1, C1 - 0.03, 1.5, { c: fc }); }
    else { box(ctx, C0 + 0.03, 0, 0.8, C1 - 0.03, 0.07, 1.5, { c: fc }); box(ctx, C0 + 0.03, 0.93, 0.8, C1 - 0.03, 1, 1.5, { c: fc }); }
    box(ctx, x0, y0, 1.5, x1, y1, HC.WALLH, st);
    return c;
  };

  // door frame / lintel (panel is drawn live)
  G.doorFrame = function (sp) {
    const key = ['door', sp.alongX ? 1 : 0, sp.texS && sp.texS.k, sp.texE && sp.texE.k, sp.dark ? 1 : 0, sp.cut ? 1 : 0, sp.lock || ''].join('|');
    let c = wallCache[key]; if (c) return c;
    c = wallCache[key] = spriteCanvas(1, 1, HC.WALLH + 0.2);
    const ctx = c.getContext('2d');
    if (sp.cut) return c;
    const dk = sp.dark ? 0.45 : 0;
    const fs = sp.texS ? { tex: sp.texS.t } : '#666', fe = sp.texE ? { tex: sp.texE.t } : '#666';
    const [x0, y0, x1, y1] = sp.alongX ? [0, C0, 1, C1] : [C0, 0, C1, 1];
    box(ctx, x0, y0, 1.62, x1, y1, HC.WALLH, { s: sp.alongX ? fs : '#77716a', e: sp.alongX ? '#77716a' : fe, t: '#2b2927', shS: 0.03 + dk, shE: 0.26 + dk * 0.8 });
    if (sp.lock) {
      const lc = { red: '#d23a2a', blue: '#3a6ad2', yellow: '#e2b632' }[sp.lock];
      if (sp.alongX) box(ctx, 0.3, C1 - 0.01, 1.66, 0.7, C1 + 0.02, 1.78, { c: lc, t: lc });
      else box(ctx, C1 - 0.01, 0.3, 1.66, C1 + 0.02, 0.7, 1.78, { c: lc, t: lc });
    }
    return c;
  };

  // ------------------------------------------------------------ roofs
  const roofCache = {};
  const ROOF_COLS = [[74, 70, 68], [92, 66, 54], [66, 72, 78], [110, 92, 70], [58, 58, 60], [120, 70, 52]];
  G.roof = function (colIdx, edges, flat) {
    const key = colIdx + ':' + edges + ':' + (flat ? 1 : 0);
    let c = roofCache[key]; if (c) return c;
    c = roofCache[key] = spriteCanvas(1, 1, 0.1);
    const ctx = c.getContext('2d');
    const base = ROOF_COLS[colIdx % ROOF_COLS.length];
    const src = tex(T, T, (x, w, h) => {
      x.fillStyle = C(base); x.fillRect(0, 0, w, h);
      if (flat) { grain(x, w, h, 0.2, 20, colIdx + 5, w); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }
      else {
        const r = HC.rng(colIdx * 7 + 3), rh = 16, rw = 22;
        for (let row = 0, y = 0; y < h; row++, y += rh) for (let xx = -(row % 2) * rw / 2; xx < w; xx += rw) {
          const g = x.createLinearGradient(0, y, 0, y + rh); const cc = HC.shade(base, r.range(0.85, 1.12));
          g.addColorStop(0, C(HC.shade(cc, 1.1))); g.addColorStop(1, C(HC.shade(cc, 0.72)));
          x.fillStyle = g; x.fillRect(xx + 0.5, y, rw - 1, rh - 0.5);
        }
        grain(x, w, h, 0.15, 14, colIdx, w);
      }
    });
    const d = toDiamond(src, 0.05);
    ctx.drawImage(d, -HC.HW - 0.5 / SS, -0.5 / SS, d.width / SS, d.height / SS);
    // edge trim (N=1,E=2,S=4,W=8 are outer edges)
    ctx.strokeStyle = 'rgba(20,18,16,.8)'; ctx.lineWidth = 2;
    const e = [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(0, 1), P(1, 1)], [P(0, 0), P(0, 1)]];
    [1, 2, 4, 8].forEach((b, i) => { if (edges & b) { ctx.beginPath(); ctx.moveTo(e[i][0][0], e[i][0][1]); ctx.lineTo(e[i][1][0], e[i][1][1]); ctx.stroke(); } });
    if (edges & 4) { poly(ctx, [P(0, 1, 0), P(1, 1, 0), P(1, 1, -0.12), P(0, 1, -0.12)]); ctx.fillStyle = C(HC.shade(base, 0.55)); ctx.fill(); }
    if (edges & 2) { poly(ctx, [P(1, 0, 0), P(1, 1, 0), P(1, 1, -0.12), P(1, 0, -0.12)]); ctx.fillStyle = C(HC.shade(base, 0.42)); ctx.fill(); }
    return c;
  };

  // ------------------------------------------------------------ trees
  const treeCache = {};
  G.tree = function (v, dark) {
    const key = v + ':' + (dark ? 1 : 0);
    let c = treeCache[key]; if (c) return c;
    c = treeCache[key] = spriteCanvas(3, 3, 3.6);
    const ctx = c.getContext('2d');
    ctx.translate(-HC.HW * 0, 0);
    const r = HC.rng(v * 91 + 5);
    const bx = 1.5, by = 1.5;          // centre of 3x3 sprite footprint
    const base = P(bx, by, 0);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(base[0], base[1], 38, 18, 0, 0, 7); ctx.fill();
    // trunk
    const trunk = dark ? '#2e261e' : '#5a4632';
    ctx.strokeStyle = trunk; ctx.lineCap = 'round'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(base[0] + r.range(-4, 4), base[1] - 40, base[0] + r.range(-6, 6), base[1] - 70); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(base[0], base[1] - 45); ctx.lineTo(base[0] + 18, base[1] - 70); ctx.moveTo(base[0], base[1] - 50); ctx.lineTo(base[0] - 16, base[1] - 76); ctx.stroke();
    // canopy
    const hue = v % 3 === 0 ? [62, 82, 44] : v % 3 === 1 ? [74, 88, 46] : [56, 74, 50];
    const k = dark ? 0.45 : 1;
    const cy = base[1] - 92, blobs = [];
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 34; blobs.push([base[0] + Math.cos(a) * d * 1.25, cy + Math.sin(a) * d * 0.85, r.range(12, 22)]); }
    blobs.sort((a, b) => a[1] - b[1]);
    for (const b of blobs) { ctx.fillStyle = C(HC.shade(hue, 0.55 * k)); ctx.beginPath(); ctx.arc(b[0] + 2, b[1] + 3, b[2], 0, 7); ctx.fill(); }
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b[0] - b[2] * 0.4, b[1] - b[2] * 0.5, 1, b[0], b[1], b[2]);
      g.addColorStop(0, C(HC.shade(hue, 1.35 * k))); g.addColorStop(0.7, C(HC.shade(hue, 0.95 * k))); g.addColorStop(1, C(HC.shade(hue, 0.7 * k)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b[0], b[1], b[2] * 0.92, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 120; i++) { const b = r.pick(blobs); ctx.fillStyle = C(HC.shade(hue, r.range(0.6, 1.5) * k), 0.7); ctx.fillRect(b[0] + r.range(-b[2], b[2]) * 0.8, b[1] + r.range(-b[2], b[2]) * 0.8, 2, 2); }
    c.baseX = base[0]; c.baseY = base[1];
    return c;
  };

  // ------------------------------------------------------------ props
  const propCache = {};
  const S = C;
  function woodC(k) { return C(HC.shade([128, 90, 56], k || 1)); }
  const PROPS = {};
  G.PROPS = PROPS;
  // each: {h: max height, draw(ctx, w, d, o)} where w,d are footprint (x,y) and o = options {face, col, dark, var}
  function faceDetail(o, side) { return o.face === side; }
  PROPS.counter = { h: 1.05, draw(ctx, w, d, o) {
    const body = o.col || '#d8d0bc';
    box(ctx, 0.04, 0.04, 0, w - 0.04, d - 0.04, 0.86, { c: body, line: 'rgba(0,0,0,.25)' });
    box(ctx, 0, 0, 0.86, w, d, 0.94, { c: '#6d6258', t: '#8f8579', shT: 0.05 });
    if (faceDetail(o, 'S')) for (let x = 0.2; x < w; x += 0.5) { const a = P(x, d - 0.04, 0.7), b = P(x + 0.18, d - 0.04, 0.7); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    if (faceDetail(o, 'E')) for (let y = 0.2; y < d; y += 0.5) { const a = P(w - 0.04, y, 0.7), b = P(w - 0.04, y + 0.18, 0.7); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  } };
  PROPS.fridge = { h: 1.8, draw(ctx, w, d, o) {
    box(ctx, 0.12, 0.12, 0, 0.88, 0.88, 1.7, { c: o.col || '#dcd8cb', t: '#e8e4d8', line: 'rgba(0,0,0,.3)' });
    ctx.strokeStyle = '#8a877e'; ctx.lineWidth = 1.2;
    if (o.face === 'S') { const a = P(0.12, 0.88, 1.12), b = P(0.88, 0.88, 1.12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const h1 = P(0.78, 0.88, 1.3), h2 = P(0.78, 0.88, 1.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke(); }
    if (o.face === 'E') { const a = P(0.88, 0.12, 1.12), b = P(0.88, 0.88, 1.12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const h1 = P(0.88, 0.22, 1.3), h2 = P(0.88, 0.22, 1.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke(); }
  } };
  PROPS.stove = { h: 1.0, draw(ctx, w, d, o) {
    box(ctx, 0.06, 0.06, 0, 0.94, 0.94, 0.9, { c: '#e2ddd0', t: '#2a2a2a', line: 'rgba(0,0,0,.3)' });
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(([x, y]) => { const p = P(x, y, 0.9); ctx.beginPath(); ctx.ellipse(p[0], p[1], 5, 2.5, 0, 0, 7); ctx.stroke(); });
    if (o.face === 'S') { const q = [P(0.2, 0.94, 0.65), P(0.8, 0.94, 0.65), P(0.8, 0.94, 0.2), P(0.2, 0.94, 0.2)]; poly(ctx, q); ctx.fillStyle = '#222'; ctx.fill(); }
    if (o.face === 'E') { const q = [P(0.94, 0.2, 0.65), P(0.94, 0.8, 0.65), P(0.94, 0.8, 0.2), P(0.94, 0.2, 0.2)]; poly(ctx, q); ctx.fillStyle = '#222'; ctx.fill(); }
  } };
  PROPS.table = { h: 0.85, draw(ctx, w, d, o) {
    const c = o.col || woodC(); const leg = HC.shade(HC.col(typeof c === 'string' && c[0] === '#' ? c : '#6a4a30'), 0.7);
    [[0.12, 0.12], [w - 0.18, 0.12], [0.12, d - 0.18], [w - 0.18, d - 0.18]].forEach(([x, y]) => box(ctx, x, y, 0, x + 0.06, y + 0.06, 0.72, { c: C(leg) }));
    box(ctx, 0.06, 0.06, 0.72, w - 0.06, d - 0.06, 0.78, { c, shT: 0.06, line: 'rgba(0,0,0,.25)' });
    if (o.var % 3 === 0) { const p = P(w / 2, d / 2, 0.78); ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.ellipse(p[0], p[1], 6, 3, 0, 0, 7); ctx.fill(); }
  } };
  PROPS.chair = { h: 1.0, draw(ctx, w, d, o) {
    const c = o.col || woodC(0.9);
    [[0.3, 0.3], [0.64, 0.3], [0.3, 0.64], [0.64, 0.64]].forEach(([x, y]) => box(ctx, x, y, 0, x + 0.05, y + 0.05, 0.42, { c: '#3a2a1c' }));
    box(ctx, 0.28, 0.28, 0.42, 0.72, 0.72, 0.48, { c });
    const f = o.face;
    if (f === 'N' || f === 'S') box(ctx, 0.28, f === 'S' ? 0.28 : 0.66, 0.48, 0.72, f === 'S' ? 0.34 : 0.72, 0.95, { c });
    else box(ctx, f === 'E' ? 0.28 : 0.66, 0.28, 0.48, f === 'E' ? 0.34 : 0.72, 0.72, 0.95, { c });
  } };
  PROPS.bed = { h: 0.8, draw(ctx, w, d, o) {
    const alongX = w > d; const L = alongX ? w : d;
    box(ctx, 0.08, 0.08, 0, w - 0.08, d - 0.08, 0.3, { c: woodC(0.8), line: 'rgba(0,0,0,.3)' });
    box(ctx, 0.12, 0.12, 0.3, w - 0.12, d - 0.12, 0.5, { c: '#ece6d8' });
    const bl = o.col || '#6b7d9a';
    if (alongX) { box(ctx, L * 0.32, 0.1, 0.5, w - 0.1, d - 0.1, 0.58, { c: bl, line: 'rgba(0,0,0,.2)' }); box(ctx, 0.2, 0.25, 0.5, 0.55, d - 0.25, 0.64, { c: '#f4efe4' }); box(ctx, 0.02, 0.06, 0, 0.12, d - 0.06, 0.85, { c: woodC(0.7) }); }
    else { box(ctx, 0.1, L * 0.32, 0.5, w - 0.1, d - 0.1, 0.58, { c: bl, line: 'rgba(0,0,0,.2)' }); box(ctx, 0.25, 0.2, 0.5, w - 0.25, 0.55, 0.64, { c: '#f4efe4' }); box(ctx, 0.06, 0.02, 0, w - 0.06, 0.12, 0.85, { c: woodC(0.7) }); }
  } };
  PROPS.hbed = { h: 0.9, draw(ctx, w, d, o) {
    const alongX = w > d;
    [[0.15, 0.15], [w - 0.2, 0.15], [0.15, d - 0.2], [w - 0.2, d - 0.2]].forEach(([x, y]) => box(ctx, x, y, 0, x + 0.05, y + 0.05, 0.45, { c: '#9aa0a4' }));
    box(ctx, 0.1, 0.1, 0.45, w - 0.1, d - 0.1, 0.62, { c: '#c9d6de', line: 'rgba(0,0,0,.25)' });
    if (alongX) { box(ctx, 0.2, 0.25, 0.62, 0.6, d - 0.25, 0.72, { c: '#f2f2ee' }); box(ctx, 0.95, 0.12, 0.62, w - 0.12, d - 0.12, 0.66, { c: o.col || '#8fb0c4' }); }
    else { box(ctx, 0.25, 0.2, 0.62, w - 0.25, 0.6, 0.72, { c: '#f2f2ee' }); box(ctx, 0.12, 0.95, 0.62, w - 0.12, d - 0.12, 0.66, { c: o.col || '#8fb0c4' }); }
    ctx.strokeStyle = '#b8bec2'; ctx.lineWidth = 1.2;
    const a = P(0.1, d - 0.1, 0.8), b = P(w - 0.1, d - 0.1, 0.8); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  } };
  PROPS.sofa = { h: 0.9, draw(ctx, w, d, o) {
    const c = o.col || '#6e5a44', f = o.face;
    box(ctx, 0.06, 0.06, 0, w - 0.06, d - 0.06, 0.42, { c, line: 'rgba(0,0,0,.25)' });
    if (f === 'S') box(ctx, 0.06, 0.06, 0.42, w - 0.06, 0.3, 0.88, { c });
    else if (f === 'N') box(ctx, 0.06, d - 0.3, 0.42, w - 0.06, d - 0.06, 0.88, { c });
    else if (f === 'E') box(ctx, 0.06, 0.06, 0.42, 0.3, d - 0.06, 0.88, { c });
    else box(ctx, w - 0.3, 0.06, 0.42, w - 0.06, d - 0.06, 0.88, { c });
  } };
  PROPS.tv = { h: 1.2, draw(ctx, w, d, o) {
    box(ctx, 0.15, 0.15, 0, 0.85, 0.85, 0.5, { c: woodC(0.7) });
    box(ctx, 0.25, 0.25, 0.5, 0.75, 0.75, 1.05, { c: '#2b2a28', line: 'rgba(0,0,0,.4)' });
    const scr = o.face === 'E' ? [P(0.75, 0.32, 0.98), P(0.75, 0.68, 0.98), P(0.75, 0.68, 0.58), P(0.75, 0.32, 0.58)] : [P(0.32, 0.75, 0.98), P(0.68, 0.75, 0.98), P(0.68, 0.75, 0.58), P(0.32, 0.75, 0.58)];
    if (o.face === 'E' || o.face === 'S') { poly(ctx, scr); ctx.fillStyle = o.dark ? '#1a1f22' : '#45585e'; ctx.fill(); }
  } };
  PROPS.shelf = { h: 1.7, draw(ctx, w, d, o) {
    const r = HC.rng(o.var * 7 + 1);
    box(ctx, 0.08, 0.08, 0, w - 0.08, d - 0.08, 1.6, { c: '#8c9094', t: '#a4a8ac', line: 'rgba(0,0,0,.3)' });
    const sideS = o.face !== 'N' && o.face !== 'W';
    for (let z = 0.15; z < 1.5; z += 0.36) {
      for (let i = 0; i < (w > d ? w : d) * 5; i++) {
        const cc = r.pick(['#b8402e', '#d8b040', '#3a6aa0', '#e8e2d0', '#4c8a4c', '#c86a2a', '#7a4a8a']);
        const t0 = 0.1 + i * 0.19, t1 = t0 + 0.15;
        if (t1 > (w > d ? w : d) - 0.1) break;
        const hh = r.range(0.14, 0.28);
        if (w >= d && sideS) box(ctx, t0, d - 0.22, z, t1, d - 0.1, z + hh, { c: cc, shS: 0.1 });
        else if (w < d) box(ctx, w - 0.22, t0, z, w - 0.1, t1, z + hh, { c: cc, shE: 0.2 });
      }
      if (w >= d) box(ctx, 0.08, 0.08, z - 0.03, w - 0.08, d - 0.08, z, { c: '#a8acb0' });
      else box(ctx, 0.08, 0.08, z - 0.03, w - 0.08, d - 0.08, z, { c: '#a8acb0' });
    }
  } };
  PROPS.bookshelf = { h: 1.8, draw(ctx, w, d, o) {
    box(ctx, 0.1, 0.1, 0, w - 0.1, d - 0.1, 1.7, { c: woodC(0.75), line: 'rgba(0,0,0,.3)' });
    const r = HC.rng(o.var + 3);
    for (let z = 0.2; z < 1.6; z += 0.38) for (let t = 0.14; t < 0.86; t += 0.07) {
      const cc = r.pick(['#7a2a22', '#2a3e5a', '#4e5a2a', '#8a6a3a', '#5a2a4a', '#c8b890']);
      if (o.face === 'E') box(ctx, 0.9, t, z, 0.92, t + 0.055, z + r.range(0.22, 0.3), { c: cc });
      else if (o.face === 'S') box(ctx, t, 0.9, z, t + 0.055, 0.92, z + r.range(0.22, 0.3), { c: cc });
    }
  } };
  PROPS.desk = { h: 1.2, draw(ctx, w, d, o) {
    box(ctx, 0.06, 0.06, 0, w - 0.06, d - 0.06, 0.74, { c: o.col || '#7a6048', line: 'rgba(0,0,0,.3)' });
    box(ctx, 0.02, 0.02, 0.74, w - 0.02, d - 0.02, 0.8, { c: '#5e4a36' });
    if (o.var % 2 === 0) { box(ctx, w / 2 - 0.2, d / 2 - 0.2, 0.8, w / 2 + 0.2, d / 2 + 0.2, 1.15, { c: '#cfc8b4', line: 'rgba(0,0,0,.3)' }); }
    else { const p = P(w / 2, d / 2, 0.8); ctx.fillStyle = '#eee'; ctx.fillRect(p[0] - 6, p[1] - 3, 10, 5); ctx.fillStyle = '#ddd'; ctx.fillRect(p[0] - 3, p[1] - 5, 10, 5); }
  } };
  PROPS.filing = { h: 1.35, draw(ctx, w, d, o) {
    box(ctx, 0.2, 0.2, 0, 0.8, 0.8, 1.3, { c: o.col || '#6e7478', t: '#80868a', line: 'rgba(0,0,0,.3)' });
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8;
    for (let z = 0.32; z < 1.3; z += 0.32) { if (o.face === 'S' || o.face === 'N') { const a = P(0.2, 0.8, z), b = P(0.8, 0.8, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } else { const a = P(0.8, 0.2, z), b = P(0.8, 0.8, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
  } };
  PROPS.vending = { h: 1.95, draw(ctx, w, d, o) {
    const c = o.col || (o.var % 2 ? '#a02a24' : '#2a4a8a');
    box(ctx, 0.1, 0.12, 0, 0.9, 0.88, 1.9, { c, line: 'rgba(0,0,0,.35)' });
    const q = o.face === 'E' ? [P(0.9, 0.2, 1.8), P(0.9, 0.62, 1.8), P(0.9, 0.62, 0.6), P(0.9, 0.2, 0.6)] : [P(0.2, 0.88, 1.8), P(0.62, 0.88, 1.8), P(0.62, 0.88, 0.6), P(0.2, 0.88, 0.6)];
    poly(ctx, q); ctx.fillStyle = o.dark ? '#33403c' : '#bfe0d8'; ctx.fill();
  } };
  PROPS.bench = { h: 0.8, draw(ctx, w, d, o) {
    const ax = w > d;
    box(ctx, 0.1, 0.1, 0, ax ? 0.2 : w - 0.1, ax ? d - 0.1 : 0.2, 0.42, { c: '#3c3c3c' });
    box(ctx, ax ? w - 0.2 : 0.1, ax ? 0.1 : d - 0.2, 0, w - 0.1, d - 0.1, 0.42, { c: '#3c3c3c' });
    box(ctx, 0.05, 0.2, 0.42, w - 0.05, d - 0.2, 0.5, { c: woodC(0.85) });
  } };
  PROPS.dumpster = { h: 1.3, draw(ctx, w, d, o) {
    box(ctx, 0.08, 0.08, 0.1, w - 0.08, d - 0.08, 1.15, { c: o.col || '#3e5a44', line: 'rgba(0,0,0,.35)' });
    box(ctx, 0.04, 0.04, 1.15, w - 0.04, d - 0.04, 1.22, { c: '#2a2a2a' });
  } };
  PROPS.crate = { h: 0.95, draw(ctx, w, d, o) {
    box(ctx, 0.1, 0.1, 0, w - 0.1, d - 0.1, 0.85, { c: o.col || '#9a7a4e', line: 'rgba(40,24,10,.6)', lw: 1 });
    ctx.strokeStyle = 'rgba(50,30,14,.5)'; ctx.lineWidth = 1;
    const a = P(0.1, d - 0.1, 0), b = P(w - 0.1, d - 0.1, 0.85); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const c2 = P(w - 0.1, 0.1, 0), d2 = P(w - 0.1, d - 0.1, 0.85); ctx.beginPath(); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.stroke();
  } };
  function cyl(ctx, cx, cy, r, z0, z1, col, top) {
    const a = P(cx, cy, z0), b = P(cx, cy, z1), rx = r * 45, ry = r * 22.5;
    const g = ctx.createLinearGradient(a[0] - rx, 0, a[0] + rx, 0);
    const c = HC.col(col); g.addColorStop(0, C(HC.shade(c, 1.1))); g.addColorStop(0.6, C(HC.shade(c, 0.85))); g.addColorStop(1, C(HC.shade(c, 0.55)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(a[0], a[1], rx, ry, 0, 0, Math.PI); ctx.lineTo(b[0] - rx, b[1]); ctx.ellipse(b[0], b[1], rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = top || C(HC.shade(c, 0.75)); ctx.beginPath(); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, 7); ctx.fill();
  }
  G.cyl = cyl;
  PROPS.barrel = { h: 1.0, draw(ctx, w, d, o) { cyl(ctx, 0.5, 0.5, 0.28, 0, 0.9, o.col || '#4e5a3a'); } };
  PROPS.trash = { h: 0.8, draw(ctx, w, d, o) { cyl(ctx, 0.5, 0.5, 0.22, 0, 0.7, o.col || '#5a5e60', '#3a3c3e'); } };
  PROPS.streetlamp = { h: 3.4, draw(ctx, w, d, o) {
    box(ctx, 0.44, 0.44, 0, 0.56, 0.56, 0.2, { c: '#4a4a4a' });
    box(ctx, 0.47, 0.47, 0, 0.53, 0.53, 3.1, { c: '#5a5e62' });
    box(ctx, 0.47, 0.2, 3.05, 0.53, 0.53, 3.12, { c: '#5a5e62' });
    box(ctx, 0.42, 0.1, 2.95, 0.58, 0.32, 3.1, { c: '#3a3a3a', t: '#444' });
    const p = P(0.5, 0.21, 2.95); ctx.fillStyle = o.dark ? '#665' : '#fff1c8'; ctx.beginPath(); ctx.ellipse(p[0], p[1], 5, 2.5, 0, 0, 7); ctx.fill();
  } };
  PROPS.mailbox = { h: 1.2, draw(ctx) { box(ctx, 0.46, 0.46, 0, 0.54, 0.54, 0.9, { c: '#5a4632' }); box(ctx, 0.36, 0.3, 0.9, 0.64, 0.7, 1.12, { c: '#9aa0a4', t: '#aab0b4' }); } };
  PROPS.generator = { h: 1.0, draw(ctx, w, d, o) { box(ctx, 0.1, 0.15, 0, w - 0.1, d - 0.15, 0.8, { c: '#c8a434', line: 'rgba(0,0,0,.35)' }); box(ctx, 0.3, 0.3, 0.8, w - 0.3, d - 0.3, 0.92, { c: '#333' }); } };
  PROPS.washer = { h: 1.0, draw(ctx, w, d, o) { box(ctx, 0.1, 0.1, 0, 0.9, 0.9, 0.9, { c: '#e4e2da', line: 'rgba(0,0,0,.3)' }); const p = o.face === 'E' ? P(0.9, 0.5, 0.45) : P(0.5, 0.9, 0.45); ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p[0], p[1], 6, 8, 0, 0, 7); ctx.stroke(); } };
  PROPS.toilet = { h: 0.8, draw(ctx) { box(ctx, 0.3, 0.3, 0, 0.7, 0.7, 0.42, { c: '#eeeee8' }); box(ctx, 0.3, 0.2, 0.42, 0.7, 0.36, 0.78, { c: '#eeeee8' }); } };
  PROPS.tub = { h: 0.6, draw(ctx, w, d) { box(ctx, 0.08, 0.08, 0, w - 0.08, d - 0.08, 0.55, { c: '#eeeee8', t: '#d8dcdc', line: 'rgba(0,0,0,.25)' }); } };
  PROPS.wardrobe = { h: 1.9, draw(ctx, w, d, o) { box(ctx, 0.1, 0.1, 0, w - 0.1, d - 0.1, 1.85, { c: woodC(0.8), line: 'rgba(0,0,0,.35)' }); } };
  PROPS.checkout = { h: 1.2, draw(ctx, w, d, o) {
    box(ctx, 0.05, 0.1, 0, w - 0.05, d - 0.1, 0.9, { c: '#5a5e62', t: '#2a2a2a', line: 'rgba(0,0,0,.3)' });
    box(ctx, 0.2, 0.25, 0.9, 0.55, 0.6, 1.15, { c: '#d8d4c4', line: 'rgba(0,0,0,.3)' });
  } };
  PROPS.rack = { h: 1.5, draw(ctx, w, d, o) {
    const r = HC.rng(o.var + 11); cyl(ctx, 0.5, 0.5, 0.3, 0, 0.05, '#666');
    box(ctx, 0.48, 0.48, 0, 0.52, 0.52, 1.4, { c: '#888' });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const x = 0.5 + Math.cos(a) * 0.28, y = 0.5 + Math.sin(a) * 0.28; box(ctx, x - 0.06, y - 0.06, 0.55, x + 0.06, y + 0.06, 1.3, { c: r.pick(['#7a2a2a', '#2a4a6a', '#c8b890', '#4a6a3a', '#8a6a9a', '#ddd']) }); }
  } };
  PROPS.planter = { h: 1.2, draw(ctx, w, d, o) {
    box(ctx, 0.05, 0.05, 0, w - 0.05, d - 0.05, 0.5, { c: '#8a8274', line: 'rgba(0,0,0,.3)' });
    const r = HC.rng(o.var + 2);
    for (let i = 0; i < 10 * w * d; i++) { const p = P(r.range(0.2, w - 0.2), r.range(0.2, d - 0.2), 0.5 + r.range(0.1, 0.5)); ctx.fillStyle = C(HC.shade([70, 96, 50], r.range(0.7, 1.3) * (o.dark ? 0.5 : 1))); ctx.beginPath(); ctx.arc(p[0], p[1], r.range(4, 8), 0, 7); ctx.fill(); }
  } };
  PROPS.sawhorse = { h: 1.0, draw(ctx, w, d, o) {
    const ax = w >= d;
    box(ctx, ax ? 0.1 : 0.4, ax ? 0.4 : 0.1, 0, ax ? 0.16 : 0.6, ax ? 0.6 : 0.16, 0.8, { c: '#ddd' });
    box(ctx, ax ? w - 0.16 : 0.4, ax ? 0.4 : d - 0.16, 0, ax ? w - 0.1 : 0.6, ax ? 0.6 : d - 0.1, 0.8, { c: '#ddd' });
    const pts = ax ? [0.05, 0.46, w - 0.05, 0.54] : [0.46, 0.05, 0.54, d - 0.05];
    box(ctx, pts[0], pts[1], 0.62, pts[2], pts[3], 0.82, { c: '#e46a1a', t: '#f0f0f0' });
    ctx.save(); poly(ctx, ax ? [P(0.05, 0.54, 0.62), P(w - 0.05, 0.54, 0.62), P(w - 0.05, 0.54, 0.82), P(0.05, 0.54, 0.82)] : [P(0.54, 0.05, 0.62), P(0.54, d - 0.05, 0.62), P(0.54, d - 0.05, 0.82), P(0.54, 0.05, 0.82)]); ctx.clip();
    ctx.fillStyle = '#f2f2f2'; for (let i = -10; i < 40; i += 6) { const a = P(ax ? i * 0.1 : 0.54, ax ? 0.54 : i * 0.1, 0.5); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + 5, a[1] - 20); ctx.lineTo(a[0] + 9, a[1] - 20); ctx.lineTo(a[0] + 4, a[1]); ctx.fill(); }
    ctx.restore();
  } };
  PROPS.cone = { h: 0.6, draw(ctx) { const b = P(0.5, 0.5, 0), t = P(0.5, 0.5, 0.55); box(ctx, 0.35, 0.35, 0, 0.65, 0.65, 0.04, { c: '#d05a1a' }); ctx.fillStyle = '#e8641e'; ctx.beginPath(); ctx.moveTo(b[0] - 7, b[1] - 1); ctx.lineTo(t[0], t[1]); ctx.lineTo(b[0] + 7, b[1] - 1); ctx.fill(); ctx.fillStyle = '#eee'; ctx.fillRect(b[0] - 4, b[1] - 12, 8, 3); } };
  PROPS.morgue = { h: 1.9, draw(ctx, w, d, o) {
    box(ctx, 0.05, 0.05, 0, w - 0.05, d - 0.05, 1.85, { c: '#9ea4a8', t: '#7a8084', line: 'rgba(0,0,0,.35)' });
    ctx.strokeStyle = 'rgba(40,44,48,.6)'; ctx.lineWidth = 1;
    for (let z = 0.1; z < 1.8; z += 0.58) for (let t = 0; t < (w > d ? w : d) - 0.1; t += 0.5) {
      const q = w > d ? [P(t + 0.1, d - 0.05, z + 0.5), P(t + 0.45, d - 0.05, z + 0.5), P(t + 0.45, d - 0.05, z), P(t + 0.1, d - 0.05, z)] : [P(w - 0.05, t + 0.1, z + 0.5), P(w - 0.05, t + 0.45, z + 0.5), P(w - 0.05, t + 0.45, z), P(w - 0.05, t + 0.1, z)];
      poly(ctx, q); ctx.stroke();
    }
  } };
  PROPS.radio = { h: 1.5, draw(ctx, w, d, o) {
    PROPS.table.draw(ctx, w, d, { col: '#5a5a4e', var: 1 });
    box(ctx, 0.2, 0.2, 0.78, 0.75, 0.6, 1.1, { c: '#4a5a3a', line: 'rgba(0,0,0,.4)' });
    const p = P(0.3, 0.45, 1.1), q = P(0.3, 0.45, 1.9); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    const l = P(0.75, 0.3, 1.0); ctx.fillStyle = o.dark ? '#2a3' : '#6f6'; ctx.fillRect(l[0] - 1, l[1] - 1, 3, 3);
  } };
  PROPS.cabinet = { h: 1.3, draw(ctx, w, d, o) { box(ctx, 0.12, 0.12, 0, w - 0.12, d - 0.12, 1.2, { c: o.col || '#ccc8bc', line: 'rgba(0,0,0,.3)' }); } };
  PROPS.gurney = { h: 0.9, draw(ctx, w, d, o) {
    [[0.2, 0.2], [w - 0.25, 0.2], [0.2, d - 0.25], [w - 0.25, d - 0.25]].forEach(([x, y]) => box(ctx, x, y, 0, x + 0.04, y + 0.04, 0.62, { c: '#aaa' }));
    box(ctx, 0.15, 0.15, 0.62, w - 0.15, d - 0.15, 0.72, { c: '#e8ecee', line: 'rgba(0,0,0,.25)' });
    if (o.var % 2) { box(ctx, 0.25, 0.25, 0.72, w - 0.25, d - 0.25, 0.86, { c: '#dcdcd4' }); }
  } };
  PROPS.pallet = { h: 0.9, draw(ctx, w, d, o) { box(ctx, 0.05, 0.05, 0, w - 0.05, d - 0.05, 0.12, { c: '#a0845a' }); box(ctx, 0.15, 0.15, 0.12, w - 0.15, d - 0.15, 0.8, { c: o.col || '#b8a47a', line: 'rgba(0,0,0,.3)' }); } };
  PROPS.switch = { h: 1.4, draw(ctx, w, d, o) {
    box(ctx, 0.3, 0.3, 0, 0.7, 0.7, 1.25, { c: '#6a7076', t: '#7a8086', line: 'rgba(0,0,0,.4)' });
    const on = o.var === 1;
    const l = o.face === 'E' ? P(0.7, 0.5, 1.05) : P(0.5, 0.7, 1.05);
    ctx.fillStyle = on ? '#3f3' : '#f33'; ctx.beginPath(); ctx.arc(l[0], l[1], 2.2, 0, 7); ctx.fill();
    const hb = o.face === 'E' ? P(0.72, 0.5, 0.75) : P(0.5, 0.72, 0.75);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hb[0], hb[1]); ctx.lineTo(hb[0] + 3, hb[1] + (on ? 8 : -8)); ctx.stroke();
    ctx.fillStyle = '#e2b632'; ctx.fillRect(l[0] - 5, l[1] + 10, 10, 3);
  } };
  // --- vehicles: low-poly meshes (HC.mesh) baked once per sprite key. Canonical frame: centred on the origin,
  // nose toward +x, length along x. Layers: 0 wheel wells, 1 wheels, 2 lower body, 3 shoulder/hood/deck/bed,
  // 4 greenhouse/cargo box/mirrors, 5 roof gear. var bit 0 flips the nose; civilian model = var >> 1.
  const VM = HC.mesh;
  const VC = {
    glass: [44, 58, 68], trim: [30, 31, 33], tyre: [36, 36, 38], rim: [148, 150, 150], hub: [70, 72, 74],
    head: [240, 236, 206], tail: [196, 34, 28], amber: [222, 146, 44], plate: [214, 208, 170], well: [16, 15, 15],
    chrome: [150, 154, 158], dirt: [74, 60, 42], rust: [118, 64, 34], soot: [12, 11, 10],
  };
  const CIV_MODELS = ['sedan', 'sedan', 'wagon', 'pickup', 'sedan', 'hatch'];
  function vehicleSpec(kind, model, L, col) {
    const paint = HC.col(col);
    const S = {
      L, hw: 0.72, sill: 0.17, wr: 0.25, ww: 0.19, axF: 0.86, axR: -0.76, ra: 0.3, zc: 0.22,
      bum: [0.2, 0.34], bumD: 0.05, bumCol: VC.chrome, noseIn: 0.1, tailIn: 0.07,
      hoodF: 0.64, belt: 0.74, deckR: 0.71, cb: 0.1, cv: 0.07,
      gh: { wb: 0.6, rf: 0.2, rr: -0.56, rb: -0.88, roof: 1.1, gi: 0.1, rw: 0.5 },
      paint, roofCol: paint, pillar: paint, glass: VC.glass, doors: 4, dirt: 0.5, kind, model,
    };
    if (model === 'wagon') Object.assign(S.gh, { rr: -1.26, rb: -1.32 }), S.deckR = S.belt - 0.01, S.rails = 1;
    if (model === 'hatch') Object.assign(S.gh, { rf: 0.2, rr: -0.42, rb: -1.2 }), S.deckR = 0.7, S.doors = 2;
    if (model === 'pickup') Object.assign(S.gh, { wb: 0.6, rf: 0.28, rr: -0.12, rb: -0.18, roof: 1.12 }), S.deckEnd = -0.22, S.bed = 1, S.doors = 2, S.bumCol = [120, 122, 124];
    if (kind === 'police') {
      S.paint = [24, 25, 27]; S.roofCol = [226, 226, 222]; S.pillar = [24, 25, 27]; S.white = [228, 228, 224]; S.dirt = 0.25;
      S.bumCol = [26, 26, 28]; S.pushbar = 1; S.lightbar = 1;
    }
    if (kind === 'ambulance') {
      Object.assign(S, { hw: 0.73, sill: 0.2, wr: 0.26, axF: 0.92, axR: -0.76, zc: 0.24, ra: 0.32, hoodF: 0.74, belt: 0.82, noseIn: 0.08,
        deckEnd: 0.12, dirt: 0.3, doors: 2, bumCol: [120, 122, 124] });
      S.paint = S.roofCol = S.pillar = [232, 230, 222];
      S.gh = { wb: 0.62, rf: 0.4, rr: 0.1, rb: 0.1, roof: 1.36, gi: 0.1, rw: 0.58 };
      S.box = { x0: -L / 2 + 0.02, x1: 0.16, hw: 0.8, z0: 0.58, z1: 1.8, ch: 0.07, col: [232, 230, 222] };
    }
    if (kind === 'humvee') {
      Object.assign(S, { hw: 0.86, sill: 0.36, wr: 0.32, ww: 0.27, axF: 0.98, axR: -1.0, ra: 0.36, zc: 0.36, bum: [0.36, 0.52], bumD: 0.07,
        bumCol: [34, 35, 33], noseIn: 0.3, tailIn: 0.04, hoodF: 0.96, belt: 0.98, deckR: 0.96, cb: 0.05, cv: 0.04, dirt: 0.8, doors: 4, humvee: 1 });
      S.gh = { wb: 0.36, rf: 0.3, rr: -0.62, rb: -0.66, roof: 1.44, gi: 0.07, rw: 0.72 };
      S.pillar = S.paint; S.glass = [40, 50, 50];
    }
    if (kind === 'wreck') {
      S.paint = HC.mix(paint, [34, 31, 29], 0.72); S.roofCol = S.paint; S.pillar = S.paint; S.glass = [18, 16, 15];
      S.wreck = 1; S.dirt = 0; S.bumCol = [60, 56, 52]; S.gh.roof -= 0.07; S.wr = 0.2;
    }
    return S;
  }

  function vehicleMesh(S, rng) {
    const m = VM.create(), g = S.gh, hx = S.L / 2, hw = S.hw;
    const xf = hx - S.noseIn, xr = -hx + S.tailIn, deckEnd = S.deckEnd !== undefined ? S.deckEnd : xr;
    const ease = (t) => t * t * (1.25 - 0.25 * t);
    const shZ = (x) => (x >= g.wb ? S.belt + (S.hoodF - S.belt) * ease((x - g.wb) / (xf - g.wb))
      : x <= g.rb ? S.belt + (S.deckR - S.belt) * ease((g.rb - x) / Math.max(0.01, g.rb - xr)) : S.belt);
    // shoulder section stations (front -> rear)
    const xs = [xf, xf - 0.1, (xf + g.wb) / 2, g.wb];
    if (deckEnd < g.rb - 0.02) { xs.push(g.rb); if (!S.bed) { const mid = (g.rb + deckEnd) / 2; if (g.rb - deckEnd > 0.3) xs.push(mid); xs.push(deckEnd + 0.08); } }
    xs.push(deckEnd);
    // ---- lower body: side profile extruded across the width, wheel arches cut into the sill
    const prof = [], et = [];
    const push = (x, z, t) => { prof.push([x, z]); et.push(t); };
    push(-hx + 0.04, S.sill, 'bot');
    const arch = (ax) => {
      push(ax - S.ra, S.sill, 'arch'); push(ax - S.ra, S.zc, 'arch');
      for (let k = 1; k < 6; k++) { const t = Math.PI - (k * Math.PI) / 6; push(ax + Math.cos(t) * S.ra, S.zc + Math.sin(t) * S.ra, 'arch'); }
      push(ax + S.ra, S.zc, 'arch'); push(ax + S.ra, S.sill, 'bot');
    };
    arch(S.axR); arch(S.axF);
    push(hx - 0.04, S.sill, 'bum'); push(hx, S.bum[0], 'bum'); push(hx, S.bum[1], 'bum'); push(hx - S.bumD, S.bum[1], 'fascia');
    for (const x of xs) push(x, shZ(x) - S.cv, 'top');
    const zBed = S.bed ? 0.5 : S.box ? S.box.z0 : null;
    if (zBed !== null) { push(deckEnd, zBed, 'top'); push(-hx + 0.05, zBed, 'rear'); }
    else push(xr, shZ(xr) - S.cv, 'rear');
    push(-hx + S.bumD, S.bum[1], 'bum'); push(-hx, S.bum[1], 'bum'); push(-hx, S.bum[0], 'bum');
    const bedCol = [40, 38, 36];
    VM.layer(m, 2);
    const low = VM.extrude(m, prof, -hw, hw, S.paint, {
      gloss: 0.45, edge: (i, a, b) => {
        const t = et[i];
        if (t === 'arch') return { col: VC.well, layer: 0, edge: 0 };
        if (t === 'bum') return { col: S.bumCol, gloss: 0.3 };
        if (t === 'top') return S.bed && Math.abs(a[1] - zBed) < 1e-6 && Math.abs(b[1] - zBed) < 1e-6 ? { col: bedCol, gloss: 0 } : { skip: 1 };
        if (t === 'bot') return { skip: 1 };
        return null;
      },
    });
    // ---- wheels
    VM.layer(m, 1);
    const tyre = S.wreck ? [22, 20, 19] : VC.tyre;
    for (const ax of [S.axF, S.axR]) for (const s of [-1, 1]) {
      const yc = s * (hw - S.ww / 2 - 0.012);
      const cz = S.wreck ? S.wr - 0.03 : S.wr;
      const w = VM.cyl(m, [ax, yc, cz], 'y', S.wr, S.ww, 14, tyre, { edge: 0.25 });
      const cap = s > 0 ? w.b : w.a, yo = s * (hw - 0.012);
      const rimC = S.wreck ? [70, 58, 48] : S.humvee ? HC.shade(S.paint, 0.8) : VC.rim;
      VM.decal(m, VM.ellipse([ax, yo, cz], [1, 0, 0], [0, 0, 1], S.wr * 0.62, S.wr * 0.62, 12), rimC, { host: cap });
      VM.decal(m, VM.ellipse([ax, yo, cz], [1, 0, 0], [0, 0, 1], S.wr * 0.45, S.wr * 0.45, 10), HC.shade(rimC, 0.78), { host: cap });
      VM.decal(m, VM.ellipse([ax, yo, cz], [1, 0, 0], [0, 0, 1], S.wr * 0.16, S.wr * 0.16, 8), VC.hub, { host: cap });
    }
    // ---- shoulder: chamfered hood / beltline / trunk deck
    VM.layer(m, 3);
    const cb = S.cb, secs = xs.map((x) => { const zs = shZ(x), zt = zs - S.cv; return [[x, -hw, zt], [x, -hw + cb, zs], [x, hw - cb, zs], [x, hw, zt]]; });
    const cabS = xs.indexOf(g.wb);
    const sh = VM.loft(m, secs, S.paint, {
      gloss: 0.8, seg: (j, s) => (S.white && s === cabS ? S.white : undefined),
    });
    // ---- pickup bed walls
    if (S.bed) {
      const z0 = zBed, z1 = S.belt - 0.02, x0 = -hx + 0.05, x1 = deckEnd - 0.02;
      VM.box(m, x0 + 0.07, -hw, z0, x1, -hw + 0.07, z1, S.paint, { gloss: 0.6 });
      VM.box(m, x0 + 0.07, hw - 0.07, z0, x1, hw, z1, S.paint, { gloss: 0.6 });
      VM.box(m, x1 - 0.06, -hw + 0.07, z0, x1, hw - 0.07, z1, S.paint, { gloss: 0.6 });
      const tg = VM.box(m, x0, -hw, z0, x0 + 0.07, hw, z1 - 0.01, S.paint, { gloss: 0.6 });
      for (const s of [-1, 1]) VM.decal(m, VM.sub([[x0, s * (hw - 0.02), z0 + 0.06], [x0, s * (hw - 0.14), z0 + 0.06], [x0, s * (hw - 0.14), z1 - 0.04], [x0, s * (hw - 0.02), z1 - 0.04]], 0, 1, 0, 1), VC.tail, { host: tg.xn, emit: 1 });
      VM.decal(m, [[x0, -0.14, z0 + 0.04], [x0, 0.14, z0 + 0.04], [x0, 0.14, z0 + 0.11], [x0, -0.14, z0 + 0.11]], VC.plate, { host: tg.xn });
    }
    // ---- greenhouse (raked glass, tumblehome) and cargo box
    VM.layer(m, 4);
    const gw = hw - g.gi, rw = g.rw, belt = S.belt;
    const F = [[g.wb, -gw, belt], [g.wb, gw, belt], [g.rf, rw, g.roof], [g.rf, -rw, g.roof]];
    const R = [[g.rb, -gw, belt], [g.rb, gw, belt], [g.rr, rw, g.roof], [g.rr, -rw, g.roof]];
    const gh = VM.loft(m, [F, R], S.pillar, {
      closed: 1, gloss: 0.5, capA: S.pillar, capB: S.box ? null : S.pillar,
      seg: (j) => (j === 0 ? { skip: 1 } : j === 2 ? { col: S.roofCol, gloss: 0.9 } : undefined),
    });
    const glassO = S.wreck ? { gloss: 0 } : { gloss: 0.9 };
    const streak = (q, a, b) => { if (!S.wreck) VM.decal(m, [VM.qp(q, a, 0.12), VM.qp(q, a + 0.1, 0.12), VM.qp(q, b + 0.1, 0.86), VM.qp(q, b, 0.86)], [255, 255, 255], { alpha: 0.13 }); };
    const shards = (q) => { if (!S.wreck) return; for (let i = 0; i < 3; i++) { const u = rng.range(0.1, 0.8); VM.decal(m, [VM.qp(q, u, 0.08), VM.qp(q, u + 0.14, 0.08), VM.qp(q, u + rng.range(0, 0.1), rng.range(0.25, 0.5))], [90, 100, 104], { alpha: 0.7 }); } };
    // windshield + rear glass
    const WQ = [F[0], F[1], F[2], F[3]];
    VM.decal(m, VM.sub(WQ, 0.05, 0.95, 0.07, 0.9), S.glass, Object.assign({ host: gh.capA }, glassO)); streak(WQ, 0.28, 0.5); shards(WQ);
    if (S.humvee) VM.decal(m, VM.sub(WQ, 0.47, 0.53, 0, 1), S.pillar, { host: gh.capA });
    if (!S.box) { const RQ = [R[1], R[0], R[3], R[2]]; VM.decal(m, VM.sub(RQ, 0.07, 0.93, 0.1, 0.88), S.glass, Object.assign({ host: gh.capB }, glassO)); shards(RQ); }
    // side windows
    for (const s of [-1, 1]) {
      const i0 = s > 0 ? 1 : 0, i1 = s > 0 ? 2 : 3, host = gh.strips[0][s > 0 ? 1 : 3];
      const SQ = [F[i0], R[i0], R[i1], F[i1]];
      const ub = HC.clamp((g.wb - ((Math.min(g.wb - 0.03, S.axF - S.ra - 0.02) + S.axR + S.ra + 0.03) / 2 + 0.03)) / (g.wb - g.rb), 0.2, 0.8);
      const wins = S.box || S.bed ? [[0.05, 0.93]] : S.doors === 2 ? [[0.04, 0.6], [0.64, 0.95]] : S.model === 'wagon' ? [[0.03, ub - 0.03], [ub + 0.02, 0.66], [0.7, 0.97]] : [[0.03, ub - 0.03], [ub + 0.02, 0.95]];
      for (const [u0, u1] of wins) {
        const q = VM.sub(SQ, u0, u1, S.humvee ? 0.3 : 0.1, 0.9);
        VM.decal(m, q, S.glass, Object.assign({ host }, glassO));
        if (!S.wreck) VM.decal(m, [VM.qp(q, 0.15, 0.1), VM.qp(q, 0.3, 0.1), VM.qp(q, 0.55, 0.9), VM.qp(q, 0.4, 0.9)], [255, 255, 255], { host, alpha: 0.1 });
        else shards(q);
      }
    }
    // mirrors
    for (const s of [-1, 1]) {
      const y0 = s > 0 ? gw - 0.02 : -hw - 0.08, y1 = s > 0 ? hw + 0.08 : -gw + 0.02;
      VM.box(m, g.wb - 0.14, y0, belt + 0.03, g.wb - 0.06, y1, belt + 0.12, VC.trim, { edge: 0.3 });
    }
    if (S.box) {
      const b = S.box, bh = b.hw, sec = (x) => [[x, -bh, b.z0], [x, bh, b.z0], [x, bh, b.z1 - b.ch], [x, bh - b.ch, b.z1], [x, -bh + b.ch, b.z1], [x, -bh, b.z1 - b.ch]];
      const bx = VM.loft(m, [sec(b.x1), sec(b.x0)], b.col, { closed: 1, gloss: 0.4, seg: (j) => (j === 0 ? { skip: 1 } : undefined) });
      const red = [184, 36, 28];
      for (const s of [-1, 1]) {
        const y = s * bh;
        VM.decal(m, [[b.x0 + 0.02, y, 1.0], [b.x1 - 0.02, y, 1.0], [b.x1 - 0.02, y, 1.1], [b.x0 + 0.02, y, 1.1]], red);
        const cx = (b.x0 + b.x1) / 2 - 0.1, cz = 1.42;
        VM.decal(m, [[cx - 0.16, y, cz - 0.05], [cx + 0.16, y, cz - 0.05], [cx + 0.16, y, cz + 0.05], [cx - 0.16, y, cz + 0.05]], red);
        VM.decal(m, [[cx - 0.05, y, cz - 0.16], [cx + 0.05, y, cz - 0.16], [cx + 0.05, y, cz + 0.16], [cx - 0.05, y, cz + 0.16]], red);
        VM.decal(m, [[b.x1 - 0.3, y, 0.66], [b.x1 - 0.04, y, 0.66], [b.x1 - 0.04, y, 1.66], [b.x1 - 0.3, y, 1.66]], [0, 0, 0], { stroke: 0.6, alpha: 0.35 });
        VM.decal(m, [[b.x1 - 0.26, y, 1.26], [b.x1 - 0.08, y, 1.26], [b.x1 - 0.08, y, 1.5], [b.x1 - 0.26, y, 1.5]], S.glass, { gloss: 0.8 });
      }
      // roof cross
      const tz = b.z1, cx = (b.x0 + b.x1) / 2;
      VM.decal(m, [[cx - 0.36, -0.09, tz], [cx + 0.36, -0.09, tz], [cx + 0.36, 0.09, tz], [cx - 0.36, 0.09, tz]], red);
      VM.decal(m, [[cx - 0.09, -0.36, tz], [cx + 0.09, -0.36, tz], [cx + 0.09, 0.36, tz], [cx - 0.09, 0.36, tz]], red);
      // rear doors
      const rx = b.x0;
      VM.decal(m, [[rx, -bh + 0.04, 1.0], [rx, bh - 0.04, 1.0], [rx, bh - 0.04, 1.1], [rx, -bh + 0.04, 1.1]], red);
      VM.line(m, [rx, 0, b.z0 + 0.04], [rx, 0, b.z1 - 0.1], [0, 0, 0], 0.6, { alpha: 0.4, n: [-1, 0, 0] });
      for (const s of [-1, 1]) VM.decal(m, [[rx, s * 0.08, 1.24], [rx, s * 0.5, 1.24], [rx, s * 0.5, 1.56], [rx, s * 0.08, 1.56]], S.glass, { gloss: 0.8 });
      for (const s of [-1, 1]) VM.decal(m, [[rx, s * (bh - 0.03), 0.64], [rx, s * (bh - 0.12), 0.64], [rx, s * (bh - 0.12), 0.84], [rx, s * (bh - 0.03), 0.84]], VC.tail, { emit: 1 });
      // light bar corners
      VM.layer(m, 5);
      for (const s of [-1, 1]) VM.box(m, b.x1 - 0.1, s > 0 ? bh - 0.2 : -bh + 0.06, tz, b.x1 - 0.02, s > 0 ? bh - 0.06 : -bh + 0.2, tz + 0.06, [210, 40, 30], { emit: 1, edge: 0.3 });
      VM.box(m, b.x1 - 0.1, -0.08, tz, b.x1 - 0.02, 0.08, tz + 0.05, [240, 180, 60], { emit: 1, edge: 0.3 });
    }
    // ---- roof gear
    VM.layer(m, 5);
    if (S.rails) for (const s of [-1, 1]) VM.box(m, g.rr + 0.08, s * (rw - 0.1) - 0.025, g.roof, g.rf - 0.08, s * (rw - 0.1) + 0.025, g.roof + 0.04, VC.trim, { edge: 0.3 });
    if (S.lightbar) {
      const lx = (g.rf + g.rr) / 2 + 0.06, lz = g.roof;
      VM.box(m, lx - 0.08, -rw + 0.06, lz, lx + 0.08, rw - 0.06, lz + 0.03, [26, 26, 28], { edge: 0.3 });
      VM.box(m, lx - 0.07, 0.02, lz + 0.03, lx + 0.07, rw - 0.08, lz + 0.11, [60, 90, 230], { emit: 1, edge: 0.3 });
      VM.box(m, lx - 0.07, -rw + 0.08, lz + 0.03, lx + 0.07, -0.02, lz + 0.11, [230, 40, 36], { emit: 1, edge: 0.3 });
    }
    // ---- body details (decals on the side caps / fascias)
    const zTop = (x) => shZ(x) - S.cv;
    const fr = (t, y) => [hx - S.bumD + (xf - hx + S.bumD) * t, y, S.bum[1] + (zTop(xf) - S.bum[1]) * t];
    const rrx = zBed !== null ? -hx + 0.05 : xr, rrz = zBed !== null ? zBed : zTop(xr);
    const rr = (t, y) => [-hx + S.bumD + (rrx + hx - S.bumD) * t, y, S.bum[1] + (rrz - S.bum[1]) * t];
    const q4 = (fn, t0, t1, y0, y1) => [fn(t0, y0), fn(t0, y1), fn(t1, y1), fn(t1, y0)];
    // front: headlights + grille
    const lampW = S.humvee ? 0.14 : 0.28;
    for (const s of [-1, 1]) {
      VM.decal(m, q4(fr, 0.3, 0.8, s * (hw - 0.07), s * (hw - 0.07 - lampW)), S.wreck ? [40, 38, 34] : VC.head, { emit: !S.wreck });
      if (!S.wreck && !S.humvee) VM.decal(m, q4(fr, 0.3, 0.8, s * (hw - 0.02), s * (hw - 0.065)), VC.amber, { emit: 1 });
    }
    const gy = hw - 0.1 - lampW;
    VM.decal(m, q4(fr, 0.22, 0.86, -gy, gy), S.humvee ? [22, 24, 20] : [34, 34, 36]);
    for (let t = 0.34; t < 0.8; t += 0.14) VM.line(m, fr(t, -gy + 0.02), fr(t, gy - 0.02), S.humvee ? [60, 62, 52] : [90, 92, 94], 0.6);
    // rear: taillights + plate
    if (!S.bed && !S.box) {
      for (const s of [-1, 1]) VM.decal(m, q4(rr, 0.28, 0.82, s * (hw - 0.05), s * (hw - 0.36)), S.wreck ? [50, 30, 26] : VC.tail, { emit: !S.wreck });
      VM.decal(m, q4(rr, 0.25, 0.75, -0.15, 0.15), S.wreck ? [60, 56, 50] : VC.plate);
    }
    VM.decal(m, [[-hx, -0.15, S.bum[0] + 0.02], [-hx, 0.15, S.bum[0] + 0.02], [-hx, 0.15, S.bum[1] - 0.02], [-hx, -0.15, S.bum[1] - 0.02]], S.bed || S.box ? VC.plate : HC.shade(S.bumCol, 0.8));
    // sides
    const sillT = S.sill + 0.03, archTopF = S.zc + S.ra, doorTop = S.belt - S.cv - 0.02;
    const aF = S.axF - S.ra - 0.03, aR = S.axR + S.ra + 0.03;
    for (const s of [-1, 1]) {
      const y = s * hw, P3 = (x, z) => [x, y, z];
      const ln = (pts, a) => VM.decal(m, pts.map((p) => P3(p[0], p[1])), [0, 0, 0], { stroke: 0.6, alpha: a || 0.42, open: 1, host: low[s > 0 ? 'capP' : 'capN'] });
      const host = low[s > 0 ? 'capP' : 'capN'];
      const rect = (x0, z0, x1, z1, col, o2) => VM.decal(m, [P3(x0, z0), P3(x1, z0), P3(x1, z1), P3(x0, z1)], col, Object.assign({ host }, o2 || {}));
      // bumper wrap-around
      rect(hx - 0.22, S.bum[0], hx, S.bum[1], S.bumCol, { gloss: 0.3 });
      rect(-hx, S.bum[0], -hx + 0.22, S.bum[1], S.bumCol, { gloss: 0.3 });
      // side markers
      if (!S.wreck) { rect(hx - 0.13, S.bum[1] + 0.05, hx - 0.05, S.bum[1] + 0.1, VC.amber, { emit: 1 }); if (!S.bed && !S.box) rect(-hx + 0.05, S.bum[1] + 0.05, -hx + 0.13, S.bum[1] + 0.1, VC.tail, { emit: 1 }); }
      // police livery: white doors
      if (S.white) VM.decal(m, [P3(aR + 0.02, sillT + 0.04), P3(aF - 0.02, sillT + 0.04), P3(g.wb - 0.02, doorTop + 0.02), P3(g.rb + 0.14, doorTop + 0.02)], S.white, { host, gloss: 0.4 });
      // door seams and handles
      if (!S.box) {
        const dF = Math.min(g.wb - 0.03, aF + 0.01), dB = S.doors === 4 ? (dF + aR) / 2 + 0.03 : null;
        const dRx = S.doors === 4 ? aR + 0.02 : (S.bed ? deckEnd + 0.02 : Math.max(aR + 0.02, (g.wb + g.rb) / 2 - 0.22));
        ln([[dF, sillT], [dF, doorTop]]);
        if (dB !== null) ln([[dB, sillT], [dB, doorTop]]);
        if (S.doors === 4 && !S.bed) ln([[dRx, sillT], [dRx, archTopF], [dRx - 0.12, doorTop - 0.06], [dRx - 0.12, doorTop]]);
        else ln([[dRx, sillT], [dRx, doorTop]]);
        ln([[dRx, sillT], [dF, sillT]], 0.25);
        const hz = doorTop - 0.07;
        if (dB !== null) { rect(dB + 0.03, hz, dB + 0.12, hz + 0.025, VC.trim); rect(dRx - 0.08, hz, dRx + 0.01, hz + 0.025, VC.trim); }
        else rect(dRx + 0.03, hz, dRx + 0.12, hz + 0.025, VC.trim);
      } else {
        const dF = Math.min(g.wb - 0.03, aF + 0.01);
        ln([[dF, sillT], [dF, doorTop]]); ln([[S.box.x1 + 0.02, sillT], [S.box.x1 + 0.02, doorTop]]);
        rect(S.box.x1 + 0.05, doorTop - 0.07, S.box.x1 + 0.14, doorTop - 0.045, VC.trim);
        rect(-hx + 0.3, 0.52, S.box.x1 + 0.02, 0.58, [184, 36, 28]);
      }
      // body-side moulding
      if (!S.humvee && !S.wreck) rect(aR, 0.38, aF, 0.42, S.kind === 'police' ? [60, 60, 62] : VC.trim, { alpha: 0.9 });
      // dirt splashes behind the wheels / along the sill
      if (S.dirt) for (let i = 0; i < 6; i++) {
        const ax = i % 2 ? S.axF : S.axR, x = ax + (rng() < 0.5 ? -1 : 1) * rng.range(S.ra * 0.9, S.ra * 1.5);
        const blob = VM.ellipse([x, y, S.sill + rng.range(0.05, 0.12)], [1, 0, 0], [0, 0, 1], rng.range(0.1, 0.22), rng.range(0.04, 0.08), 8, 0.5, rng);
        VM.decal(m, blob, VC.dirt, { host, alpha: 0.28 * S.dirt });
      }
      if (S.humvee) {
        rect(-0.2, 0.58, 0.1, 0.66, [30, 30, 28], { alpha: 0.6 });
        ln([[g.wb - 0.03, sillT], [g.wb - 0.03, doorTop]]); ln([[(g.wb + g.rb) / 2, sillT], [(g.wb + g.rb) / 2, doorTop]]); ln([[g.rb + 0.04, sillT], [g.rb + 0.04, doorTop]]);
      }
      if (S.wreck) {
        for (let i = 0; i < 5; i++) VM.decal(m, VM.ellipse([rng.range(-hx + 0.3, hx - 0.3), y, rng.range(0.3, 0.6)], [1, 0, 0], [0, 0, 1], rng.range(0.1, 0.3), rng.range(0.05, 0.14), 9, 0.6, rng), rng() < 0.5 ? VC.rust : VC.soot, { host, alpha: 0.7 });
        if (s > 0 && rng() < 0.6) rect(g.wb - 0.02 - 0.5, sillT + 0.02, g.wb - 0.04, doorTop - 0.01, [14, 12, 11]);   // missing door
      }
    }
    // hood / trunk seams and bonnet details on the shoulder top faces
    const hl = (x) => [[x, -hw + cb + 0.04, shZ(x) + 0.001], [x, hw - cb - 0.04, shZ(x) + 0.001]];
    const a1 = hl(g.wb + 0.05); VM.line(m, a1[0], a1[1], [0, 0, 0], 0.6, { alpha: 0.35, n: [0, 0, 1] });
    if (!S.bed && !S.box && g.rb - deckEnd > 0.25) { const a2 = hl(g.rb - 0.06); VM.line(m, a2[0], a2[1], [0, 0, 0], 0.6, { alpha: 0.35, n: [0, 0, 1] }); }
    if (S.humvee) {
      const x0 = g.wb + 0.2, x1 = xf - 0.15;
      for (let k = 0; k < 5; k++) { const x = x0 + ((x1 - x0) * k) / 4; VM.line(m, [x, -0.3, shZ(x) + 0.001], [x, 0.3, shZ(x) + 0.001], [30, 30, 26], 0.8, { alpha: 0.5 }); }
      // white star on the hood
      const c = [(x0 + x1) / 2, 0], st = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI, r = k % 2 ? 0.07 : 0.17, x = c[0] + Math.cos(a) * r; st.push([x, c[1] + Math.sin(a) * r, shZ(x) + 0.001]); }
      VM.decal(m, st, [200, 200, 180], { alpha: 0.55 });
    }
    // soot / rust / grime on the hood and roof
    const topBlob = (x, y, z, rx, ry, col, a) => VM.decal(m, VM.ellipse([x, y, 0], [1, 0, 0], [0, 1, 0], rx, ry, 9, 0.6, rng).map((p) => [p[0], p[1], shZ(p[0]) + 0.001]), col, { alpha: a });
    if (S.wreck) {
      for (let i = 0; i < 4; i++) topBlob(rng.range(g.wb + 0.15, xf - 0.2), rng.range(-0.3, 0.3), S.belt - 0.001, rng.range(0.1, 0.24), rng.range(0.1, 0.26), i % 2 ? VC.soot : VC.rust, 0.7);
      const rq = gh.strips[0][2];
      if (rq) for (let i = 0; i < 2; i++) VM.decal(m, VM.ellipse([rng.range(g.rr + 0.15, g.rf - 0.15), rng.range(-0.2, 0.2), g.roof], [1, 0, 0], [0, 1, 0], rng.range(0.12, 0.22), rng.range(0.1, 0.2), 9, 0.6, rng), i ? VC.rust : VC.soot, { host: rq, alpha: 0.6 });
    } else if (S.dirt) {
      if (rng() < 0.35) topBlob(rng.range(g.wb + 0.2, xf - 0.2), rng.range(-0.3, 0.3), S.belt - 0.001, 0.05, 0.04, VC.rust, 0.6);
    }
    // push bar
    if (S.pushbar) {
      VM.layer(m, 2);
      VM.box(m, hx - 0.01, -0.42, S.bum[0] + 0.02, hx + 0.05, 0.42, S.bum[1] + 0.02, [22, 22, 24], { edge: 0.3 });
      for (const s of [-1, 1]) VM.box(m, hx - 0.01, s * 0.3 - 0.03, S.bum[1], hx + 0.04, s * 0.3 + 0.03, zTop(xf) + 0.04, [22, 22, 24], { edge: 0.3 });
    }
    if (S.humvee) {
      VM.layer(m, 2);
      VM.box(m, hx - 0.02, -hw + 0.06, S.bum[0] - 0.04, hx + 0.05, hw - 0.06, S.bum[0] + 0.05, [30, 30, 28], { edge: 0.3 });
    }
    // wreck: sag toward one corner, crumpled roof
    if (S.wreck) {
      const sx = rng() < 0.5 ? 1 : -1, sy = rng() < 0.5 ? 1 : -1;
      VM.map(m, (p) => [p[0], p[1], Math.max(0, p[2] - 0.035 * (1 + sx * p[0] / hx) * 0.5 - 0.03 * (1 + sy * p[1] / hw) * 0.5 - (p[2] > S.belt + 0.2 ? 0.04 * Math.max(0, 1 - Math.abs(p[0] - (g.rf + g.rr) / 2) / 0.6) : 0))]);
    }
    return m;
  }
  function vehicle(ctx, w, d, o, kind) {
    const ax = w >= d, Lf = ax ? w : d;
    const v = o.var | 0, flip = v & 1;
    const model = kind === 'car' ? CIV_MODELS[(v >> 1) % CIV_MODELS.length] : 'sedan';
    const S = vehicleSpec(kind, model, Lf - 0.12, o.col || '#6a2a24');
    const m = vehicleMesh(S, HC.rng(v * 131 + 7 + (kind.length << 4)));
    const cx = w / 2, cy = d / 2, hl = S.L / 2 + 0.02, hwS = (S.box ? S.box.hw : S.hw) + 0.04;
    // soft ground shadow (axis aligned in world space)
    const ex = ax ? hl : hwS, ey = ax ? hwS : hl;
    const cxl = (v2, lo, hi) => Math.max(lo + 0.02, Math.min(hi - 0.02, v2));
    for (const [k, a] of [[0.14, 0.1], [0.08, 0.12], [0.02, 0.14], [-0.12, 0.2]]) {
      const X0 = cxl(cx - ex - k * 0.5, 0, w), X1 = cxl(cx + ex + k, 0, w), Y0 = cxl(cy - ey - k * 0.5, 0, d), Y1 = cxl(cy + ey + k, 0, d);
      poly(ctx, [P(X0, Y0, 0), P(X1, Y0, 0), P(X1, Y1, 0), P(X0, Y1, 0)]);
      ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fill();
    }
    VM.render(ctx, m, { P, rot: (ax ? 0 : 1) + (flip ? 2 : 0), cx, cy });
  }
  PROPS.car = { h: 1.3, draw(ctx, w, d, o) { vehicle(ctx, w, d, o, 'car'); } };
  PROPS.police = { h: 1.3, draw(ctx, w, d, o) { vehicle(ctx, w, d, o, 'police'); } };
  PROPS.ambulance = { h: 1.9, draw(ctx, w, d, o) { vehicle(ctx, w, d, o, 'ambulance'); } };
  PROPS.humvee = { h: 1.6, draw(ctx, w, d, o) { vehicle(ctx, w, d, Object.assign({}, o, { col: o.col || '#5a5e44' }), 'humvee'); } };
  PROPS.wreck = { h: 1.3, draw(ctx, w, d, o) { vehicle(ctx, w, d, Object.assign({}, o, { col: o.col || '#4a3a30' }), 'wreck'); } };
  PROPS.tent = { h: 2.0, draw(ctx, w, d, o) {
    const ax = w >= d, col = HC.col(o.col || '#5e6446');
    const k = o.dark ? 0.5 : 1;
    if (ax) {
      const L = [P(0.1, 0.1, 0), P(w - 0.1, 0.1, 0), P(w - 0.1, d / 2, 1.8), P(0.1, d / 2, 1.8)];
      const R = [P(0.1, d - 0.1, 0), P(w - 0.1, d - 0.1, 0), P(w - 0.1, d / 2, 1.8), P(0.1, d / 2, 1.8)];
      const E = [P(w - 0.1, 0.1, 0), P(w - 0.1, d - 0.1, 0), P(w - 0.1, d / 2, 1.8)];
      poly(ctx, L); ctx.fillStyle = C(HC.shade(col, 1.05 * k)); ctx.fill();
      poly(ctx, R); ctx.fillStyle = C(HC.shade(col, 0.95 * k)); ctx.fill();
      poly(ctx, E); ctx.fillStyle = C(HC.shade(col, 0.7 * k)); ctx.fill();
      const door = [P(w - 0.1, d / 2 - 0.3, 0), P(w - 0.1, d / 2 + 0.3, 0), P(w - 0.1, d / 2, 1.2)]; poly(ctx, door); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    } else {
      const L = [P(0.1, 0.1, 0), P(0.1, d - 0.1, 0), P(w / 2, d - 0.1, 1.8), P(w / 2, 0.1, 1.8)];
      const R = [P(w - 0.1, 0.1, 0), P(w - 0.1, d - 0.1, 0), P(w / 2, d - 0.1, 1.8), P(w / 2, 0.1, 1.8)];
      const S2 = [P(0.1, d - 0.1, 0), P(w - 0.1, d - 0.1, 0), P(w / 2, d - 0.1, 1.8)];
      poly(ctx, L); ctx.fillStyle = C(HC.shade(col, 1.0 * k)); ctx.fill();
      poly(ctx, R); ctx.fillStyle = C(HC.shade(col, 0.78 * k)); ctx.fill();
      poly(ctx, S2); ctx.fillStyle = C(HC.shade(col, 0.9 * k)); ctx.fill();
      const door = [P(w / 2 - 0.3, d - 0.1, 0), P(w / 2 + 0.3, d - 0.1, 0), P(w / 2, d - 0.1, 1.2)]; poly(ctx, door); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    }
    if (o.cross) { const p = ax ? P(w / 2, d * 0.75, 0.95) : P(w * 0.75, d / 2, 0.95); ctx.fillStyle = '#eee'; ctx.fillRect(p[0] - 7, p[1] - 7, 14, 14); ctx.fillStyle = '#c22'; ctx.fillRect(p[0] - 5, p[1] - 1.5, 10, 3); ctx.fillRect(p[0] - 1.5, p[1] - 5, 3, 10); }
  } };
  PROPS.pumps = { h: 1.6, draw(ctx, w, d, o) {
    box(ctx, 0.1, 0.1, 0, w - 0.1, d - 0.1, 0.18, { c: '#8a8a84' });
    box(ctx, 0.3, 0.3, 0.18, 0.7, 0.7, 1.45, { c: '#d8d2c0', line: 'rgba(0,0,0,.35)' });
    box(ctx, 0.28, 0.28, 1.2, 0.72, 0.72, 1.45, { c: '#b83224' });
  } };
  PROPS.heli = { h: 1.9, draw(ctx, w, d, o) {
    // crashed medevac helicopter: scorched fuselage, snapped tail boom, bent rotor blades
    poly(ctx, [P(0.2, 0.2, 0), P(w - 0.1, 0.2, 0), P(w - 0.1, d - 0.1, 0), P(0.2, d - 0.1, 0)]); ctx.fillStyle = 'rgba(10,8,6,.45)'; ctx.fill();
    const k = o.dark ? 0.5 : 1;
    const skin = C(HC.shade([200, 196, 184], k)), burnt = C(HC.shade([46, 40, 36], k));
    box(ctx, 0.3, 0.9, 0, 1.5, 1.2, 0.35, { c: burnt });
    box(ctx, 1.2, 0.5, 0.15, w - 0.3, d - 0.5, 1.2, { c: skin, line: 'rgba(0,0,0,.4)' });
    box(ctx, w - 1.3, 0.62, 1.2, w - 0.45, d - 0.62, 1.45, { c: burnt });
    const s = [P(w - 0.3, d - 0.5, 0.6), P(w - 0.3, 0.5, 0.6), P(w - 0.3, 0.5, 1.15), P(w - 0.3, d - 0.5, 1.15)];
    poly(ctx, s); ctx.fillStyle = o.dark ? '#141a1c' : '#2a3a40'; ctx.fill();
    const m = P(w * 0.62, d / 2, 0.7); ctx.fillStyle = '#b8261c'; ctx.fillRect(m[0] - 6, m[1] - 2, 12, 4); ctx.fillRect(m[0] - 2, m[1] - 6, 4, 12);
    ctx.fillStyle = 'rgba(12,10,8,.7)'; ctx.beginPath(); ctx.ellipse(m[0] - 18, m[1] - 4, 16, 9, 0.3, 0, 7); ctx.fill();
    const hub = P(w * 0.62, d / 2, 1.5); ctx.strokeStyle = '#222'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    [[1.9, -0.4, 0.2], [-1.4, 0.9, -0.3], [0.6, 1.7, 0.1]].forEach(([dx, dy, dz]) => { const e = P(w * 0.62 + dx, d / 2 + dy, 1.5 + dz); ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.quadraticCurveTo((hub[0] + e[0]) / 2, (hub[1] + e[1]) / 2 + 6, e[0], e[1]); ctx.stroke(); });
  } };

  G.prop = function (type, w, d, o) {
    const def = PROPS[type];
    if (!def) return null;
    const key = [type, w, d, o.face || '', o.col || '', o.var || 0, o.dark ? 1 : 0, o.cross ? 1 : 0].join('|');
    let c = propCache[key]; if (c) return c;
    c = propCache[key] = spriteCanvas(w, d, def.h + 0.2);
    const ctx = c.getContext('2d');
    ctx.lineJoin = 'round';
    def.draw(ctx, w, d, o);
    if (o.dark) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(8,10,16,.5)'; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillRect(0, 0, c.width, c.height); }
    return c;
  };

  // ------------------------------------------------------------ item sprites (pickups)
  const itemCache = {};
  G.item = function (type) {
    let c = itemCache[type]; if (c) return c;
    c = itemCache[type] = spriteCanvas(1, 1, 0.6);
    const ctx = c.getContext('2d'); ctx.lineJoin = 'round';
    const b = (x0, y0, x1, y1, h, col, extra) => box(ctx, x0, y0, 0, x1, y1, h, Object.assign({ c: col, line: 'rgba(0,0,0,.45)', lw: 0.7 }, extra || {}));
    switch (type) {
      case 'ammo9': b(0.35, 0.38, 0.65, 0.62, 0.16, '#b8a04a', { t: '#d8c46a' }); break;
      case 'shells': b(0.33, 0.36, 0.67, 0.64, 0.18, '#a8322a', { t: '#c8483a' }); break;
      case 'ammo556': b(0.3, 0.38, 0.7, 0.62, 0.2, '#4e5a3a', { t: '#6a7650' }); { const p = P(0.5, 0.5, 0.2); ctx.fillStyle = '#e8d890'; ctx.fillRect(p[0] - 4, p[1] - 1, 8, 2); } break;
      case 'medkit': b(0.3, 0.34, 0.7, 0.66, 0.2, '#e8e4dc', { t: '#f4f0e8' }); { const p = P(0.5, 0.5, 0.2); ctx.fillStyle = '#c8261c'; ctx.fillRect(p[0] - 5, p[1] - 1.5, 10, 3); ctx.fillRect(p[0] - 1.5, p[1] - 4, 3, 8); } break;
      case 'pills': cyl(ctx, 0.5, 0.5, 0.08, 0, 0.2, '#d8762a', '#f0f0f0'); break;
      case 'bandage': cyl(ctx, 0.5, 0.5, 0.1, 0, 0.1, '#eeeae0', '#f8f6f0'); break;
      case 'antiviral': { b(0.36, 0.44, 0.64, 0.56, 0.06, '#e0e4e8'); const a = P(0.38, 0.5, 0.06), z = P(0.62, 0.5, 0.06); ctx.strokeStyle = '#3aa8e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(z[0], z[1]); ctx.lineTo(z[0] + 7, z[1] + 3); ctx.stroke(); } break;
      case 'molotov': cyl(ctx, 0.5, 0.5, 0.07, 0, 0.28, '#4a6a3a'); { const p = P(0.5, 0.5, 0.36); ctx.fillStyle = '#e8e0c8'; ctx.fillRect(p[0] - 1.5, p[1] - 4, 3, 5); } break;
      case 'jacket': b(0.25, 0.3, 0.75, 0.7, 0.08, '#5a3e2a', { t: '#6e4c34' }); break;
      case 'vest': b(0.25, 0.3, 0.75, 0.7, 0.1, '#2a3444', { t: '#384458' }); { const p = P(0.5, 0.5, 0.1); ctx.fillStyle = '#ddd'; ctx.font = 'bold 5px sans-serif'; ctx.fillText('POLICE', p[0] - 9, p[1] + 2); } break;
      case 'bat': { const a = P(0.2, 0.62, 0.04), z = P(0.82, 0.38, 0.04); ctx.lineCap = 'round'; ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke(); ctx.strokeStyle = '#b08a5a'; ctx.lineWidth = 2.2; ctx.stroke(); } break;
      case 'axe': { const a = P(0.2, 0.62, 0.04), z = P(0.82, 0.38, 0.04); ctx.lineCap = 'round'; ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke(); ctx.fillStyle = '#b02a1e'; ctx.fillRect(z[0] - 3, z[1] - 5, 6, 8); ctx.fillStyle = '#ccc'; ctx.fillRect(z[0] - 5, z[1] - 5, 2, 8); } break;
      case 'pistol': b(0.36, 0.44, 0.64, 0.56, 0.05, '#2a2a2a'); b(0.38, 0.5, 0.46, 0.64, 0.05, '#3a3228'); break;
      case 'shotgun': { b(0.12, 0.46, 0.88, 0.54, 0.05, '#333'); b(0.1, 0.44, 0.38, 0.56, 0.07, '#6a4428'); } break;
      case 'rifle': { b(0.08, 0.46, 0.92, 0.54, 0.06, '#222'); b(0.45, 0.54, 0.52, 0.68, 0.05, '#222'); } break;
      case 'keyred': case 'keyblue': case 'keyyellow': {
        const col = { keyred: '#d23a2a', keyblue: '#3a6ad2', keyyellow: '#e2b632' }[type];
        b(0.36, 0.42, 0.64, 0.58, 0.03, col, { t: HC.rgb(HC.shade(HC.col(col), 1.3)) });
        const p = P(0.5, 0.5, 0.03); ctx.fillStyle = '#fff'; ctx.fillRect(p[0] - 4, p[1] - 1, 5, 1.5);
      } break;
      case 'note': { poly(ctx, [P(0.32, 0.36, 0.01), P(0.68, 0.36, 0.01), P(0.68, 0.64, 0.01), P(0.32, 0.64, 0.01)]); ctx.fillStyle = '#ece6d2'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.strokeStyle = 'rgba(40,60,120,.5)'; for (let i = 0; i < 4; i++) { const a = P(0.38, 0.42 + i * 0.05, 0.01), z = P(0.62, 0.42 + i * 0.05, 0.01); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke(); } } break;
      case 'radio': { b(0.36, 0.4, 0.64, 0.6, 0.22, '#3a3a36'); const p = P(0.4, 0.5, 0.22), q = P(0.4, 0.5, 0.5); ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } break;
      default: b(0.4, 0.4, 0.6, 0.6, 0.15, '#f0f');
    }
    return c;
  };

  G.drawSprite = function (ctx, spr, sx, sy) {
    ctx.drawImage(spr, sx - spr.ox, sy - spr.oy, spr.w, spr.h);
  };
  G.init = function () {};
  return G;
})();
