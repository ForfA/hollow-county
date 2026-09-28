// Hollow County — core: namespace, math, RNG, noise, colour helpers, input.
'use strict';
const HC = (window.HC = {});

// ---------------------------------------------------------------- projection
// World: x → screen down-right, y → screen down-left, z up. 1 tile = 1 unit.
HC.HW = 32;          // half tile width (px)
HC.HH = 16;          // half tile height (px)
HC.ZP = 40;          // px per unit of height
HC.WALLH = 1.9;      // wall height (units)
HC.isoX = (x, y) => (x - y) * HC.HW;
HC.isoY = (x, y, z) => (x + y) * HC.HH - (z || 0) * HC.ZP;
HC.unIso = (sx, sy) => {
  const a = sx / HC.HW, b = sy / HC.HH;
  return { x: (a + b) / 2, y: (b - a) / 2 };
};

// ---------------------------------------------------------------- math
HC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
HC.lerp = (a, b, t) => a + (b - a) * t;
HC.smooth = (t) => t * t * (3 - 2 * t);
HC.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
HC.angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
HC.approach = (v, target, amt) => (v < target ? Math.min(target, v + amt) : Math.max(target, v - amt));
HC.damp = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt);

// ---------------------------------------------------------------- RNG
HC.rng = function (seed) {
  let s = seed >>> 0 || 1;
  const f = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
};
HC.R = HC.rng((Date.now() ^ 0x5eed) >>> 0);   // gameplay randomness
HC.hash2 = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// value noise (tileable over `period`)
HC.vnoise = function (x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const p = period || 1e9;
  const h = (a, b) => HC.hash2(((a % p) + p) % p, ((b % p) + p) % p, seed);
  const u = HC.smooth(xf), v = HC.smooth(yf);
  return HC.lerp(HC.lerp(h(xi, yi), h(xi + 1, yi), u), HC.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
};
HC.fbm = function (x, y, period, seed, oct) {
  let a = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < (oct || 4); i++) {
    a += amp * HC.vnoise(x * f, y * f, period * f, seed + i * 17);
    n += amp; amp *= 0.5; f *= 2;
  }
  return a / n;
};

// ---------------------------------------------------------------- colour
HC.hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
HC.rgb = (c, a) => (a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
HC.shade = (c, k) => [HC.clamp(c[0] * k, 0, 255), HC.clamp(c[1] * k, 0, 255), HC.clamp(c[2] * k, 0, 255)];
HC.mix = (a, b, t) => [HC.lerp(a[0], b[0], t), HC.lerp(a[1], b[1], t), HC.lerp(a[2], b[2], t)];
HC.col = (c) => (typeof c === 'string' ? HC.hex(c) : c);

HC.canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

// ---------------------------------------------------------------- input
HC.input = (function () {
  const I = {
    down: {}, pressed: {}, mouse: { x: 0, y: 0, l: false, r: false, lp: false, rp: false },
    wheel: 0, anyPressed: false, lastKey: null,
  };
  const block = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'F1']);
  addEventListener('keydown', (e) => {
    if (block.has(e.code)) e.preventDefault();
    if (!I.down[e.code]) { I.pressed[e.code] = true; I.anyPressed = true; I.lastKey = e.code; }
    I.down[e.code] = true;
  });
  addEventListener('keyup', (e) => { I.down[e.code] = false; });
  addEventListener('blur', () => { I.down = {}; I.mouse.l = I.mouse.r = false; });
  addEventListener('mousemove', (e) => { I.mouse.x = e.clientX; I.mouse.y = e.clientY; });
  addEventListener('mousedown', (e) => {
    if (e.button === 0) { I.mouse.l = true; I.mouse.lp = true; }
    if (e.button === 2) { I.mouse.r = true; I.mouse.rp = true; }
    I.anyPressed = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) I.mouse.l = false;
    if (e.button === 2) I.mouse.r = false;
  });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  I.hit = (code) => !!I.pressed[code];
  I.endFrame = () => { I.pressed = {}; I.mouse.lp = I.mouse.rp = false; I.wheel = 0; I.anyPressed = false; };
  return I;
})();

// ---------------------------------------------------------------- settings / save
// Saves stay on this device only (localStorage). Keys are namespaced because every GitHub Pages project
// under one user shares the <user>.github.io origin (and therefore one localStorage).
HC.KEY = 'hollow-county.';
HC.settings = Object.assign(
  { master: 0.8, music: 0.6, sfx: 0.9, shake: true, gore: true },
  (() => { try { return JSON.parse(localStorage.getItem(HC.KEY + 'settings') || localStorage.getItem('hc.settings') || '{}'); } catch (e) { return {}; } })()
);
HC.saveSettings = () => { try { localStorage.setItem(HC.KEY + 'settings', JSON.stringify(HC.settings)); } catch (e) { /* storage unavailable */ } };
HC.loadSave = () => { try { return JSON.parse(localStorage.getItem(HC.KEY + 'save') || localStorage.getItem('hc.save') || 'null'); } catch (e) { return null; } };
HC.writeSave = (s) => { try { localStorage.setItem(HC.KEY + 'save', JSON.stringify(s)); } catch (e) { /* storage unavailable */ } };
HC.clearSave = () => { try { localStorage.removeItem(HC.KEY + 'save'); localStorage.removeItem('hc.save'); } catch (e) { /* storage unavailable */ } };

HC.fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
