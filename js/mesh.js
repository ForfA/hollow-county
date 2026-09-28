// Hollow County — tiny flat-shaded low-poly mesh renderer, used to bake iso sprites (vehicles).
// Meshes live in local world units (x, y ground plane, z up). Faces carry an outward normal, a layer and a
// group; render() rotates by quarter turns, culls back faces against the iso view vector, painter-sorts by
// (layer, group depth, face depth) and fills each face with a lit colour. Decals are coplanar polygons
// attached to a host face and drawn right after it (windows, lights, seams, livery, dirt).
'use strict';
HC.mesh = (function () {
  const M = {};
  // --- vec3
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  M.v = { add, sub, mul, dot, cross, norm, lerp: lerp3 };

  // View vector toward the camera: the null space of HC.gfx.P ((x-y)*HW, (x+y)*HH - z*ZP) is (1, 1, 2*HH/ZP).
  const VIEW = norm([1, 1, (2 * HC.HH) / HC.ZP]);
  const LIGHT = norm([-0.3, 0.55, 0.9]);          // upper-left key light
  const HALF = norm(add(LIGHT, VIEW));
  const AMB = 0.56, DIF = 0.47;
  M.VIEW = VIEW;

  function newell(p) {
    const n = [0, 0, 0];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return n;
  }
  function centroid(p) { let x = 0, y = 0, z = 0; for (const q of p) { x += q[0]; y += q[1]; z += q[2]; } const n = p.length; return [x / n, y / n, z / n]; }
  M.centroid = centroid;

  M.create = () => ({ f: [], g: 0, layer: 1 });
  M.layer = (m, l) => { m.layer = l; };
  M.group = (m) => ++m.g;

  // Add a face. o: {n (explicit normal) | ref (point inside the solid), layer, grp, gloss, edge, alpha, emit}
  M.face = function (m, pts, col, o) {
    o = o || {};
    if (col === null) return null;
    let n = norm(o.n || newell(pts));
    if (o.ref && dot(sub(centroid(pts), o.ref), n) < 0) n = mul(n, -1);
    const f = {
      p: pts, n, col: HC.col(col), layer: o.layer !== undefined ? o.layer : m.layer, grp: o.grp || M.group(m),
      gloss: o.gloss || 0, edge: o.edge !== undefined ? o.edge : 0.2, alpha: o.alpha !== undefined ? o.alpha : 1, emit: !!o.emit, dec: [],
    };
    m.f.push(f); return f;
  };

  // Axis-aligned box. col: colour or {top, bot, xp, xn, yp, yn, c}; bottom face omitted unless given.
  M.box = function (m, x0, y0, z0, x1, y1, z1, col, o) {
    o = Object.assign({}, o || {}); o.grp = o.grp || M.group(m); o.ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    const c = typeof col === 'object' && !Array.isArray(col) ? col : { c: col };
    const pick = (k) => (c[k] !== undefined ? c[k] : c.c);
    return {
      top: M.face(m, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], pick('top'), o),
      xp: M.face(m, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], pick('xp'), o),
      xn: M.face(m, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], pick('xn'), o),
      yp: M.face(m, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], pick('yp'), o),
      yn: M.face(m, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], pick('yn'), o),
      bot: c.bot ? M.face(m, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], c.bot, o) : null,
    };
  };

  // Extrude a side profile [[x,z]...] (any winding, may be concave) across y0..y1.
  // o.edge(i, a, b) -> {col, skip, layer, gloss} per profile edge i (prof[i] -> prof[i+1]); o.cap -> side cap colour.
  M.extrude = function (m, prof, y0, y1, col, o) {
    o = o || {};
    let area = 0; for (let i = 0; i < prof.length; i++) { const a = prof[i], b = prof[(i + 1) % prof.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const pr = area < 0 ? prof.slice().reverse() : prof;
    const grp = o.grp || M.group(m), base = { grp, gloss: o.gloss || 0, layer: o.layer };
    const edges = [];
    for (let i = 0; i < pr.length; i++) {
      const a = pr[i], b = pr[(i + 1) % pr.length];
      const oi = pr === prof ? i : (2 * prof.length - 2 - i) % prof.length;     // index of this edge in the caller's profile
      const eo = (o.edge && o.edge(oi, a, b)) || {};
      if (eo.skip) { edges.push(null); continue; }
      const dx = b[0] - a[0], dz = b[1] - a[1];
      edges.push(M.face(m, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], eo.col !== undefined ? eo.col : col,
        Object.assign({}, base, { n: [dz, 0, -dx] }, eo)));
    }
    const cc = o.cap !== undefined ? o.cap : col;
    return {
      capP: M.face(m, pr.map((q) => [q[0], y1, q[1]]), cc, Object.assign({}, base, { n: [0, 1, 0] })),
      capN: M.face(m, pr.map((q) => [q[0], y0, q[1]]), cc, Object.assign({}, base, { n: [0, -1, 0] })),
      edges,
    };
  };

  // Loft through sections (arrays of 3D points with equal counts). o.closed: sections are rings.
  // o.seg(j, s) -> colour/options for strip j between section s and s+1; o.capA/o.capB colours (null = none).
  M.loft = function (m, secs, col, o) {
    o = o || {};
    const grp = o.grp || M.group(m), base = { grp, gloss: o.gloss || 0, layer: o.layer };
    const k = secs[0].length, segs = o.closed ? k : k - 1, strips = [];
    const cen = secs.map(centroid);
    for (let s = 0; s < secs.length - 1; s++) {
      const row = [], ref = lerp3(cen[s], cen[s + 1], 0.5);
      for (let j = 0; j < segs; j++) {
        const a = secs[s][j], b = secs[s][(j + 1) % k], c = secs[s + 1][(j + 1) % k], d = secs[s + 1][j];
        let so = o.seg ? o.seg(j, s) : undefined;
        if (so === undefined) so = {}; else if (so === null || typeof so === 'string' || Array.isArray(so)) so = { col: so };
        if (so.skip) { row.push(null); continue; }
        row.push(M.face(m, [a, b, c, d], so.col !== undefined ? so.col : col, Object.assign({}, base, { ref }, so)));
      }
      strips.push(row);
    }
    const last = secs.length - 1;
    const ca = o.capA !== undefined ? o.capA : col, cb = o.capB !== undefined ? o.capB : col;
    return {
      strips,
      capA: ca === null ? null : M.face(m, secs[0].slice(), ca, Object.assign({}, base, { ref: cen[1] }, o.capAo || {})),
      capB: cb === null ? null : M.face(m, secs[last].slice(), cb, Object.assign({}, base, { ref: cen[last - 1] }, o.capBo || {})),
    };
  };

  // Cylinder along axis 'x' | 'y' | 'z' centred at c. Returns {a (cap at -axis), b (cap at +axis), side[]}.
  M.cyl = function (m, c, axis, r, len, n, col, o) {
    o = Object.assign({}, o || {}); o.grp = o.grp || M.group(m); o.ref = c;
    const ai = axis === 'x' ? 0 : axis === 'y' ? 1 : 2, ui = (ai + 1) % 3, vi = (ai + 2) % 3;
    const ring = (s) => { const out = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, p = c.slice(); p[ai] += s * len / 2; p[ui] += Math.cos(t) * r; p[vi] += Math.sin(t) * r; out.push(p); } return out; };
    const A = ring(-1), B = ring(1), side = [];
    const sc = o.side !== undefined ? o.side : col;
    for (let i = 0; i < n; i++) side.push(M.face(m, [A[i], A[(i + 1) % n], B[(i + 1) % n], B[i]], sc, o));
    return { a: M.face(m, A, o.capA !== undefined ? o.capA : col, o), b: M.face(m, B, o.capB !== undefined ? o.capB : col, o), side };
  };

  // Points on an ellipse in the plane spanned by unit vectors u, v around c.
  M.ellipse = function (c, u, v, rx, ry, n, jitter, rng) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, k = jitter ? 1 + (rng() - 0.5) * jitter : 1;
      out.push(add(c, add(mul(u, Math.cos(t) * rx * k), mul(v, Math.sin(t) * ry * k))));
    }
    return out;
  };
  // Bilinear point / sub-quad of quad q=[p00,p10,p11,p01] (u along p00->p10, v along p00->p01).
  M.qp = (q, u, v) => lerp3(lerp3(q[0], q[1], u), lerp3(q[3], q[2], u), v);
  M.sub = (q, u0, u1, v0, v1) => [M.qp(q, u0, v0), M.qp(q, u1, v0), M.qp(q, u1, v1), M.qp(q, u0, v1)];

  // Find the face whose plane contains the polygon and whose outline contains its centroid.
  function findHost(m, pts) {
    const c = centroid(pts), dn = norm(newell(pts));
    let best = null, bd = 0.02;
    for (const f of m.f) {
      if (pts.length > 2 && Math.abs(dot(f.n, dn)) < 0.97) continue;
      const d = Math.abs(dot(sub(c, f.p[0]), f.n));
      if (d > bd || !inside(f, c)) continue;
      best = f; bd = d;
    }
    return best;
  }
  function inside(f, c) {
    const n = f.n, ax = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
    const u = (ax + 1) % 3, v = (ax + 2) % 3, p = f.p;
    let inn = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i], b = p[j];
      if ((a[v] > c[v]) !== (b[v] > c[v]) && c[u] < ((b[u] - a[u]) * (c[v] - a[v])) / (b[v] - a[v]) + a[u]) inn = !inn;
    }
    return inn;
  }
  // Coplanar decal drawn after its host face. o: {host, alpha, emit, gloss, stroke (px width -> polyline), open}
  M.decal = function (m, pts, col, o) {
    o = o || {};
    const host = o.host || findHost(m, pts);
    if (!host) return null;
    const d = { p: pts, col: HC.col(col), alpha: o.alpha !== undefined ? o.alpha : 1, emit: !!o.emit, gloss: o.gloss || 0, stroke: o.stroke || 0, open: !!o.open };
    host.dec.push(d); return d;
  };
  // Straight line decal between a and b lying on the face that contains their midpoint (hint normal n).
  M.line = function (m, a, b, col, lw, o) {
    o = o || {};
    let host = o.host;
    if (!host) { const mid = lerp3(a, b, 0.5); for (const f of m.f) if (Math.abs(dot(sub(mid, f.p[0]), f.n)) < 0.01 && (!o.n || dot(f.n, o.n) > 0.9) && inside(f, mid)) { host = f; break; } }
    if (!host) return null;
    const d = { p: [a, b], col: HC.col(col), alpha: o.alpha !== undefined ? o.alpha : 1, stroke: lw || 0.6, open: true };
    host.dec.push(d); return d;
  };

  // Apply fn(point) -> point to every vertex (small deformations); normals are recomputed keeping orientation.
  M.map = function (m, fn) {
    const seen = new Map(); const tf = (p) => { let q = seen.get(p); if (!q) { q = fn(p); seen.set(p, q); } return q; };
    for (const f of m.f) {
      f.p = f.p.map(tf);
      const n = norm(newell(f.p)); f.n = dot(n, f.n) < 0 ? mul(n, -1) : n;
      for (const d of f.dec) d.p = d.p.map(tf);
    }
  };

  function shadeCol(c, b, spec) {
    const k = b;
    return [Math.min(255, c[0] * k + spec * 255), Math.min(255, c[1] * k + spec * 255), Math.min(255, c[2] * k + spec * 255)];
  }
  const css = (c, a) => HC.rgb(c, a === undefined || a >= 1 ? undefined : a);

  function fillStyle(ctx, pts2, c, gloss, alpha) {
    if (!gloss) return css(c, alpha);
    let y0 = Infinity, y1 = -Infinity, x0 = 0, x1 = 0;
    for (const q of pts2) { if (q[1] < y0) { y0 = q[1]; x0 = q[0]; } if (q[1] > y1) { y1 = q[1]; x1 = q[0]; } }
    const g = ctx.createLinearGradient(x0, y0, x1, y1 + 0.01);
    const w = [255, 255, 255];
    g.addColorStop(0, css(HC.shade(c, 1 + 0.1 * gloss), alpha));
    g.addColorStop(0.32, css(HC.mix(c, w, 0.2 * gloss), alpha));
    g.addColorStop(0.5, css(c, alpha));
    g.addColorStop(1, css(HC.shade(c, 1 - 0.2 * gloss), alpha));
    return g;
  }
  function path(ctx, pts2, closed) {
    ctx.beginPath(); ctx.moveTo(pts2[0][0], pts2[0][1]);
    for (let i = 1; i < pts2.length; i++) ctx.lineTo(pts2[i][0], pts2[i][1]);
    if (closed) ctx.closePath();
  }

  // Render mesh m into ctx. o: {P(x,y,z)->[sx,sy], rot (quarter turns CCW), cx, cy, cz (translation), dim (0..1 brightness)}
  M.render = function (ctx, m, o) {
    const rot = ((o.rot || 0) % 4 + 4) % 4, cs = [1, 0, -1, 0][rot], sn = [0, 1, 0, -1][rot];
    const cx = o.cx || 0, cy = o.cy || 0, cz = o.cz || 0, dim = o.dim === undefined ? 1 : o.dim;
    const tp = (p) => [p[0] * cs - p[1] * sn + cx, p[0] * sn + p[1] * cs + cy, p[2] + cz];
    const tn = (n) => [n[0] * cs - n[1] * sn, n[0] * sn + n[1] * cs, n[2]];
    const depth = (p) => p[0] * VIEW[0] + p[1] * VIEW[1] + p[2] * VIEW[2];
    // group depth = mean depth of the group's vertices
    const gd = new Map();
    for (const f of m.f) { let g = gd.get(f.grp); if (!g) gd.set(f.grp, g = [0, 0]); for (const p of f.p) { g[0] += depth(tp(p)); g[1]++; } }
    const vis = [];
    for (const f of m.f) {
      const n = tn(f.n);
      if (dot(n, VIEW) <= 1e-4) continue;
      const wp = f.p.map(tp), g = gd.get(f.grp);
      vis.push({ f, n, wp, d: depth(centroid(wp)), gd: g[0] / g[1] });
    }
    vis.sort((a, b) => a.f.layer - b.f.layer || a.gd - b.gd || a.d - b.d);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const v of vis) {
      const f = v.f, n = v.n;
      const lam = Math.max(0, dot(n, LIGHT));
      const b = (f.emit ? 1 : AMB + DIF * lam) * dim;
      const spec = f.gloss ? f.gloss * 0.35 * Math.pow(Math.max(0, dot(n, HALF)), 18) * dim : 0;
      const c = shadeCol(f.col, b, spec);
      const s2 = v.wp.map((p) => o.P(p[0], p[1], p[2]));
      const fs = fillStyle(ctx, s2, c, f.gloss, f.alpha);
      path(ctx, s2, true); ctx.fillStyle = fs; ctx.fill();
      if (f.alpha >= 1) { ctx.strokeStyle = fs; ctx.lineWidth = 0.45; ctx.stroke(); }
      if (f.edge) { ctx.strokeStyle = `rgba(0,0,0,${f.edge})`; ctx.lineWidth = 0.5; ctx.stroke(); }
      if (f.dec.length) { ctx.save(); path(ctx, s2, true); ctx.clip(); }
      for (const d of f.dec) {
        const bb = d.emit ? dim : b;
        const dc = shadeCol(d.col, bb, d.gloss ? d.gloss * 0.35 * Math.pow(Math.max(0, dot(n, HALF)), 18) * dim : 0);
        const p2 = d.p.map((p) => { const q = tp(p); return o.P(q[0], q[1], q[2]); });
        if (d.stroke) { path(ctx, p2, !d.open); ctx.strokeStyle = css(dc, d.alpha); ctx.lineWidth = d.stroke; ctx.stroke(); continue; }
        path(ctx, p2, true); ctx.fillStyle = fillStyle(ctx, p2, dc, d.gloss, d.alpha); ctx.fill();
      }
      if (f.dec.length) ctx.restore();
    }
    ctx.restore();
  };
  return M;
})();
