// Hollow County — level parsing & tile world: floors, thin walls, doors, windows, props, rooms/buildings, triggers.
'use strict';
HC.LEVELS = [];
HC.level = (function () {
  const L = {};
  const FID = HC.gfx.floorId;

  // wall kinds
  const WK = { none: 0, brick: 1, siding: 2, drywall: 3, cblock: 4, hosp: 5, panel: 6, metal: 7, fence: 8, woodfence: 9, hedge: 10, sandbag: 11, window: 12, door: 13 };
  const WKN = Object.keys(WK);
  L.WK = WK;

  // default legend (levels may override / extend)
  const DEF = {
    ' ': { void: 1 },
    '.': { f: 'grass' }, ',': { f: 'asphalt' }, "'": { f: 'road' }, ':': { f: 'concrete' }, ';': { f: 'dirt' }, '`': { f: 'gravel' },
    '_': { f: 'lino' }, '=': { f: 'wood' }, '~': { f: 'carpet' }, '+': { f: 'tile' }, '^': { f: 'mall' }, '"': { f: 'parking' }, '-': { f: 'slab' }, 'q': { f: 'yard' },
    '#': { w: 'brick' }, 'H': { w: 'siding' }, '|': { w: 'drywall' }, 'C': { w: 'cblock' }, 'N': { w: 'hosp' }, 'M': { w: 'metal' },
    'F': { w: 'fence' }, 'P': { w: 'woodfence' }, '%': { w: 'hedge' }, 'S': { w: 'sandbag' },
    'W': { w: 'window' }, 'D': { door: {} }, 'd': { door: { open: 1 } }, 'R': { door: { lock: 'red' } }, 'B': { door: { lock: 'blue' } }, 'Y': { door: { lock: 'yellow' } },
    'X': { door: { barricade: 1 } }, 'L': { w: 'auto', secret: 1 },
    'T': { tree: 1 },
    '@': { start: 1 },
    'z': { mob: 'shambler' }, 'Z': { mob: 'sprinter' }, 'k': { mob: 'crawler' }, 'O': { mob: 'fat' }, 'U': { mob: 'soldier' }, 'J': { mob: 'juggernaut' },
    'h': { item: 'medkit' }, 'p': { item: 'pills' }, 'v': { item: 'bandage' }, 'A': { item: 'antiviral' },
    'a': { item: 'ammo9' }, 's': { item: 'shells' }, 'r': { item: 'ammo556' }, 'm': { item: 'molotov' }, 'j': { item: 'jacket' }, 'V': { item: 'vest' },
    '1': { item: 'bat' }, '2': { item: 'pistol' }, '3': { item: 'shotgun' }, '4': { item: 'rifle' }, '5': { item: 'axe' },
    '!': { item: 'keyred' }, '?': { item: 'keyblue' }, '&': { item: 'keyyellow' },
    'n': { note: 1 }, 'E': { exit: 1 }, '*': { secretArea: 1 },
    'c': { prop: 'car', group: 1 }, 'o': { prop: 'counter', facing: 1 }, 'u': { prop: 'shelf', group: 1, facing: 1 }, 'e': { prop: 'bed', group: 1 },
    'i': { prop: 'table', group: 1 }, 'f': { prop: 'sofa', group: 1, facing: 1 }, 'g': { prop: 'desk', facing: 1 }, 'b': { prop: 'bookshelf', facing: 1 },
    'x': { prop: 'crate' }, 't': { prop: 'trash' }, 'w': { prop: 'fridge', facing: 1 }, 'y': { prop: 'stove', facing: 1 }, 'l': { light: 1 },
    // items inside secret areas
    'α': { item: 'antiviral', secretArea: 1 }, 'β': { item: 'ammo9', secretArea: 1 }, 'γ': { item: 'shells', secretArea: 1 },
    'δ': { item: 'molotov', secretArea: 1 }, 'ε': { item: 'jacket', secretArea: 1 }, 'ζ': { item: 'medkit', secretArea: 1 },
    'η': { item: 'ammo556', secretArea: 1 }, 'θ': { item: 'vest', secretArea: 1 }, 'ι': { item: 'pills', secretArea: 1 },
    // notes with explicit ids
    '(': { note: 1, id: 0 }, ')': { note: 1, id: 1 }, '[': { note: 1, id: 2 }, ']': { note: 1, id: 3 }, '{': { note: 1, id: 4 }, '}': { note: 1, id: 5 },
  };
  L.DEF = DEF;

  const SIDING = ['#9aaab2', '#c8bc9c', '#a0a888', '#cfcfc6', '#c9b77e', '#a08470', '#8f9c9c', '#b8a898'];
  const WALLPAPER = [
    { k: 'plaster', col: '#b9a888', pat: 1 }, { k: 'plaster', col: '#9fb2a6', pat: 0 }, { k: 'plaster', col: '#b89a94', pat: 2 },
    { k: 'plaster', col: '#a3aabb', pat: 1 }, { k: 'plaster', col: '#c8bea6', pat: 3 }, { k: 'panel' }, { k: 'plaster', col: '#b4b89a', pat: 2 },
  ];
  function wtex(spec) {
    const G = HC.gfx.WT;
    let t, k;
    switch (spec.k) {
      case 'plaster': t = G.plaster(spec.col, spec.pat || 0); k = 'pl' + spec.col + (spec.pat || 0); break;
      case 'siding': t = G.siding(spec.col); k = 'sd' + spec.col; break;
      case 'brick': t = G.brick(spec.col); k = 'br' + (spec.col || ''); break;
      case 'cblock': t = G.cblock(spec.col); k = 'cb' + (spec.col || ''); break;
      case 'hosp': t = G.hosp(); k = 'hp'; break;
      case 'panel': t = G.panel(); k = 'pn'; break;
      case 'metal': t = G.metal(spec.col); k = 'mt' + (spec.col || ''); break;
      case 'woodfence': t = G.woodfence(); k = 'wf'; break;
      case 'hedge': t = G.hedge(); k = 'hg'; break;
      case 'sandbag': t = G.sandbag(); k = 'sb'; break;
      default: t = G.plaster('#999999', 0); k = 'x';
    }
    return { t, k };
  }

  L.load = function (def) {
    const legend = Object.assign({}, DEF, def.legend || {});
    const rows = def.map.map((r) => r.replace(/\s+$/, ''));
    const H = rows.length, W = Math.max(...rows.map((r) => r.length)) + 0;
    const N = W * H;
    const lv = {
      def, W, H, N,
      floor: new Uint8Array(N), wk: new Uint8Array(N), wkind: new Uint8Array(N), conn: new Uint8Array(N),
      solid: new Uint8Array(N), opaque: new Uint8Array(N), voidT: new Uint8Array(N),
      doors: new Map(), windows: new Map(), props: [], propAt: new Int32Array(N).fill(-1),
      trees: [], lights: [], items: [], mobs: [], spawns: {}, exits: new Uint8Array(N), secretId: new Int16Array(N).fill(-1), secrets: 0,
      trig: new Int16Array(N).fill(-1), trigNames: [], notes: [], start: { x: 2, y: 2 }, seen: new Uint8Array(N), vis: new Uint16Array(N),
      room: new Int32Array(N).fill(-1), bld: new Int32Array(N).fill(-1), buildings: [], secretWalls: new Map(), roadOrient: new Uint8Array(N),
      itemTotal: 0, killTotal: 0, fx: [], uses: [], decals: [],
    };
    const idx = (x, y) => y * W + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    lv.idx = idx; lv.inb = inb;
    const chars = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) chars.push(rows[y][x] || ' ');
    const ent = (x, y) => (inb(x, y) ? legend[chars[idx(x, y)]] || null : null);
    const unknown = new Set();
    // pass 1: explicit floors & walls
    const under = def.floors || null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = chars[idx(x, y)], e = legend[ch];
      if (!e) { unknown.add(ch); lv.voidT[idx(x, y)] = 1; continue; }
      if (e.void) { lv.voidT[idx(x, y)] = 1; continue; }
      if (e.f) lv.floor[idx(x, y)] = FID[e.f];
      else if (under && under[y] && under[y][x] && under[y][x] !== ' ') {
        const u = legend[under[y][x]];
        if (u && u.f) lv.floor[idx(x, y)] = FID[u.f];
      }
      if (e.w) lv.wk[idx(x, y)] = e.w === 'auto' ? 255 : WK[e.w];
      if (e.door) lv.wk[idx(x, y)] = WK.door;
    }
    if (unknown.size) console.warn('Unknown map chars in', def.id, [...unknown].join(''));
    // pass 2: infer floors (iterate so inference spreads)
    const isIndoorF = (f) => f && HC.gfx.FLOORS[f] && HC.gfx.FLOORS[f].indoor;
    for (let pass = 0; pass < 4; pass++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (lv.floor[i] || lv.voidT[i]) continue;
        const cnt = {};
        let best = 0, bestN = 0, indoor = 0;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
        nb.forEach(([dx, dy], k) => {
          if (!inb(x + dx, y + dy)) return;
          const j = idx(x + dx, y + dy);
          const f = lv.floor[j];
          if (!f || (lv.wk[j] && pass === 0)) return;
          const wgt = k < 4 ? 2 : 1;
          cnt[f] = (cnt[f] || 0) + wgt;
          if (isIndoorF(f)) indoor = f;
          if (cnt[f] > bestN) { bestN = cnt[f]; best = f; }
        });
        if (lv.wk[i] && indoor) best = indoor;
        if (best) lv.floor[i] = best;
      }
    }
    for (let i = 0; i < N; i++) if (!lv.floor[i] && !lv.voidT[i]) lv.floor[i] = FID.dirt;
    // resolve 'auto' walls (secret panels) to their neighbours' kind
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (lv.wk[i] !== 255) continue;
      let k = WK.drywall;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!inb(x + dx, y + dy)) continue; const n = lv.wk[idx(x + dx, y + dy)]; if (n && n !== 255 && n < WK.window) { k = n; break; } }
      lv.wk[i] = k;
      lv.secretWalls.set(i, { x, y, open: false });
    }
    // road line orientation
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (HC.gfx.FLOORS[lv.floor[i]] && (HC.gfx.FLOORS[lv.floor[i]].line)) {
        const f = lv.floor[i];
        const hx = (inb(x - 1, y) && lv.floor[idx(x - 1, y)] === f) || (inb(x + 1, y) && lv.floor[idx(x + 1, y)] === f);
        lv.roadOrient[i] = hx ? 0 : 1;
      }
    }
    // pass 3: entities, props, doors, windows, markers
    const groupDone = new Uint8Array(N);
    let noteN = 0;
    const secretComp = new Int16Array(N).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y), ch = chars[i], e = legend[ch];
      if (!e) continue;
      if (e.start) lv.start = { x: x + 0.5, y: y + 0.5, face: e.face || 0 };
      if (e.mob) {
        const m = { type: e.mob, x: x + 0.5, y: y + 0.5, outfit: e.outfit || null, drop: e.drop || null };
        if (e.group) (lv.spawns[e.group] = lv.spawns[e.group] || []).push(m);
        else lv.mobs.push(m);
      }
      if (e.decal) lv.decals.push({ kind: e.decal, x: x + 0.5, y: y + 0.5 });
      if (e.item) { lv.items.push({ type: e.item, x: x + 0.5, y: y + 0.5 }); }
      if (e.note) { lv.items.push({ type: 'note', x: x + 0.5, y: y + 0.5, note: e.id !== undefined ? e.id : noteN++ }); }
      if (e.fx) lv.fx.push({ kind: e.fx, x: x + 0.5, y: y + 0.5 });
      if (e.use && !e.prop) lv.uses.push({ x, y, use: e.use });
      if (e.exit) lv.exits[i] = e.locked ? 2 : 1;
      if (e.trig) { let t = lv.trigNames.indexOf(e.trig); if (t < 0) { t = lv.trigNames.length; lv.trigNames.push(e.trig); } lv.trig[i] = t; }
      if (e.secretArea) secretComp[i] = 0;
      if (e.tree) { lv.trees.push({ x, y, v: HC.hash2(x, y, 3) * 6 | 0 }); lv.solid[i] = 1; }
      if (e.light) {
        const indoor = isIndoorF(lv.floor[i]);
        if (indoor || e.ceiling) lv.lights.push({ x: x + 0.5, y: y + 0.5, z: 1.7, r: e.r || 5.5, col: e.col || [255, 236, 200], flicker: e.flicker || 0, ceiling: 1 });
        else {
          lv.props.push({ type: 'streetlamp', x, y, w: 1, d: 1, face: 'S', var: 0, blocks: 1 });
          lv.propAt[i] = lv.props.length - 1; lv.solid[i] = 1;
          lv.lights.push({ x: x + 0.5, y: y + 0.21, z: 3, r: e.r || 7.5, col: e.col || [255, 190, 110], flicker: e.flicker || 0 });
        }
      }
      if (e.door) {
        const d = Object.assign({ x, y, i, open: 0, anim: 0, hp: 100, maxHp: 100 }, e.door);
        d.open = d.open ? 1 : 0; d.anim = d.open;
        if (d.barricade) { d.hp = d.maxHp = 260; }
        if (d.shutter) { d.hp = d.maxHp = 99999; }
        if (d.lock) { d.hp = d.maxHp = 99999; }
        d.tag = e.tag || d.tag || null;
        lv.doors.set(i, d);
      }
      if (e.w === 'window') lv.windows.set(i, { x, y, i, hp: 3, broken: !!e.broken });
      if (e.prop && !groupDone[i]) {
        let w = 1, d = 1;
        if (e.group) {
          while (x + w < W && chars[idx(x + w, y)] === ch && !groupDone[idx(x + w, y)]) w++;
          while (y + d < H && chars[idx(x, y + d)] === ch) d++;
          for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + w; xx++) groupDone[idx(xx, yy)] = 1;
        }
        const pr = { type: e.prop, x, y, w, d, face: 'S', var: (HC.hash2(x, y, 9) * 12) | 0, col: e.col || null, blocks: e.blocks === 0 ? 0 : 1, use: e.use || null, tag: e.tag || null, cross: e.cross, lightCol: e.lightCol };
        if (e.colors) pr.col = e.colors[(HC.hash2(x, y, 5) * e.colors.length) | 0];
        if (e.prop === 'car' && !pr.col) pr.col = ['#6a2a24', '#2a3a5a', '#c8c4b4', '#3a4a3a', '#8a7a5a', '#5a5a5e', '#7a3a1a', '#1e2226'][(HC.hash2(x, y, 7) * 8) | 0];
        if (e.face) pr.face = e.face;
        else if (e.facing) {
          const back = (xx, yy) => inb(xx, yy) && (lv.wk[idx(xx, yy)] > 0 && lv.wk[idx(xx, yy)] < WK.window);
          const n = [], s = [], ww = [], ee = [];
          for (let k = 0; k < w; k++) { n.push(back(x + k, y - 1)); s.push(back(x + k, y + d)); }
          for (let k = 0; k < d; k++) { ww.push(back(x - 1, y + k)); ee.push(back(x + w, y + k)); }
          if (n.some(Boolean)) pr.face = 'S'; else if (ww.some(Boolean)) pr.face = 'E'; else if (s.some(Boolean)) pr.face = 'N'; else if (ee.some(Boolean)) pr.face = 'W';
        }
        if (e.state !== undefined) pr.var = e.state;
        lv.props.push(pr);
        const pi = lv.props.length - 1;
        for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + w; xx++) { lv.propAt[idx(xx, yy)] = pi; if (pr.blocks) lv.solid[idx(xx, yy)] = 1; }
      }
    }
    // secret areas: one stash = secret-marked tiles within 2 tiles of each other
    for (let i = 0; i < N; i++) {
      if (secretComp[i] !== 0) continue;
      const id = lv.secrets++;
      const st = [i]; secretComp[i] = 1;
      while (st.length) {
        const j = st.pop(); lv.secretId[j] = id; const x = j % W, y = (j / W) | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (!inb(x + dx, y + dy)) continue; const k = idx(x + dx, y + dy); if (secretComp[k] === 0) { secretComp[k] = 1; st.push(k); } }
      }
    }
    lv.secretFound = new Uint8Array(lv.secrets);
    // connectivity + collision/opacity
    const isWallish = (j) => lv.wk[j] > 0;
    const connects = (a, b) => {
      if (!b) return false;
      const lowA = a === WK.hedge || a === WK.sandbag || a === WK.fence || a === WK.woodfence;
      const lowB = b === WK.hedge || b === WK.sandbag || b === WK.fence || b === WK.woodfence;
      if (lowA || lowB) return a === b || (!lowB && lowA && (a === WK.fence || a === WK.woodfence)) || (!lowA && lowB && (b === WK.fence || b === WK.woodfence));
      return true;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (!isWallish(i)) continue;
      let m = 0;
      const k = lv.wk[i];
      [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].forEach(([dx, dy, b]) => { if (inb(x + dx, y + dy) && connects(k, lv.wk[idx(x + dx, y + dy)])) m |= b; });
      lv.conn[i] = m;
    }
    // door/window orientation
    const alongX = (x, y) => {
      const w = inb(x - 1, y) && isWallish(idx(x - 1, y)), e = inb(x + 1, y) && isWallish(idx(x + 1, y));
      const n = inb(x, y - 1) && isWallish(idx(x, y - 1)), s = inb(x, y + 1) && isWallish(idx(x, y + 1));
      if ((w || e) && !(n || s)) return true;
      if ((n || s) && !(w || e)) return false;
      return w && e;
    };
    lv.doors.forEach((d) => { d.alongX = alongX(d.x, d.y); });
    lv.windows.forEach((w) => { w.alongX = alongX(w.x, w.y); });
    // window kind: inherit from neighbours for texture
    lv.windows.forEach((w) => {
      let k = WK.drywall;
      for (const [dx, dy] of w.alongX ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]) { if (!inb(w.x + dx, w.y + dy)) continue; const n = lv.wk[idx(w.x + dx, w.y + dy)]; if (n && n < WK.window) { k = n; break; } }
      w.kind = k;
    });
    lv.doors.forEach((d) => {
      let k = WK.drywall;
      for (const [dx, dy] of d.alongX ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]) { if (!inb(d.x + dx, d.y + dy)) continue; const n = lv.wk[idx(d.x + dx, d.y + dy)]; if (n && n < WK.window) { k = n; break; } }
      d.kind = k;
    });
    L.refreshTile = (i) => refresh(lv, i);
    for (let i = 0; i < N; i++) refresh(lv, i);
    // rooms (split by walls & doors) and buildings (joined through doors/windows)
    const indoorAt = (j) => isIndoorF(lv.floor[j]) && !lv.voidT[j] && !isWallish(j);
    let rid = 0;
    for (let i = 0; i < N; i++) {
      if (!indoorAt(i) || lv.room[i] >= 0) continue;
      const st = [i]; lv.room[i] = rid;
      while (st.length) { const j = st.pop(); const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!inb(x + dx, y + dy)) continue; const k = idx(x + dx, y + dy); if (lv.room[k] < 0 && indoorAt(k)) { lv.room[k] = rid; st.push(k); } } }
      rid++;
    }
    let bid = 0;
    const bldTiles = [];
    for (let i = 0; i < N; i++) {
      if (!indoorAt(i) || lv.bld[i] >= 0) continue;
      const tiles = [];
      const st = [i]; lv.bld[i] = bid;
      while (st.length) {
        const j = st.pop(); tiles.push(j);
        const x = j % W, y = (j / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!inb(x + dx, y + dy)) continue;
          const k = idx(x + dx, y + dy);
          if (lv.bld[k] >= 0) continue;
          if (indoorAt(k)) { lv.bld[k] = bid; st.push(k); }
          else if ((lv.doors.has(k) || lv.windows.has(k) || lv.secretWalls.has(k)) && indoorAt(j)) {
            // pass through the opening only if the far side is indoor too
            const k2x = x + dx * 2, k2y = y + dy * 2;
            if (inb(k2x, k2y) && indoorAt(idx(k2x, k2y))) { lv.bld[k] = bid; st.push(k); }
          }
        }
      }
      bldTiles.push(tiles);
      bid++;
    }
    // attach bordering walls/doors to building, compute roof tiles
    for (let b = 0; b < bid; b++) {
      const set = new Set(bldTiles[b]);
      const extra = [];
      for (const j of bldTiles[b]) {
        const x = j % W, y = (j / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!inb(x + dx, y + dy)) continue;
          const k = idx(x + dx, y + dy);
          if (!set.has(k) && isWallish(k) && lv.bld[k] < 0) { lv.bld[k] = b; set.add(k); extra.push(k); }
        }
      }
      const all = bldTiles[b].concat(extra);
      const cfg = (def.buildings && def.buildings.find((q) => all.includes(idx(q.at[0], q.at[1])))) || {};
      const seed = HC.hash2(bldTiles[b][0] % W, (bldTiles[b][0] / W) | 0, 17);
      lv.buildings.push({
        id: b, tiles: all, set, alpha: 1,
        siding: cfg.siding || SIDING[(seed * SIDING.length) | 0], roofCol: cfg.roof !== undefined ? cfg.roof : ((seed * 97) | 0) % 6,
        flat: cfg.flat !== undefined ? cfg.flat : !!def.flatRoofs, noRoof: !!cfg.noRoof, name: cfg.name || null,
      });
    }
    // roof edges
    lv.roofEdge = new Uint8Array(N);
    for (const b of lv.buildings) for (const j of b.tiles) {
      const x = j % W, y = (j / W) | 0; let m = 0;
      [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]].forEach(([dx, dy, bit]) => { if (!inb(x + dx, y + dy) || lv.bld[idx(x + dx, y + dy)] !== b.id) m |= bit; });
      lv.roofEdge[j] = m;
    }
    // textures for wall faces
    lv.wallpaperFor = (room) => {
      const pool = def.interiors || WALLPAPER;
      return wtex(pool[Math.abs(room * 7 + 3) % pool.length]);
    };
    lv.faceTex = (i, ni) => faceTex(lv, i, ni);
    lv.itemTotal = lv.items.filter((it) => it.type !== 'note').length;
    lv.killTotal = lv.mobs.length + Object.values(lv.spawns).reduce((a, g) => a + g.length, 0);
    lv.chars = chars;
    placeNames(lv, def);
    return lv;
  };

  // ---- place names (automap labels, HUD location line). def.labels is a list of:
  //   { at: [x, y], name }                     names the whole indoor room (lv.room id) containing tile x,y
  //   { rect: [x0, y0, x1, y1], name, at? }    names an area. `at` (default: rect centre) is where the map label sits.
  //                                            Outdoor anchor → the outdoor tiles in the rect; indoor anchor → only the
  //                                            part of the anchor's room inside the rect (e.g. a lobby in a corridor room).
  //   optional `alias: 'word' | ['word', ...]` extra wording that matches objective text (for the automap highlight).
  // The smallest region containing a tile wins. Labels on hidden-stash rooms stay off the automap until the stash is found.
  // Building names come from def.buildings[].name.
  function placeNames(lv, def) {
    const { W, H, N, idx, inb } = lv;
    const nRooms = lv.room.reduce((a, r) => Math.max(a, r + 1), 0);
    const roomTiles = Array.from({ length: nRooms }, () => []);
    for (let i = 0; i < N; i++) if (lv.room[i] >= 0) roomTiles[lv.room[i]].push(i);
    // stash rooms: reachable only through a loose panel (no ordinary door) — their secret id gates the map label
    lv.stashRoom = new Int16Array(nRooms).fill(-1);
    roomTiles.forEach((tiles, r) => {
      let door = false, panel = false, sec = -1;
      for (const j of tiles) {
        const x = j % W, y = (j / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!inb(x + dx, y + dy)) continue;
          const k = idx(x + dx, y + dy);
          if (lv.secretId[k] >= 0 && sec < 0) sec = lv.secretId[k];   // stash items can sit on tiles just outside the room
          if (dx && dy) continue;
          if (lv.doors.has(k)) door = true;
          if (lv.secretWalls.has(k)) panel = true;
        }
      }
      if (panel && !door && sec >= 0) lv.stashRoom[r] = sec;
    });
    const outdoor = (j) => lv.room[j] < 0 && lv.bld[j] < 0;
    lv.labels = []; lv.labelErrors = [];
    lv.roomName = new Array(nRooms).fill(null);
    for (const L of def.labels || []) {
      const lab = { name: L.name, alias: [].concat(L.alias || []), rect: null, kind: 'room', room: -1, tiles: [], own: [], x: 0, y: 0, secret: -1, seen: false };
      if (L.rect) {
        const [x0, y0, x1, y1] = L.rect;
        if (!(inb(x0, y0) && inb(x1, y1) && x0 <= x1 && y0 <= y1)) { lv.labelErrors.push(`${L.name}: rect out of bounds`); continue; }
        lab.rect = [x0, y0, x1, y1];
        const [ax, ay] = L.at || [Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2)];
        if (ax < x0 || ax > x1 || ay < y0 || ay > y1) lv.labelErrors.push(`${L.name}: anchor ${ax},${ay} outside its rect`);
        lab.room = inb(ax, ay) ? lv.room[idx(ax, ay)] : -1;
        lab.kind = lab.room >= 0 ? 'part' : 'area';
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const j = idx(x, y);
          if (lab.room >= 0 ? lv.room[j] === lab.room : outdoor(j)) lab.tiles.push(j);
        }
        lab.ax = ax; lab.ay = ay; lab.fixed = !!L.at;
      } else {
        const [ax, ay] = L.at || [-1, -1];
        lab.room = inb(ax, ay) ? lv.room[idx(ax, ay)] : -1;
        if (lab.room < 0) { lv.labelErrors.push(`${L.name}: ${ax},${ay} is not inside a room`); continue; }
        if (lv.roomName[lab.room]) lv.labelErrors.push(`${L.name}: room already named "${lv.roomName[lab.room]}"`);
        lv.roomName[lab.room] = L.name;
        lab.tiles = roomTiles[lab.room];
        lab.ax = ax; lab.ay = ay;
      }
      if (lab.room >= 0) lab.secret = lv.stashRoom[lab.room];
      lv.labels.push(lab);
    }
    // resolve: larger regions first, so the smallest one containing a tile ends up owning it
    lv.placeAt = new Int16Array(N).fill(-1);
    lv.labels.map((l, k) => k).sort((a, b) => lv.labels[b].tiles.length - lv.labels[a].tiles.length)
      .forEach((k) => { for (const j of lv.labels[k].tiles) lv.placeAt[j] = k; });
    lv.labels.forEach((lab, k) => {
      lab.own = lab.tiles.filter((j) => lv.placeAt[j] === k);
      if (!lab.own.length) { lv.labelErrors.push(`${lab.name}: hidden entirely by smaller labels`); return; }
      if (lab.fixed) { lab.x = lab.ax + 0.5; lab.y = lab.ay + 0.5; return; }
      // map position: centroid of the tiles it owns, snapped onto one of them (L-shaped rooms)
      let sx = 0, sy = 0;
      for (const j of lab.own) { sx += j % W; sy += (j / W) | 0; }
      const cx = sx / lab.own.length, cy = sy / lab.own.length;
      let best = lab.own[0], bd = Infinity;
      for (const j of lab.own) { const d = (j % W - cx) ** 2 + (((j / W) | 0) - cy) ** 2; if (d < bd) { bd = d; best = j; } }
      lab.x = bd < 0.6 ? cx + 0.5 : (best % W) + 0.5; lab.y = bd < 0.6 ? cy + 0.5 : ((best / W) | 0) + 0.5;
    });
    const areas = lv.labels.filter((l) => l.kind === 'area').sort((a, b) => a.tiles.length - b.tiles.length);
    const areasAt = (x, y) => areas.filter((l) => x >= l.rect[0] && x <= l.rect[2] && y >= l.rect[1] && y <= l.rect[3]);
    // { name, within }: most specific name for a tile (room/part/area label, else building, else surrounding area,
    // else the level), plus the next wider place it sits in (building or larger area), or null.
    lv.placeInfo = (fx, fy) => {
      const x = Math.floor(fx), y = Math.floor(fy);
      if (!inb(x, y)) return { name: def.name, within: null };
      const i = idx(x, y);
      const chain = [];
      if (lv.placeAt[i] >= 0) chain.push(lv.labels[lv.placeAt[i]].name);
      const b = lv.bld[i] >= 0 ? lv.buildings[lv.bld[i]] : null;
      if (b && b.name) chain.push(b.name);
      for (const a of areasAt(x, y)) chain.push(a.name);
      const names = chain.filter((n, k) => chain.indexOf(n) === k);
      return { name: names[0] || def.name, within: names[1] || null };
    };
    lv.placeName = (x, y) => lv.placeInfo(x, y).name;
    // which labels / building names does a piece of text (an objective) point at? Whole-word, case-insensitive,
    // longest wording first (so "Pruitts' bedroom" doesn't also hit every "Bedroom"). "<word> key/keycard/card" is
    // dropped first so "the garage key" doesn't point at the Garage.
    const terms = new Map();
    const addTerm = (term, ref) => { const t = term.toLowerCase(); if (!terms.has(t)) terms.set(t, []); terms.get(t).push(ref); };
    lv.labels.forEach((l, k) => [l.name].concat(l.alias).forEach((a) => addTerm(a, { label: k })));
    lv.buildings.forEach((b) => { if (b.name) addTerm(b.name, { bld: b.id }); });
    const termList = [...terms.keys()].sort((a, b) => b.length - a.length)
      .map((t) => ({ re: new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9])`, 'g'), refs: terms.get(t) }));
    lv.matchText = (text) => {
      let t = String(text || '').toLowerCase().replace(/[a-z']+ (key|keycard|card)s?\b/g, ' ');
      const out = { labels: new Set(), buildings: new Set() };
      for (const { re, refs } of termList) {
        re.lastIndex = 0;
        if (!re.test(t)) continue;
        refs.forEach((r) => (r.label !== undefined ? out.labels.add(r.label) : out.buildings.add(r.bld)));
        t = t.replace(re, (m, pre) => pre + ' '.repeat(m.length - pre.length));
      }
      return out;
    };
  }

  function refresh(lv, i) {
    const k = lv.wk[i];
    let solid = 0, opaque = 0;
    if (lv.voidT[i]) { solid = 1; opaque = 1; }
    if (k && k !== WK.door && k !== WK.window) { solid = 1; opaque = k !== WK.fence && k !== WK.hedge && k !== WK.sandbag ? 1 : 0; }
    if (k === WK.window) { solid = 1; opaque = 0; }
    const sw = lv.secretWalls.get(i);
    if (sw && sw.open) { solid = 0; opaque = 0; }
    const d = lv.doors.get(i);
    if (d) { const closed = !d.open && !d.broken; solid = closed ? 1 : 0; opaque = closed && !d.shutterSee ? 1 : 0; }
    if (lv.propAt[i] >= 0 && lv.props[lv.propAt[i]].blocks) solid = 1;
    const fl = HC.gfx.FLOORS[lv.floor[i]];
    if (fl && fl.water) solid = 1;
    if (lv.trees.length && isTree(lv, i)) solid = 1;
    lv.solid[i] = solid; lv.opaque[i] = opaque;
  }
  function isTree(lv, i) {
    if (!lv._treeSet) { lv._treeSet = new Set(lv.trees.map((t) => lv.idx(t.x, t.y))); }
    return lv._treeSet.has(i);
  }

  // what material does wall tile i show toward neighbour tile ni?
  function faceTex(lv, i, ni) {
    const kind = lv.windows.has(i) ? lv.windows.get(i).kind : lv.doors.has(i) ? lv.doors.get(i).kind : lv.wk[i];
    const nIndoor = ni >= 0 && ni < lv.N && lv.room[ni] >= 0;
    const def = lv.def;
    const b = lv.buildings[lv.bld[i]];
    switch (kind) {
      case WK.hedge: return wtex({ k: 'hedge' });
      case WK.sandbag: return wtex({ k: 'sandbag' });
      case WK.woodfence: return wtex({ k: 'woodfence' });
      case WK.metal: return wtex({ k: 'metal', col: def.metalCol });
      case WK.cblock: return nIndoor && def.cblockInside ? lv.wallpaperFor(lv.room[ni]) : wtex({ k: 'cblock', col: def.cblockCol });
      case WK.hosp: return nIndoor ? wtex({ k: 'hosp' }) : wtex({ k: 'cblock', col: '#b8b4a8' });
      case WK.brick: return nIndoor ? lv.wallpaperFor(lv.room[ni]) : wtex({ k: 'brick', col: def.brickCol });
      case WK.siding: return nIndoor ? lv.wallpaperFor(lv.room[ni]) : wtex({ k: 'siding', col: b ? b.siding : '#b0a890' });
      case WK.panel: return nIndoor ? wtex({ k: 'panel' }) : wtex({ k: 'siding', col: b ? b.siding : '#b0a890' });
      default: return nIndoor ? lv.wallpaperFor(lv.room[ni]) : wtex({ k: 'plaster', col: '#bdb7a6' });
    }
  }
  L.wtex = wtex;
  L.KIND_NAME = (k) => WKN[k];
  return L;
})();

// Map composition helper: levels are built from fills + stamped ASCII blocks (' ' in a stamp is transparent).
HC.mapBuilder = function (W, H, fill, extraFloors) {   // extraFloors: level-specific floor chars (e.g. 'ǩ')
  const g = [], u = [];
  for (let y = 0; y < H; y++) { g.push(new Array(W).fill(fill || '.')); u.push(new Array(W).fill(' ')); }
  const FLOORCH = new Set(['.', ',', "'", ':', ';', '`', '_', '=', '~', '+', '^', '"', '-', 'q', ...Array.from(extraFloors || '')]);
  const B = {
    W, H,
    set(x, y, ch) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (FLOORCH.has(g[y][x]) && !FLOORCH.has(ch)) u[y][x] = g[y][x];
      g[y][x] = ch;
    },
    get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? g[y][x] : ' '; },
    fill(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) B.set(x, y, ch); },
    rect(x0, y0, x1, y1, ch) { B.fill(x0, y0, x1, y0, ch); B.fill(x0, y1, x1, y1, ch); B.fill(x0, y0, x0, y1, ch); B.fill(x1, y0, x1, y1, ch); },
    stamp(x, y, rows) {
      rows.forEach((r, j) => {
        const cs = Array.from(r);
        if (HC.DEBUG_MAPS && cs.length !== Array.from(rows[0]).length) console.warn('stamp row width mismatch at', x, y + j, r);
        cs.forEach((c, i) => { const xx = x + i, yy = y + j; if (c !== ' ' && xx >= 0 && yy >= 0 && xx < W && yy < H) { g[yy][xx] = c; u[yy][xx] = ' '; } });
      });
    },
    under(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) u[y][x] = ch; },
    scatter(x0, y0, x1, y1, ch, n, seed, on) {
      const r = HC.rng(seed || 1);
      for (let k = 0, tries = 0; k < n && tries < n * 40; tries++) {
        const x = r.int(x0, x1), y = r.int(y0, y1);
        if (on && !on.includes(g[y][x])) continue;
        B.set(x, y, ch); k++;
      }
    },
    rows() { return g.map((r) => r.join('')); },
    floorRows() { return u.map((r) => r.join('')); },
  };
  return B;
};
