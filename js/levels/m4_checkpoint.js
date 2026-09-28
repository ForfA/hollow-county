// E1M4 — ROUTE 9 CHECKPOINT. Pre-dawn fog. Blue: inner gate (screening tent). Yellow: dropped by SSG Tully (EOD juggernaut).
// Radio tower → call Dustoff → hold out → helicopter lands at the LZ → ending.
'use strict';
(function () {
  const B = HC.mapBuilder(70, 62, '.');
  // ---- river, north bank, bridge
  B.fill(0, 0, 69, 3, '≈');
  B.fill(0, 4, 69, 5, '`');
  // ---- compound ground
  B.fill(4, 6, 65, 22, 'q');
  B.fill(4, 24, 65, 39, ';');
  B.scatter(4, 24, 65, 39, '`', 160, 41, [';']);
  B.scatter(4, 6, 65, 22, '`', 90, 42, ['q']);
  for (let y = 41; y < 62; y++) for (let x = 0; x < 70; x++) if (HC.hash2(x, y, 5) < 0.05) B.set(x, y, 'T');
  for (let y = 4; y < 41; y++) { if (y % 2) { B.set(1, y, 'T'); B.set(68, y, 'T'); } }
  // ---- Route 9 + bridge
  B.fill(31, 0, 37, 5, ','); B.fill(34, 0, 34, 5, "'");
  B.fill(30, 0, 30, 3, 'S'); B.fill(38, 0, 38, 3, 'S');
  B.fill(31, 0, 37, 0, 'S');
  B.fill(32, 6, 36, 61, ','); B.fill(34, 6, 34, 61, "'");
  // ---- perimeter + inner fence
  B.fill(3, 4, 3, 40, 'F'); B.fill(66, 4, 66, 40, 'F');
  B.fill(4, 23, 65, 23, 'F'); B.set(34, 23, 'B');
  B.fill(4, 40, 31, 40, 'F'); B.fill(37, 40, 65, 40, 'F');
  B.fill(28, 24, 31, 24, 'S'); B.fill(37, 24, 40, 24, 'S');
  B.fill(4, 22, 9, 22, 'S'); B.fill(58, 22, 65, 22, 'S');
  // ================= INNER COMPOUND
  // LZ
  B.fill(10, 10, 12, 11, 'Ɛ');
  // radio tower
  B.fill(19, 7, 23, 11, '-');
  B.rect(18, 6, 24, 12, 'C');
  B.set(21, 12, 'Y'); B.set(18, 9, 'W'); B.set(24, 9, 'W');
  B.set(20, 7, 'ʀ'); B.set(23, 7, 'ʚ'); B.set(19, 10, 'r'); B.set(23, 10, 'h'); B.set(22, 9, 'l');
  // command post
  B.fill(45, 9, 53, 15, '-');
  B.rect(44, 8, 54, 16, 'C');
  B.set(49, 16, 'd'); B.set(44, 12, 'W'); B.set(54, 12, 'W'); B.set(47, 8, 'W'); B.set(51, 8, 'W');
  B.set(46, 10, 'g'); B.set(52, 10, 'g'); B.fill(48, 12, 50, 13, 'i'); B.set(45, 14, 'ƒ');
  B.set(51, 14, '['); B.set(46, 12, ']'); B.set(53, 14, 's'); B.set(45, 11, 'r'); B.set(49, 10, 'l');
  B.set(47, 14, 'U'); B.set(52, 12, 'U');
  // supply container (secret)
  B.fill(59, 8, 62, 10, '-');
  B.rect(58, 7, 63, 11, 'M'); B.set(60, 11, 'L');
  B.set(59, 8, 'δ'); B.set(60, 9, '*'); B.set(62, 10, 'η'); B.set(61, 8, 'δ');
  // vehicles, tents, sandbags
  B.fill(38, 8, 39, 10, 'Ⱨ'); B.fill(56, 16, 57, 18, 'Ⱨ'); B.fill(26, 8, 27, 10, 'Ⱨ');
  B.fill(26, 16, 29, 18, 'Ʈ'); B.fill(39, 13, 42, 15, 'Ʈ');
  B.rect(13, 16, 17, 19, 'S'); B.set(15, 19, ';');
  B.set(14, 17, 's'); B.set(16, 18, 'a');
  B.set(58, 20, 'Ǥ'); B.set(59, 20, 'Ǥ');
  B.set(24, 20, 'x'); B.set(25, 20, 'x'); B.set(43, 20, 'x'); B.set(55, 13, 'x'); B.set(30, 13, 'x');
  [[8, 6], [16, 14], [28, 7], [42, 19], [61, 14], [31, 21], [37, 21], [6, 14]].forEach(([x, y]) => B.set(x, y, 'ǂ'));
  B.set(48, 19, 'J');
  [[40, 18], [56, 20], [26, 14], [30, 9], [57, 13], [20, 16]].forEach(([x, y]) => B.set(x, y, 'U'));
  [[12, 7], [7, 19], [44, 6], [62, 17]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.fill(33, 22, 35, 22, 'Ω');
  // ================= OUTER COMPOUND
  // screening tent 3
  B.fill(41, 28, 49, 33, '-');
  B.rect(40, 27, 50, 34, 'M');
  B.set(40, 30, 'd'); B.set(40, 31, 'd');
  B.fill(42, 28, 43, 28, 'e'); B.fill(46, 28, 47, 28, 'e'); B.fill(42, 33, 43, 33, 'e'); B.fill(46, 33, 47, 33, 'e');
  B.set(48, 30, 'g'); B.set(48, 31, '?'); B.set(47, 31, ')'); B.set(49, 28, 'ƒ'); B.set(49, 33, 'h'); B.set(45, 29, 'l');
  B.set(44, 30, 'ď'); B.set(46, 32, 'U');
  B.set(30, 37, '(');
  // tents
  B.fill(52, 25, 55, 27, 'ȶ'); B.fill(56, 30, 59, 32, 'ȶ');
  B.fill(8, 26, 11, 28, 'Ʈ'); B.fill(8, 33, 11, 35, 'Ʈ'); B.fill(16, 26, 19, 28, 'Ʈ'); B.fill(16, 33, 19, 35, 'Ʈ');
  // sandbag bunker (secret)
  B.rect(22, 31, 26, 35, 'S'); B.set(24, 31, 'L');
  B.set(23, 32, 'θ'); B.set(25, 34, 'α'); B.set(24, 33, '*');
  // latrine block (secret)
  B.fill(59, 35, 62, 37, '-');
  B.rect(58, 34, 63, 38, 'M'); B.set(58, 36, 'L');
  B.set(59, 35, 'ζ'); B.set(61, 36, '*'); B.set(62, 37, 'η');
  // outer vehicles & kit
  B.fill(26, 25, 27, 27, 'Ⱨ'); B.set(12, 30, 'Ǥ'); B.set(13, 30, 'Ǥ');
  B.set(29, 33, 'x'); B.set(38, 37, 'x'); B.set(54, 35, 'x'); B.set(14, 38, 'x');
  [[21, 25], [6, 30], [38, 28], [52, 37], [30, 39], [62, 29]].forEach(([x, y]) => B.set(x, y, 'ǂ'));
  [[28, 30], [38, 35], [52, 29], [20, 37]].forEach(([x, y]) => B.set(x, y, 'U'));
  [[14, 31], [18, 24], [36, 27], [44, 37], [56, 36], [62, 26], [10, 38], [30, 26], [6, 25]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(48, 38, 'Z'); B.set(24, 27, 'O');
  B.set(29, 28, 'r'); B.set(54, 38, 'r'); B.set(12, 37, 's'); B.set(38, 31, 'a'); B.set(20, 30, 'v'); B.set(61, 24, 'p');
  // ================= SOUTH APPROACH (the evacuation line)
  [[30, 43], [37, 46], [32, 50], [35, 55], [29, 52], [38, 51]].forEach(([x, y]) => B.fill(x, y, x + 1, y + 2, 'c'));
  B.fill(27, 44, 28, 46, 'G'); B.fill(39, 57, 40, 59, 'G');
  [[29, 48], [39, 49], [33, 47], [36, 53], [31, 57], [38, 43], [26, 50], [42, 54]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(34, 49, 'k'); B.set(40, 55, 'Z');
  [[33, 45], [36, 49], [31, 55], [35, 59]].forEach(([x, y]) => B.set(x, y, '•'));
  B.set(35, 58, 'a'); B.set(28, 55, 's'); B.set(39, 44, 'h');
  B.fill(31, 41, 37, 41, '/'); B.set(34, 41, ','); B.set(33, 41, ',');
  // wave spawn points
  B.fill(32, 42, 36, 42, 'ϑ');
  B.fill(61, 19, 64, 20, 'ϖ');
  B.fill(5, 18, 8, 19, 'ϰ');
  B.fill(32, 4, 36, 5, 'ϱ');
  B.fill(35, 44, 36, 44, 'Ψ');
  B.set(34, 60, '@');

  HC.LEVELS.push({
    id: 'm4', num: 4, name: 'Route 9 Checkpoint', place: 'Harrow River Crossing', day: 'DAY 3', time: 4 * 60 + 30, music: 'm4', par: 540,
    outfits: 'soldier', outfitMix: ['civ', 'civ', 'soldier', 'hazmat'], weather: { fog: 1 }, metalCol: '#5e6446', cblockCol: '#9a9888',
    interiors: [{ k: 'plaster', col: '#b8b8a8', pat: 0 }], flatRoofs: true,
    keys: { blue: 'Inner Gate Key', yellow: 'Command Keycard' },
    helipad: { x: 11, y: 10.5 },
    // place names — format documented in js/level.js (placeNames)
    labels: [
      { at: [21, 9], name: 'Radio Tower' }, { at: [48, 11], name: 'Command Post' }, { at: [45, 30], name: 'Screening Tent', alias: 'Tent 3' },
      { at: [60, 9], name: 'Supply Container' }, { at: [60, 36], name: 'Latrines' },
      // outdoors
      { rect: [0, 0, 69, 3], name: 'Harrow River', at: [16, 2] },
      { rect: [30, 0, 38, 5], name: 'Route 9 Bridge', at: [34, 3], alias: 'bridge' },
      { rect: [4, 4, 65, 22], name: 'Inner Compound', at: [52, 20] },
      { rect: [8, 8, 14, 13], name: 'Tower LZ', at: [11, 12], alias: ['LZ', 'helipad'] },
      { rect: [13, 16, 17, 19], name: 'Sandbag Nest', at: [15, 17] },
      { rect: [31, 22, 37, 24], name: 'Inner Gate', at: [34, 22] },
      { rect: [32, 6, 36, 39], name: 'Route 9', at: [34, 15] },
      { rect: [4, 24, 65, 39], name: 'Outer Compound', at: [26, 38] },
      { rect: [7, 25, 20, 36], name: 'Tent Lines', at: [14, 31] },
      { rect: [51, 24, 60, 33], name: 'Aid Tents', at: [56, 28] },
      { rect: [31, 40, 37, 41], name: 'South Gate', at: [34, 41] },
      { rect: [26, 42, 42, 61], name: 'Evacuation Line', at: [34, 52] },
    ],
    startFace: -2.35,
    legend: {
      '≈': { f: 'water' }, 'Ⱨ': { prop: 'humvee', group: 1 }, 'Ʈ': { prop: 'tent', group: 1 }, 'ȶ': { prop: 'tent', group: 1, cross: 1, col: '#6a6e52' },
      'Ǥ': { prop: 'generator', group: 1 }, 'ǂ': { light: 1, col: [232, 240, 255], r: 9 }, 'ƒ': { prop: 'filing', facing: 1 },
      'ʀ': { prop: 'radio', facing: 1, use: { switch: 'call' } }, 'ʚ': { prop: 'switch', facing: 1, use: { switch: 'panel' } },
      'Ɛ': { exit: 1, locked: 1, f: 'yard' }, 'J': { mob: 'juggernaut', drop: 'keyyellow' }, 'G': { prop: 'wreck', group: 1 },
      '/': { prop: 'sawhorse' }, 'ď': { mob: 'shambler', outfit: 'doctor' }, '•': { decal: 'corpse' },
      'ϑ': { mob: 'shambler', group: 'w1' }, 'ϖ': { mob: 'shambler', group: 'w2' }, 'ϰ': { mob: 'shambler', group: 'w3' },
      'ϱ': { mob: 'shambler', group: 'w4' }, 'Ψ': { mob: 'sprinter', group: 'w5' },
      'Ω': { f: 'asphalt', trig: 'inner' }, 'l': { light: 1, col: [255, 226, 180], r: 5 },
    },
    map: B.rows(), floors: B.floorRows(),
    script: {
      start: [['radio', 'm4_start'], ['bark', 'start_m4', 3], ['objective', 'Get through the checkpoint to the radio tower.']],
      note: { 1: [['objective', 'The inner gate key should be in the screening tent.']] },
      pickup: {
        keyblue: [['objective', 'Open the inner gate (blue).']],
        keyyellow: [['objective', 'Radio tower (yellow door). Call Dustoff on 34.90.'], ['music', 'm4']],
      },
      trig: {
        inner: [['music', 'boss'], ['say', 'Tully...? Oh, Tully.'], ['objective', 'SSG Tully has the command keycard. Take it.']],
      },
      switch: {
        call: [['radio', 'm4_tower'], ['objective', 'Hold out until Dustoff lands at the LZ!'], ['holdout', 90], ['music', 'boss'],
          ['spawn', 'w1'], ['timer', 18, [['spawn', 'w2']]], ['timer', 36, [['spawn', 'w3']]], ['timer', 52, [['spawn', 'w4'], ['say', 'They\'re coming across the BRIDGE!']]],
          ['timer', 68, [['spawn', 'w5'], ['spawn', 'w1']]], ['timer', 90, [['heli']]]],
        panel: [['say', 'Not yet. Not until the bird is up.']],
      },
    },
  });
})();
