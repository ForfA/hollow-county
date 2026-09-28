// Level + script validator. Usage: node tools/validate.js
// Loads the game scripts in a stubbed DOM, parses every level and proves each exit is reachable
// (collecting keys, opening shutters via reachable switches, breaking barricades, prying loose panels).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);

const noop = () => {};
const ctxStub = new Proxy({}, { get: (t, k) => (k === 'getImageData' || k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(4 * 64 * 64) }) : k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' && k.startsWith('create') ? () => ({ addColorStop: noop, setTransform: noop }) : noop), set: () => true });
const elStub = () => ({ getContext: () => ctxStub, width: 0, height: 0, style: {}, classList: { add: noop, remove: noop, toggle: noop }, appendChild: noop, addEventListener: noop, querySelector: () => elStub(), querySelectorAll: () => [], children: [], innerHTML: '' });
const sandbox = {
  console, Math, JSON, Date, Promise, setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  requestAnimationFrame: noop, cancelAnimationFrame: noop, performance: { now: () => 0 }, DOMMatrix: function () {},
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  addEventListener: noop, removeEventListener: noop, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  document: { createElement: elStub, getElementById: elStub, documentElement: elStub(), fonts: null },
  Uint8Array, Uint16Array, Int16Array, Int32Array, Float32Array, Uint8ClampedArray, Map, Set, Array, Object, String, Number, Infinity, NaN, parseInt, Proxy,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
let failed = false;
for (const s of scripts) {
  if (s.endsWith('game.js')) continue;               // boots the UI; syntax-checked separately below
  try { vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), sandbox, { filename: s }); }
  catch (e) { failed = true; console.error(`✗ ${s}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
try { new vm.Script(fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'), { filename: 'js/game.js' }); }
catch (e) { failed = true; console.error('✗ js/game.js syntax:', e.message); }

const HC = sandbox.HC;
const report = (ok, msg) => { if (!ok) failed = true; console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); };

function reach(lv) {
  const def = lv.def;
  const keys = {}; const opened = new Set(); const used = new Set();
  let exitFound = false; let changed = true; let seen;
  const WK = HC.level.WK;
  while (changed) {
    changed = false;
    seen = new Uint8Array(lv.N);
    const st = [lv.idx(lv.start.x | 0, lv.start.y | 0)]; seen[st[0]] = 1;
    while (st.length) {
      const i = st.pop(); const x = i % lv.W, y = (i / lv.W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!lv.inb(nx, ny)) continue;
        const j = lv.idx(nx, ny);
        if (seen[j]) continue;
        let pass = !lv.solid[j];
        const d = lv.doors.get(j);
        if (d) pass = d.lock ? !!keys[d.lock] : d.shutter ? opened.has(d.tag) : true;
        if (lv.secretWalls.has(j)) pass = true;
        if (lv.windows.has(j)) pass = false;
        if (pass) { seen[j] = 1; st.push(j); }
      }
    }
    for (const it of lv.items) {
      if (it.type.startsWith('key') && seen[lv.idx(it.x | 0, it.y | 0)] && !keys[it.type.slice(3)]) { keys[it.type.slice(3)] = true; changed = true; }
    }
    for (const m of lv.mobs) if (m.drop && m.drop.startsWith('key') && seen[lv.idx(m.x | 0, m.y | 0)] && !keys[m.drop.slice(3)]) { keys[m.drop.slice(3)] = true; changed = true; }
    for (const p of lv.props) {
      if (!p.use || used.has(p)) continue;
      let adj = false;
      for (let yy = p.y - 1; yy <= p.y + p.d; yy++) for (let xx = p.x - 1; xx <= p.x + p.w; xx++) if (lv.inb(xx, yy) && seen[lv.idx(xx, yy)]) adj = true;
      if (!adj) continue;
      used.add(p); changed = true;
      const acts = (def.script.switch && def.script.switch[p.use.switch]) || [];
      const walk = (list) => list.forEach((a) => { if (a[0] === 'open') opened.add(a[1]); if (a[0] === 'heli') opened.add('__heli'); if (a[0] === 'timer') walk(a[2]); });
      walk(acts);
    }
  }
  for (let i = 0; i < lv.N; i++) if (seen[i] && (lv.exits[i] === 1 || (lv.exits[i] === 2 && opened.has('__heli')))) exitFound = true;
  return { exitFound, keys, seen, opened };
}

for (const def of [HC.TITLE_LEVEL, ...HC.LEVELS]) {
  console.log(`\n${def.id} — ${def.name}`);
  const warn = console.warn; const warns = []; console.warn = (...a) => warns.push(a.join(' '));
  let lv;
  try { lv = HC.level.load(def); } catch (e) { report(false, 'load failed: ' + e.stack); continue; } finally { console.warn = warn; }
  report(!warns.length, warns.length ? warns.join('; ') : 'all map characters known');
  report(!lv.solid[lv.idx(lv.start.x | 0, lv.start.y | 0)], `player start ${lv.start.x - 0.5},${lv.start.y - 0.5} is open floor`);
  if (def.id === 'title') continue;
  const r = reach(lv);
  report(r.exitFound, `exit reachable (keys used: ${Object.keys(r.keys).join(', ') || 'none'}${r.opened.size ? '; opened: ' + [...r.opened].join(', ') : ''})`);
  const unreachable = lv.items.filter((it) => !r.seen[lv.idx(it.x | 0, it.y | 0)]);
  report(!unreachable.length, unreachable.length ? 'unreachable items: ' + unreachable.map((i) => `${i.type}@${i.x - 0.5},${i.y - 0.5}`).join(' ') : `all ${lv.items.length} items reachable`);
  const lockedKeys = new Set(); lv.doors.forEach((d) => { if (d.lock) lockedKeys.add(d.lock); });
  const keyItems = new Set(lv.items.filter((i) => i.type.startsWith('key')).map((i) => i.type.slice(3)).concat(lv.mobs.filter((m) => m.drop).map((m) => m.drop.slice(3))));
  report([...lockedKeys].every((k) => keyItems.has(k)), `locked colours ${[...lockedKeys].join(', ') || '—'} all have keys`);
  const notes = lv.items.filter((i) => i.type === 'note');
  const story = HC.story.notes[def.id] || [];
  report(notes.every((n) => story[n.note]), `${notes.length} notes map to story text (${story.length} written)`);
  const mobsSolid = lv.mobs.filter((m) => lv.solid[lv.idx(m.x | 0, m.y | 0)]);
  report(!mobsSolid.length, mobsSolid.length ? 'mobs inside solid tiles: ' + mobsSolid.map((m) => `${m.x - 0.5},${m.y - 0.5}`).join(' ') : `${lv.mobs.length} zombies placed (+${Object.values(lv.spawns).reduce((a, g) => a + g.length, 0)} in spawn groups)`);
  const trigs = lv.trigNames.filter((n) => !(def.script.trig && def.script.trig[n]));
  report(!trigs.length, trigs.length ? 'triggers without script: ' + trigs.join(', ') : `triggers: ${lv.trigNames.join(', ') || 'none'}`);
  // place names: every label resolves; every enterable room is named (hidden stashes may stay unnamed)
  const labErr = lv.labelErrors.slice();
  for (const L of def.labels || []) {
    if (L.at && !L.rect && (!lv.inb(L.at[0], L.at[1]) || lv.solid[lv.idx(L.at[0], L.at[1])])) labErr.push(`${L.name}: ${L.at} is not open floor`);
    if (L.rect) {
      let open = false;
      for (let y = L.rect[1]; y <= L.rect[3]; y++) for (let x = L.rect[0]; x <= L.rect[2]; x++) if (lv.inb(x, y) && !lv.solid[lv.idx(x, y)]) open = true;
      if (!open) labErr.push(`${L.name}: rect has no open floor`);
    }
  }
  report(!labErr.length, labErr.length ? 'labels: ' + labErr.join('; ') : `${lv.labels.length} place labels resolve (${lv.labels.filter((l) => l.kind === 'area').length} outdoor areas, ${lv.buildings.filter((b) => b.name).length} named buildings)`);
  const nRooms = lv.stashRoom.length;
  const unnamed = [], unnamedStash = [];
  for (let rm = 0; rm < nRooms; rm++) {
    let named = true, entered = false, x = 0, y = 0;
    for (let i = 0; i < lv.N; i++) if (lv.room[i] === rm) { if (lv.placeAt[i] < 0) named = false; if (r.seen[i]) entered = true; x = i % lv.W; y = (i / lv.W) | 0; }
    if (named || !entered) continue;
    (lv.stashRoom[rm] >= 0 ? unnamedStash : unnamed).push(`room ${rm} near ${x},${y}`);
  }
  report(!unnamed.length, unnamed.length ? 'unnamed enterable rooms: ' + unnamed.join(', ') : `all ${nRooms} rooms named${unnamedStash.length ? ` (stashes left unnamed: ${unnamedStash.join(', ')})` : ''}`);
  const objs = [];
  const walkObj = (list) => (list || []).forEach((a) => { if (a[0] === 'objective') objs.push(a[1]); if (a[0] === 'timer') walkObj(a[2]); });
  Object.values(def.script).forEach((v) => (Array.isArray(v) ? walkObj(v) : Object.values(v).forEach(walkObj)));
  for (const o of objs) {
    const m = lv.matchText(o);
    const names = [...m.labels].map((k) => lv.labels[k].name).concat([...m.buildings].map((b) => lv.buildings[b].name));
    console.log(`    · "${o}" → ${names.join(', ') || '(no place named)'}`);
  }
  console.log(`    ${lv.W}x${lv.H} · ${lv.buildings.length} buildings · ${lv.secrets} secrets · ${lv.lights.length} lights · ${lv.props.length} props`);
}
console.log(failed ? '\nVALIDATION FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
