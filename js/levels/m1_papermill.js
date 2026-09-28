// E1M1 — PAPER MILL ROAD. Cedar Fork suburbs at dusk. Blue: garage key. Yellow: gas station keys.
'use strict';
(function () {
  const B = HC.mapBuilder(60, 48, '.');
  // ---- boundaries
  for (let x = 0; x < 60; x++) if (x % 3 !== 1) B.set(x, 0, 'T');
  B.fill(1, 1, 58, 1, 'P');
  for (let y = 1; y < 44; y++) { if (y >= 19 && y <= 25) continue; if (y % 4 !== 2) B.set(0, y, 'T'); if (y % 4 !== 0) B.set(59, y, 'T'); }
  // ---- Paper Mill Road
  B.fill(0, 20, 59, 20, ':'); B.fill(0, 21, 59, 21, ','); B.fill(0, 22, 59, 22, "'"); B.fill(0, 23, 59, 23, ','); B.fill(0, 24, 59, 24, ':');
  // ---- backyard corridor (north)
  B.fill(2, 4, 57, 5, ';');
  B.fill(0, 8, 41, 8, 'P');
  B.fill(41, 8, 41, 19, 'F');
  B.fill(42, 8, 43, 19, '`');
  B.fill(20, 6, 24, 7, 'Γ');
  B.set(42, 12, 'Δ'); B.set(43, 12, 'Δ');
  B.set(10, 3, 'x'); B.set(11, 3, 'x'); B.set(16, 6, 't'); B.set(30, 3, 'T'); B.set(47, 6, 'T'); B.set(38, 3, 'T'); B.set(26, 5, 't');
  // ---- House A (Pruitt house) + garage
  B.stamp(3, 8, [
    'HHHWHHHHHHWHHHHH',
    'Hwooyo_|b~~~|66H',
    'W__ii__|~ee~|6~H',
    'H__ii)_|~ee~|D|H',
    'H______|~ee~~~?H',
    'H|D||||||||||D|H',
    'Wb=============H',
    'Hf===0=========B',
    'Hf======z======H',
    'HHWHHdHHWHHHHHHH',
  ]);
  B.stamp(18, 8, [
    ' HHHDHHH',
    ' -3s---H',
    ' -x---xH',
    ' -----xH',
    ' ------W',
    ' -cc---H',
    ' -cc---H',
    ' -cc--sH',
    ' ------H',
    ' MMMMMMH',
  ]);
  B.fill(19, 18, 24, 19, ':');
  B.fill(3, 19, 6, 19, '%'); B.fill(10, 19, 17, 19, '%');
  // ---- House C (boarded up)
  B.stamp(28, 8, [
    'HHHWHHHWHHH',
    'Hee~~|wyooH',
    'Hee~~|____H',
    'Hee~z|__i_H',
    'H~~~~|____H',
    'H|||D||D||H',
    'Hα|=======H',
    'HβL===f===H',
    'Hζ|===f==zH',
    'HHHWHXHWHHH',
  ]);
  B.set(33, 18, ':'); B.set(33, 19, ':');
  // ---- corridor tool shed (secret)
  B.stamp(54, 3, ['HHHH', 'Hδ*H', 'H*vH', 'HLHH']);
  B.under(55, 4, 56, 5, '-');
  // ---- Laundromat
  B.stamp(44, 9, [
    '##############',
    '#ωωωωω__ωωωωω#',
    '#____________#',
    '#__z_____i__p#',
    '#____________#',
    '#oooo___z____#',
    '#_a__________#',
    '###W##d##W####',
  ]);
  B.fill(44, 17, 57, 19, '"');
  // ---- South side: House B, shed, House E, vacant lot
  B.stamp(3, 26, [
    'HHWDHHHHHWHHH',
    'H=f==|wooy__H',
    'H=f==D______H',
    'H0===|__ii__H',
    'H==z=|__ii_vH',
    'H||D||||D|||H',
    'Hee~~~|++++pH',
    'Hee~~j|+++++H',
    'Hee~z~|+++z+H',
    'H~~~~~|+++++H',
    'HHHWHHHHDHHHH',
  ]);
  B.set(6, 25, ':');
  B.fill(17, 26, 17, 42, 'P');
  B.stamp(4, 39, ['HHLHH', 'Hγ*δH', 'H*]εH', 'HHHHH']);
  B.under(5, 40, 7, 41, '-');
  B.set(2, 38, 'T'); B.set(14, 40, 'T'); B.set(12, 38, 't');
  B.stamp(21, 28, [
    'HHHDHHHWHHH',
    'H===|_wyooH',
    'H=z=|_____H',
    'H===D___z_H',
    'H===|_____H',
    'H|D||||D||H',
    'H~~h|~~~~aH',
    'Hz~~|~~~~~H',
    'HHHWHHHHWHH',
  ]);
  B.fill(24, 25, 24, 27, ':');
  [[19, 26], [34, 27], [36, 33], [19, 38], [26, 40], [33, 41], [37, 39], [20, 33], [30, 38]].forEach(([x, y]) => B.set(x, y, 'T'));
  B.fill(33, 36, 35, 37, 'c');
  B.set(35, 30, 'k');
  // ---- barricade
  B.fill(39, 25, 39, 42, 'P');
  B.fill(39, 20, 41, 20, '/'); B.fill(39, 24, 41, 24, '/');
  B.fill(39, 21, 40, 23, 'Q');
  B.fill(41, 21, 41, 23, 'x');
  // ---- Gas station
  B.fill(40, 25, 58, 42, ',');
  B.fill(45, 26, 55, 28, ':');
  B.set(46, 27, '$'); B.set(50, 27, '$'); B.set(54, 27, '$');
  B.stamp(44, 30, [
    '####WW##d##WW#',
    '#uuuuu___££__#',
    '#___________z#',
    '#_uuuuu_uuuu_#',
    '#_z_____a___z#',
    '#_uuuuu_uuu__#',
    '#_______|||D|#',
    '#__z____|g&__#',
    '#_______|[_z_#',
    '###D##########',
  ]);
  B.fill(41, 40, 42, 41, '€');
  B.set(56, 41, 'x'); B.set(57, 41, 'x'); B.set(57, 40, 'x');
  B.fill(0, 43, 39, 43, 'P');
  B.fill(40, 43, 58, 43, 'F');
  B.set(52, 43, 'Y');
  // ---- underpass
  B.fill(0, 44, 59, 47, '.');
  for (let x = 0; x < 60; x += 2) B.set(x, 44 + (x % 3), 'T');
  B.fill(49, 44, 49, 47, 'C'); B.fill(55, 44, 55, 47, 'C');
  B.fill(50, 44, 54, 46, ',');
  B.fill(50, 47, 54, 47, 'E');
  // ---- vehicles & street furniture
  B.fill(1, 22, 3, 23, 'K');
  B.set(5, 21, '(');
  B.fill(13, 21, 15, 22, 'c');
  B.fill(27, 22, 29, 23, 'c');
  B.fill(47, 21, 49, 22, 'G');
  [[10, 20], [26, 20], [47, 20], [18, 24], [34, 24], [56, 24], [41, 26], [57, 29]].forEach(([x, y]) => B.set(x, y, 'l'));
  // ---- zombies
  [[15, 18], [20, 22], [24, 23], [32, 21], [36, 22], [37, 19], [43, 21], [45, 23], [50, 22], [53, 21], [56, 23], [44, 18],
    [12, 5], [27, 3], [36, 6], [50, 4], [47, 18], [54, 18], [43, 27], [48, 29], [56, 28], [41, 35], [52, 41], [8, 38]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(45, 41, 'Z'); B.set(30, 21, 'k'); B.set(52, 25, 'O');
  B.set(42, 9, '7'); B.set(43, 9, '7'); B.set(43, 10, '7');
  B.set(44, 29, '8'); B.set(56, 29, '8'); B.set(49, 25, '8');
  // ---- items
  [[9, 3], [22, 21], [51, 23], [2, 27]].forEach(([x, y]) => B.set(x, y, 'a'));
  B.set(33, 4, 'v'); B.set(42, 33, 's'); B.set(58, 36, 'h'); B.set(7, 21, 'p'); B.set(27, 19, 'p');
  B.set(4, 22, '@');

  HC.LEVELS.push({
    id: 'm1', num: 1, name: 'Paper Mill Road', place: 'Cedar Fork — Lorne County', day: 'DAY 1', time: 17 * 60 + 40, music: 'm1', par: 330,
    outfits: 'civ', brickCol: '#8a4a3a', startFace: -0.6,
    keys: { blue: 'Garage Key', yellow: 'Station Keys' },
    // place names — format documented in js/level.js (placeNames)
    buildings: [{ at: [6, 10], name: 'Pruitt House' }, { at: [30, 10], name: 'Boarded-Up House' }, { at: [5, 28], name: 'Maddox House' }, { at: [23, 30], name: 'Kessler House' }],
    labels: [
      // Pruitt House + garage
      { at: [5, 11], name: 'Kitchen' }, { at: [14, 12], name: 'Pruitts\' Bedroom' }, { at: [16, 9], name: 'Closet' },
      { at: [10, 15], name: 'Living Room' }, { at: [21, 12], name: 'Garage' },
      // boarded-up house (stash behind the living-room panel)
      { at: [30, 12], name: 'Bedroom' }, { at: [35, 10], name: 'Kitchen' }, { at: [32, 15], name: 'Living Room' }, { at: [29, 15], name: 'Hidden Closet' },
      { at: [50, 12], name: 'Laundromat' },
      // south side houses
      { at: [6, 28], name: 'Living Room' }, { at: [11, 28], name: 'Kitchen' }, { at: [6, 33], name: 'Bedroom' }, { at: [12, 33], name: 'Bathroom' },
      { at: [23, 30], name: 'Living Room' }, { at: [28, 30], name: 'Kitchen' }, { at: [23, 34], name: 'Study' }, { at: [28, 34], name: 'Bedroom' },
      // stashes
      { at: [56, 5], name: 'Tool Shed' }, { at: [5, 41], name: 'Garden Shed' },
      // gas station
      { at: [50, 34], name: 'Station Store' }, { at: [54, 37], name: 'Station Office' },
      // outdoors
      { rect: [0, 2, 58, 7], name: 'Backyards', at: [30, 5] },
      { rect: [0, 17, 40, 19], name: 'Front Yards', at: [27, 18] },
      { rect: [0, 20, 59, 24], name: 'Paper Mill Road', at: [20, 22] },
      { rect: [38, 20, 42, 24], name: 'Police Barricade', at: [40, 22] },
      { rect: [42, 8, 43, 19], name: 'Back Alley', at: [42, 13] },
      { rect: [44, 17, 58, 19], name: 'Laundromat Lot', at: [51, 18] },
      { rect: [0, 25, 38, 42], name: 'South Yards', at: [18, 37] },
      { rect: [32, 34, 38, 42], name: 'Vacant Lot', at: [35, 39] },
      { rect: [40, 25, 58, 42], name: 'Gas Station', at: [50, 26] },
      { rect: [50, 41, 54, 43], name: 'Back Gate', at: [52, 42] },
      { rect: [49, 44, 55, 47], name: 'Underpass', at: [52, 45] },
    ],
    legend: {
      'K': { prop: 'ambulance', group: 1 }, 'Q': { prop: 'police', group: 1 }, 'G': { prop: 'wreck', group: 1 },
      '/': { prop: 'sawhorse' }, '0': { prop: 'tv', facing: 1 }, 'ω': { prop: 'washer', facing: 1 }, '$': { prop: 'pumps' },
      '£': { prop: 'checkout' }, '€': { prop: 'dumpster', group: 1 },
      '6': { mob: 'shambler', group: 'closet' }, '7': { mob: 'shambler', group: 'alley' }, '8': { mob: 'shambler', group: 'lot' },
      'Γ': { f: 'dirt', trig: 'corridor' }, 'Δ': { f: 'gravel', trig: 'east' },
    },
    map: B.rows(), floors: B.floorRows(),
    script: {
      start: [['radio', 'm1_start'], ['bark', 'start_m1', 4], ['objective', 'Get out of Cedar Fork. The road east is barricaded.']],
      note: { 1: [['objective', 'Find the garage key in the Pruitts\' bedroom.']], 2: [['say', 'The underpass. That\'s my way out.']] },
      pickup: {
        keyblue: [['spawn', 'closet'], ['say', 'Something\'s moving in that closet...'], ['objective', 'Get the shotgun from the garage (blue door).']],
        shotgun: [['radio', 'm1_dispatch'], ['objective', 'Find a way around the police barricade.']],
        keyyellow: [['spawn', 'lot'], ['objective', 'Take the underpass out of town. Back gate, behind the station.']],
      },
      trig: {
        corridor: [['say', 'Backyards. Stay quiet.']],
        east: [['spawn', 'alley'], ['radio', 'm1_gas'], ['objective', 'Find the key to the gas station\'s back gate.']],
      },
    },
  });
})();
