// E1M2 — ST. AGNES MEMORIAL. Night. Blue: pharmacy key (Ward B). Red: dock keycard (security office).
'use strict';
(function () {
  const B = HC.mapBuilder(64, 52, '.');
  // ---- surroundings
  for (let x = 6; x < 64; x += 2) B.set(x, 0, 'T');
  for (let y = 1; y < 52; y += 2) { B.set(63, y, 'T'); }
  B.fill(0, 0, 4, 51, ','); B.fill(2, 0, 2, 51, "'");
  B.fill(5, 39, 58, 39, ':');
  B.fill(5, 40, 57, 50, ',');
  B.fill(8, 42, 55, 42, '"'); B.fill(8, 47, 55, 47, '"');
  B.fill(5, 51, 62, 51, 'P');
  // ---- building floors
  B.fill(7, 5, 56, 37, '+');
  B.fill(46, 5, 56, 17, '~');
  B.fill(31, 5, 44, 8, '~');
  B.fill(31, 14, 44, 17, '_');
  B.fill(19, 23, 33, 37, '^');
  B.fill(47, 23, 56, 37, '-');
  // ---- structure
  B.rect(6, 4, 57, 38, '#');
  B.fill(7, 18, 56, 18, 'N'); B.fill(7, 22, 56, 22, 'N');
  B.fill(22, 5, 22, 17, 'N'); B.fill(30, 5, 30, 17, 'N'); B.fill(45, 5, 45, 17, 'N');
  B.fill(18, 23, 18, 37, 'N'); B.fill(34, 23, 34, 37, 'N'); B.fill(46, 23, 46, 37, 'N');
  B.fill(24, 22, 28, 22, '+');
  // exterior windows
  [10, 14, 20, 36, 42, 50, 54].forEach((x) => B.set(x, 4, 'W'));
  [9, 13, 38, 42].forEach((x) => B.set(x, 38, 'W'));
  [8, 14, 28, 33].forEach((y) => B.set(6, y, 'W'));
  // ---- WARD A (north-west)
  B.fill(7, 11, 21, 11, 'N'); B.fill(11, 5, 11, 10, 'N'); B.fill(16, 5, 16, 10, 'N');
  B.set(9, 11, 'd'); B.set(14, 11, 'D'); B.set(19, 11, 'd');
  B.set(14, 18, 'D');
  B.fill(8, 6, 8, 7, 'Ħ'); B.fill(13, 6, 13, 7, 'Ħ'); B.fill(18, 6, 18, 7, 'Ħ'); B.fill(20, 6, 20, 7, 'Ħ');
  B.fill(7, 14, 8, 14, 'N'); B.fill(9, 14, 9, 17, 'N'); B.set(9, 16, 'L');
  B.set(7, 15, 'ι'); B.set(8, 15, '*'); B.set(7, 16, 'α'); B.set(8, 16, 'v'); B.set(7, 17, '*'); B.set(8, 17, 'ζ');
  B.set(12, 16, '{');
  B.set(21, 13, 'ǵ'); B.set(17, 17, 'ṽ');
  [[10, 8], [14, 9], [19, 8], [12, 14], [18, 15]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(9, 6, 'p'); B.set(15, 13, 'a');
  // ---- PHARMACY
  B.set(26, 18, 'B'); B.set(30, 10, 'D');
  B.fill(24, 6, 28, 6, 'u'); B.fill(24, 9, 27, 9, 'u'); B.fill(24, 12, 27, 12, 'u');
  B.fill(23, 15, 26, 15, 'o');
  B.set(29, 7, 'A'); B.set(28, 13, 'A'); B.set(25, 10, 'p'); B.set(28, 16, 'v'); B.set(24, 14, 'h'); B.set(29, 16, 'a');
  B.set(26, 14, 'z'); B.set(28, 8, 'z');
  // ---- ADMIN
  B.fill(31, 9, 44, 9, 'N'); B.fill(38, 5, 38, 8, 'N');
  B.set(34, 9, 'D'); B.set(41, 9, 'D');
  B.fill(31, 13, 44, 13, 'N'); B.set(37, 13, 'D');
  B.fill(31, 10, 31, 12, 'Λ');
  B.set(32, 5, 'b'); B.set(34, 6, 'g'); B.set(36, 6, 'g'); B.set(37, 5, 'ƒ'); B.set(33, 8, 'p');
  B.set(40, 6, 'g'); B.set(42, 6, 'g'); B.set(44, 5, 'ƒ'); B.set(43, 7, '!'); B.set(40, 8, '['); B.set(39, 5, 'a');
  B.set(31, 14, 'ṽ'); B.fill(35, 15, 36, 15, 'i'); B.fill(40, 15, 41, 15, 'i'); B.set(43, 16, 'p');
  B.set(40, 11, 'z'); B.set(33, 16, 'z');
  B.set(45, 11, 'D');
  // ---- CHAPEL (holds the dead)
  B.fill(49, 5, 52, 5, 'i');
  [7, 9, 11, 13, 15].forEach((y) => { B.fill(47, y, 50, y, 'π'); B.fill(53, y, 56, y, 'π'); });
  [[47, 8], [52, 8], [55, 10], [49, 10], [52, 12], [47, 14], [54, 14], [51, 16], [52, 6]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(46, 6, 'ł'); B.set(56, 6, 'ł');
  B.set(51, 18, 'X');
  // ---- ER BAYS (south-west)
  B.set(12, 22, 'D'); B.set(18, 30, 'D');
  B.fill(8, 24, 8, 25, 'Ħ'); B.fill(8, 27, 8, 28, 'Ħ'); B.fill(8, 30, 8, 31, 'Ħ');
  B.fill(16, 24, 16, 25, 'Ħ'); B.fill(16, 27, 16, 28, 'Ħ');
  B.set(13, 33, 'ǵ'); B.set(17, 31, 'ƒ'); B.set(12, 36, 'g');
  B.set(13, 35, ')');
  B.fill(7, 33, 9, 33, 'N'); B.fill(10, 33, 10, 37, 'N'); B.set(10, 35, 'L');
  B.set(7, 34, 'θ'); B.set(8, 34, '*'); B.set(9, 34, 'γ'); B.set(7, 36, '*'); B.set(8, 36, 'β'); B.set(9, 37, '*');
  [[11, 26], [13, 29], [14, 25]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(10, 31, 'k'); B.set(16, 33, 's'); B.set(12, 24, 'v');
  // ---- LOBBY
  B.fill(21, 27, 25, 27, 'o'); B.fill(27, 27, 31, 27, 'o');
  B.set(26, 26, '(');
  B.fill(20, 31, 23, 31, 'π'); B.fill(20, 34, 23, 34, 'π'); B.fill(29, 31, 32, 31, 'π'); B.fill(29, 34, 32, 34, 'π');
  B.set(19, 23, 'ψ'); B.set(33, 23, 'ψ'); B.set(33, 29, 'ṽ'); B.set(19, 37, 'ψ'); B.set(33, 37, 'ψ');
  B.fill(24, 38, 28, 38, 'd');
  [[24, 30], [28, 33], [31, 36], [21, 36], [26, 24]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(26, 35, 'a'); B.set(32, 24, 'p');
  // ---- WARD B (bite ward)
  B.set(40, 22, 'D');
  [24, 27, 30, 33].forEach((y) => { B.fill(36, y, 36, y + 1, 'Ħ'); B.fill(44, y, 44, y + 1, 'Ħ'); B.set(37, y + 1, 'ʐ'); B.set(43, y, 'ʐ'); });
  B.set(40, 34, '?'); B.set(41, 35, '•');
  B.set(39, 27, 'z'); B.set(42, 31, 'z'); B.set(44, 36, 'v'); B.set(35, 36, 'p');
  // ---- MORGUE
  B.set(51, 22, 'R');
  B.fill(47, 26, 47, 31, 'Ƀ'); B.fill(49, 37, 54, 37, 'Ƀ');
  B.set(50, 28, 'ǵ'); B.set(53, 30, 'ǵ'); B.set(53, 25, 'ǵ');
  [[48, 27], [48, 29], [48, 31], [50, 36], [53, 36], [52, 34]].forEach(([x, y]) => B.set(x, y, 'ɀ'));
  B.fill(50, 23, 52, 24, 'Θ');
  B.set(55, 25, ']'); B.set(55, 27, 's'); B.set(55, 35, 'h');
  B.set(57, 33, 'D');
  // ---- LOADING DOCK (east yard)
  B.fill(58, 24, 62, 40, 'q');
  B.fill(58, 23, 62, 23, 'F'); B.fill(58, 41, 62, 41, 'F');
  B.fill(59, 36, 60, 38, 'c');
  B.fill(58, 31, 58, 35, 'Ξ');
  B.fill(62, 29, 62, 35, 'E');
  B.set(60, 27, 'z'); B.set(61, 39, 'z'); B.set(60, 25, 'l');
  // ---- LOT
  B.fill(34, 43, 38, 45, 'ℏ');
  B.set(33, 44, '♨'); B.set(39, 43, '♨'); B.set(36, 46, '♨');
  B.fill(10, 43, 12, 44, 'K'); B.fill(44, 43, 46, 44, 'K');
  B.fill(18, 44, 19, 46, 'c'); B.fill(25, 40, 26, 42, 'c'); B.fill(50, 44, 51, 46, 'c'); B.fill(28, 48, 30, 49, 'c');
  [[8, 40], [22, 40], [40, 40], [54, 40], [5, 46]].forEach(([x, y]) => B.set(x, y, 'l'));
  [[15, 41], [20, 44], [31, 42], [40, 46], [46, 48], [52, 42], [56, 47], [12, 48], [23, 47]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(37, 49, 'Z'); B.set(24, 49, 'O');
  B.set(7, 47, 'a'); B.set(31, 50, 's'); B.set(48, 44, 'p');
  // ---- interior lights (flickering fluorescents, emergency reds)
  [[10, 20], [20, 20], [30, 20], [40, 20], [50, 20], [26, 30], [22, 25], [30, 25], [12, 28], [40, 29], [26, 11], [37, 11], [14, 14], [34, 16], [41, 16]].forEach(([x, y]) => B.set(x, y, 'l'));
  [[35, 7], [42, 7], [51, 30], [40, 25], [14, 7]].forEach(([x, y]) => B.set(x, y, 'ʟ'));
  B.set(3, 49, '@');

  HC.LEVELS.push({
    id: 'm2', num: 2, name: 'St. Agnes Memorial', place: 'Route 9 — Lorne County', day: 'DAY 1', time: 23 * 60 + 10, music: 'm2', par: 420,
    outfits: 'doctor', outfitMix: ['doctor', 'patient', 'civ', 'patient'], interiors: [{ k: 'hosp' }], flashlightHint: true, startFace: -1.2,
    keys: { blue: 'Pharmacy Key', red: 'Dock Keycard' },
    buildings: [{ at: [26, 30], flat: true, roof: 4, name: 'St. Agnes Memorial' }],
    // place names — format documented in js/level.js (placeNames)
    labels: [
      // Ward A (north-west)
      { at: [9, 9], name: 'Room A1' }, { at: [14, 10], name: 'Room A2' }, { at: [19, 10], name: 'Room A3' },
      { at: [15, 15], name: 'Ward A' }, { at: [8, 16], name: 'Linen Closet' },
      { at: [26, 11], name: 'Pharmacy' },
      // admin block
      { at: [35, 8], name: 'Admin Office' }, { at: [42, 8], name: 'Security Office' },
      { at: [37, 11], name: 'Admin Hall', alias: 'admin' }, { at: [38, 16], name: 'Staff Lounge' },
      { at: [51, 12], name: 'Chapel' },
      // ground floor south
      { at: [26, 30], name: 'Lobby' }, { rect: [7, 19, 56, 22], name: 'Main Corridor', at: [38, 20] },
      { at: [12, 30], name: 'ER', alias: 'ER bays' }, { at: [8, 35], name: 'Supply Closet' },
      { at: [40, 30], name: 'Ward B' }, { at: [51, 32], name: 'Morgue' },
      // outdoors
      { rect: [58, 23, 62, 41], name: 'Loading Dock', at: [60, 30] },
      { rect: [5, 39, 62, 50], name: 'North Lot', at: [30, 46] },
      { rect: [0, 0, 4, 51], name: 'Route 9', at: [2, 30] },
      { rect: [5, 0, 63, 3], name: 'Hospital Grounds', at: [30, 2] },
    ],
    legend: {
      'Ħ': { prop: 'hbed', group: 1 }, 'π': { prop: 'bench', group: 1 }, 'Ƀ': { prop: 'morgue', group: 1, facing: 1 }, 'ǵ': { prop: 'gurney' },
      'ṽ': { prop: 'vending', facing: 1 }, 'ψ': { prop: 'planter' }, 'ƒ': { prop: 'filing', facing: 1 }, 'ℏ': { prop: 'heli', group: 1 },
      'K': { prop: 'ambulance', group: 1 }, '•': { decal: 'corpse' },
      '♨': { fx: 'fire' },
      'ʐ': { mob: 'shambler', group: 'wardb' }, 'ɀ': { mob: 'shambler', group: 'drawers' },
      'Θ': { f: 'slab', trig: 'morgue' }, 'Λ': { f: 'tile', trig: 'admin' }, 'Ξ': { f: 'yard', trig: 'dock' },
      'l': { light: 1, col: [214, 232, 255], r: 5, flicker: 0.25 }, 'ʟ': { light: 1, col: [255, 50, 36], r: 3.5, ceiling: 1 },
      'ł': { light: 1, col: [255, 170, 80], r: 3, flicker: 0.4, ceiling: 1 },
    },
    map: B.rows(), floors: B.floorRows(),
    script: {
      start: [['radio', 'm2_start'], ['bark', 'start_m2', 3], ['objective', 'Get through St. Agnes. Look for a way out past the building.'], ['hint', 'It\'s dark. Press F for your flashlight.']],
      note: { 1: [['objective', 'Get the pharmacy key from Nurse Okafor — Ward B.']], 2: [['objective', 'Take the dock keycard. The loading dock is past the morgue (red door).']] },
      pickup: {
        keyblue: [['spawn', 'wardb'], ['say', 'They\'re getting up. They\'re ALL getting up.'], ['objective', 'Unlock the pharmacy (blue door).']],
        antiviral: [['radio', 'm2_pharmacy'], ['hint', 'MX-7 antiviral: press V to inject when you\'re infected.']],
        keyred: [['noise', 51, 11, 26], ['say', 'Something\'s pounding on the chapel door.'], ['objective', 'Get to the loading dock through the morgue (red door).']],
      },
      trig: {
        admin: [['objective', 'Find the dock keycard in the security office.']],
        morgue: [['spawn', 'drawers'], ['say', 'The drawers. They\'re opening the drawers.']],
        dock: [['radio', 'm2_dock']],
      },
    },
  });
})();
