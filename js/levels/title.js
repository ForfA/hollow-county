// Title-screen backdrop: a rainy suburban street at night, with the dead wandering.
'use strict';
(function () {
  const B = HC.mapBuilder(40, 30, '.');
  B.fill(0, 14, 39, 14, ':'); B.fill(0, 15, 39, 15, ','); B.fill(0, 16, 39, 16, "'"); B.fill(0, 17, 39, 17, ','); B.fill(0, 18, 39, 18, ':');
  B.stamp(3, 4, [
    'HHHWHHHHWHHH',
    'H___o|~~~~~H',
    'H____|~ee~~H',
    'W____D~ee~~H',
    'H=====|||D|H',
    'H====f=====W',
    'HHWHHdHHWHHH',
  ]);
  B.stamp(19, 3, [
    'HHHHWHHHHWH',
    'H~~~~|====H',
    'H~ee~|====H',
    'H~ee~D=f==W',
    'H~~~~|=f==H',
    'H|||||====H',
    'H_____====H',
    'HHWHHHHdHHH',
  ]);
  B.stamp(6, 21, [
    'HHHHdHHHWHH',
    'H====|____H',
    'H=f==D____H',
    'H=f==|_oo_H',
    'HHWHHHHHHHH',
  ]);
  [[1, 3], [16, 5], [16, 9], [32, 4], [34, 9], [2, 22], [20, 23], [25, 21], [30, 25], [35, 22], [37, 11], [18, 27]].forEach(([x, y]) => B.set(x, y, 'T'));
  B.fill(0, 12, 2, 12, 'P'); B.fill(15, 12, 18, 12, '%'); B.fill(31, 12, 36, 12, '%');
  B.fill(9, 15, 11, 16, 'c'); B.fill(24, 16, 26, 17, 'c'); B.fill(33, 15, 35, 16, 'c');
  [[5, 14], [21, 18], [36, 18]].forEach(([x, y]) => B.set(x, y, 'l'));
  [[7, 13], [13, 17], [16, 15], [19, 14], [22, 19], [28, 15], [30, 17], [12, 20], [26, 12], [38, 16], [4, 17]].forEach(([x, y]) => B.set(x, y, 'z'));
  B.set(20, 16, '@');
  HC.TITLE_LEVEL = {
    id: 'title', name: 'Cedar Fork', time: 2 * 60 + 10, music: 'title', outfits: 'civ', weather: { rain: 1 },
    map: B.rows(), floors: B.floorRows(), legend: {}, script: {},
  };
})();
