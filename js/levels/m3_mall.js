// E1M3 — RIVERSIDE MALL. Overcast, rain. Blue: maintenance card (security). Breaker opens the gun store + alarm horde. Yellow: dock card (gun store).
'use strict';
(function () {
  const B = HC.mapBuilder(72, 62, '.', 'ǩ');
  // ---- outside
  for (let x = 6; x < 38; x += 2) B.set(x, 0, 'T');
  for (let y = 44; y < 62; y += 3) B.set(71, y, 'T');
  B.fill(0, 0, 4, 61, ','); B.fill(2, 0, 2, 61, "'");
  B.fill(38, 0, 65, 5, 'q');
  B.fill(37, 0, 37, 5, 'F'); B.fill(66, 0, 66, 5, 'F');
  B.fill(62, 1, 65, 4, 'E');
  B.fill(44, 1, 46, 2, 'c'); B.set(40, 4, 'x'); B.set(41, 4, 'x'); B.set(58, 1, '€'); B.set(59, 1, '€');
  B.set(48, 3, 'z'); B.set(56, 4, 'z'); B.set(60, 2, 'l');
  B.fill(5, 43, 70, 56, '"');
  B.fill(5, 43, 70, 43, ':');
  // ---- mall floors
  B.fill(7, 7, 24, 21, 'ǩ');
  B.fill(26, 7, 37, 21, '=');
  B.fill(39, 7, 64, 9, '-');
  B.fill(39, 11, 64, 21, '_');
  B.fill(7, 22, 64, 28, '^');
  B.fill(29, 30, 40, 41, '^');
  B.fill(7, 30, 14, 41, '~');
  B.fill(16, 30, 27, 41, '-');
  B.fill(42, 30, 51, 41, '~');
  B.fill(53, 30, 64, 41, '+');
  // ---- mall structure
  B.rect(6, 6, 65, 42, 'C');
  B.fill(38, 7, 38, 10, 'C'); B.fill(39, 10, 64, 10, 'C'); B.fill(58, 7, 58, 9, 'C');
  B.set(58, 8, 'D'); B.set(46, 10, 'B'); B.set(52, 6, 'Y');
  B.fill(25, 7, 25, 22, '|'); B.fill(38, 11, 38, 22, '|');
  B.fill(7, 22, 37, 22, '|');
  B.set(15, 22, 'd'); B.set(16, 22, 'd');
  [10, 11, 12, 19, 20, 21, 27, 28, 29, 34, 35, 36].forEach((x) => B.set(x, 22, 'W'));
  B.set(31, 22, 'G'); B.set(32, 22, 'G');
  B.fill(7, 29, 64, 29, '|');
  B.fill(15, 30, 15, 41, '|'); B.fill(28, 30, 28, 41, '|'); B.fill(41, 30, 41, 41, '|'); B.fill(52, 30, 52, 41, '|');
  B.fill(29, 29, 40, 29, '^');
  B.set(11, 29, 'D'); B.set(8, 29, 'W'); B.set(9, 29, 'W');
  B.set(21, 29, 'd'); B.set(22, 29, 'd'); B.set(18, 29, 'W'); B.set(25, 29, 'W');
  B.set(46, 29, 'D'); B.set(44, 29, 'W'); B.set(48, 29, 'W'); B.set(49, 29, 'W');
  B.set(58, 29, 'd'); B.set(59, 29, 'd'); B.set(55, 29, 'W'); B.set(62, 29, 'W');
  B.fill(33, 42, 37, 42, 'd');
  [12, 20, 46, 57].forEach((x) => B.set(x, 42, 'W'));
  // ---- DEPARTMENT STORE (Pratt's)
  B.fill(7, 11, 10, 11, '|'); B.fill(11, 7, 11, 11, '|'); B.set(9, 11, 'L');
  B.set(7, 7, 'θ'); B.set(8, 7, '*'); B.set(10, 8, 'η'); B.set(8, 9, '*'); B.set(10, 10, '*');
  [[14, 9], [18, 9], [22, 9], [14, 13], [18, 13], [22, 13], [9, 15], [13, 18], [21, 18], [17, 16]].forEach(([x, y]) => B.set(x, y, 'Ř'));
  B.fill(12, 7, 24, 7, 'u');
  B.set(13, 20, '£'); B.set(18, 20, '£');
  [[16, 11], [20, 15], [10, 17], [23, 19]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(12, 16, 'Z'); B.set(24, 11, 'a'); B.set(8, 20, 'p');
  B.fill(13, 8, 22, 8, 'ŧ');
  // ---- SPURLOCK'S SPORTING GOODS (sealed)
  B.fill(27, 7, 36, 7, 'u');
  B.fill(27, 13, 35, 13, 'o');
  B.set(30, 10, '4'); B.set(28, 9, 'r'); B.set(33, 11, 'r'); B.set(35, 8, 'r'); B.set(27, 11, 'V'); B.set(34, 10, 's');
  B.set(32, 15, '•'); B.set(31, 16, '&'); B.set(33, 17, '{');
  B.fill(27, 19, 28, 20, 'x'); B.set(36, 19, 'x');
  // ---- FOOD COURT + service corridor
  B.fill(40, 13, 62, 13, 'o');
  [46, 52, 58].forEach((x) => B.set(x, 13, '_'));
  [40, 44, 48, 50, 54, 56, 60].forEach((x) => B.set(x, 11, 'w'));
  [42, 47, 53, 59].forEach((x) => B.set(x, 11, 'y'));
  [[42, 16], [47, 16], [52, 16], [57, 16], [44, 19], [50, 19], [55, 19]].forEach(([x, y]) => B.fill(x, y, x + 1, y + 1, 'i'));
  B.fill(62, 14, 64, 14, '|'); B.fill(62, 15, 62, 17, '|'); B.fill(62, 18, 64, 18, '|'); B.set(62, 16, 'L');
  B.set(63, 15, 'δ'); B.set(64, 15, '*'); B.set(63, 17, 'ζ'); B.set(64, 17, '*');
  B.set(50, 15, ')');
  [[44, 15], [49, 18], [54, 15], [59, 19], [61, 21], [41, 20], [45, 12]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(60, 12, 'O');
  B.set(63, 8, 'Ŝ'); B.set(61, 7, 'x'); B.set(60, 9, 'x');
  B.set(42, 8, 'z'); B.set(55, 8, 'z'); B.set(50, 7, 'r'); B.set(57, 9, 'v');
  // ---- CONCOURSE
  [[12, 25], [24, 25], [48, 25], [60, 25]].forEach(([x, y]) => B.set(x, y, 'ψ'));
  B.fill(35, 25, 36, 26, 'ψ');
  B.fill(17, 26, 19, 26, 'π'); B.fill(53, 26, 55, 26, 'π'); B.fill(40, 24, 42, 24, 'π');
  B.set(28, 23, 'ʘ'); B.set(64, 27, 'ʘ');
  [[9, 24], [20, 27], [27, 25], [31, 27], [43, 26], [51, 23], [57, 27], [63, 24]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(38, 27, 'k'); B.set(15, 27, 'a'); B.set(46, 27, 's');
  // ---- SECURITY OFFICE
  B.set(9, 33, 'g'); B.set(12, 33, 'g'); B.set(8, 39, 'ƒ'); B.set(14, 31, 'ƒ');
  B.set(12, 38, '?'); B.set(9, 36, '[');
  B.set(10, 31, 'ṕ'); B.set(13, 40, 'ṕ');
  B.set(7, 41, 'a');
  // ---- HARDWARE STORE
  B.fill(17, 32, 17, 36, 'u'); B.fill(21, 32, 21, 36, 'u'); B.fill(25, 32, 25, 36, 'u');
  B.set(18, 34, 'm'); B.set(26, 37, 'm'); B.set(23, 40, '5'); B.set(19, 31, 'x');
  B.fill(16, 38, 19, 38, '|'); B.fill(20, 38, 20, 41, '|'); B.set(20, 40, 'L');
  B.set(16, 39, 'α'); B.set(17, 40, '*'); B.set(18, 41, 'γ'); B.set(19, 39, '*');
  B.set(23, 33, 'z'); B.set(27, 39, 'z');
  // ---- LOBBY
  B.set(34, 32, '('); B.set(30, 31, 'ψ'); B.set(39, 31, 'ψ'); B.fill(31, 37, 33, 37, 'π'); B.fill(36, 37, 38, 37, 'π');
  B.set(32, 34, 'z'); B.set(38, 39, 'z');
  // ---- TOY STORE
  B.fill(43, 32, 43, 38, 'u'); B.fill(47, 32, 50, 32, 'u'); B.fill(47, 39, 50, 39, 'u');
  B.set(47, 36, ']'); B.set(50, 35, 'p'); B.set(45, 35, 'z');
  // ---- PHARMACY
  B.fill(54, 32, 58, 32, 'u'); B.fill(54, 35, 58, 35, 'u'); B.fill(61, 31, 61, 36, 'o');
  B.set(63, 33, 'A'); B.set(55, 39, 'h'); B.set(58, 37, 'v'); B.set(63, 40, 'v');
  B.set(56, 33, 'z'); B.set(60, 38, 'z'); B.set(54, 40, 'z');
  // horde spawn points (activated by the fire alarm)
  B.fill(55, 38, 59, 38, 'ŋ');
  [[31, 46], [33, 47], [35, 45], [37, 46], [39, 47], [30, 49], [34, 50], [38, 49], [36, 51], [32, 52]].forEach(([x, y]) => B.set(x, y, 'ħ'));
  // ---- lights
  [[12, 23], [20, 23], [28, 27], [36, 23], [44, 27], [52, 23], [60, 27], [15, 14], [29, 17], [50, 17], [11, 35], [22, 35], [34, 35], [46, 35], [58, 34], [50, 8]].forEach(([x, y]) => B.set(x, y, 'l'));
  [[8, 46], [20, 46], [45, 46], [60, 46], [12, 55], [30, 55], [50, 55], [66, 55]].forEach(([x, y]) => B.set(x, y, 'ł'));
  // ---- parking lot
  [[8, 48], [14, 51], [22, 47], [26, 52], [44, 50], [50, 47], [58, 52], [64, 48]].forEach(([x, y]) => B.fill(x, y, x + 1, y + 2, 'c'));
  [[10, 45], [17, 50], [25, 45], [42, 48], [48, 53], [55, 45], [62, 51], [67, 46], [6, 54], [28, 57]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(52, 50, 'Z'); B.set(19, 54, 'O');
  B.set(12, 44, 's'); B.set(40, 55, 'a'); B.set(66, 52, 'p');
  B.set(2, 59, '@');

  HC.LEVELS.push({
    id: 'm3', num: 3, name: 'Riverside Mall', place: 'River Road — Lorne County', day: 'DAY 2', time: 13 * 60 + 40, music: 'm3', par: 480,
    outfits: 'mall', outfitMix: ['mall', 'civ', 'civ'], weather: { rain: 1, overcast: 1 }, cblockCol: '#a39a86', cblockInside: 0,
    interiors: [{ k: 'plaster', col: '#c9c2b0', pat: 0 }, { k: 'plaster', col: '#b0b8a6', pat: 3 }, { k: 'plaster', col: '#c2b6a0', pat: 1 }],
    keys: { blue: 'Maintenance Card', yellow: 'Loading Dock Card' },
    buildings: [{ at: [30, 25], flat: true, roof: 2, name: 'Riverside Mall' }],
    // place names — format documented in js/level.js (placeNames)
    labels: [
      { at: [16, 14], name: 'Pratt\'s Department Store', alias: 'Pratt\'s' }, { at: [9, 9], name: 'Stockroom' },
      { at: [31, 15], name: 'Spurlock\'s Sporting Goods', alias: 'Spurlock\'s' },
      { at: [48, 9], name: 'Maintenance Corridor', alias: 'maintenance' }, { at: [61, 9], name: 'Breaker Room', alias: 'breakers' },
      { at: [33, 25], name: 'Concourse' },
      { rect: [39, 11, 64, 21], name: 'Food Court', at: [51, 17] },
      { rect: [29, 29, 40, 41], name: 'Main Entrance', at: [34, 35] },
      { at: [10, 36], name: 'Mall Security' }, { at: [22, 35], name: 'Hardware Store' }, { at: [18, 40], name: 'Back Room' },
      { at: [46, 36], name: 'Toy Store' }, { at: [58, 36], name: 'Pharmacy' },
      // outdoors
      { rect: [38, 0, 65, 5], name: 'Loading Dock', at: [50, 3] },
      { rect: [5, 43, 70, 56], name: 'Parking Lot', at: [36, 49] },
      { rect: [0, 0, 4, 61], name: 'River Road', at: [2, 30] },
    ],
    startFace: -1.4,
    legend: {
      'ǩ': { f: 'carpet2' }, 'Ř': { prop: 'rack' }, '£': { prop: 'checkout' }, 'ψ': { prop: 'planter', group: 1 }, 'π': { prop: 'bench', group: 1 },
      'ƒ': { prop: 'filing', facing: 1 }, 'ʘ': { prop: 'vending', facing: 1 }, '€': { prop: 'dumpster', group: 1 },
      'Ŝ': { prop: 'switch', facing: 1, use: { switch: 'breaker' } },
      'G': { door: { shutter: 1 }, tag: 'gun' },
      'ħ': { mob: 'shambler', group: 'horde1' }, 'ŧ': { mob: 'sprinter', group: 'horde2' }, 'ŋ': { mob: 'shambler', group: 'horde3' },
      'ṕ': { mob: 'shambler', outfit: 'police' }, '•': { decal: 'corpse' },
      'l': { light: 1, col: [236, 240, 255], r: 6, flicker: 0.08 }, 'ł': { light: 1, col: [255, 196, 120], r: 7 },
    },
    map: B.rows(), floors: B.floorRows(),
    script: {
      start: [['radio', 'm3_start'], ['bark', 'start_m3', 3], ['objective', 'Find a way through the Riverside Mall to the loading dock.']],
      note: { 0: [['objective', 'Find the maintenance card. Mall security is off the main concourse.']], 1: [['objective', 'The breakers in maintenance open Spurlock\'s. And trip the alarm.']] },
      pickup: {
        keyblue: [['objective', 'Maintenance is behind the food court (blue door). The breaker room is at the far end.']],
        rifle: [['say', 'Frank got this far. I can get farther.']],
        keyyellow: [['radio', 'm3_army'], ['objective', 'Get out through the loading dock (yellow door, maintenance corridor).']],
      },
      switch: {
        breaker: [['open', 'gun'], ['alarm', 50], ['radio', 'm3_alarm'], ['spawn', 'horde1'], ['music', 'boss'], ['objective', 'Spurlock\'s is open. Grab the rifle and the dock card. SURVIVE.'],
          ['timer', 12, [['spawn', 'horde2']]], ['timer', 24, [['spawn', 'horde3']]], ['timer', 70, [['music', 'm3']]]],
      },
    },
  });
})();
