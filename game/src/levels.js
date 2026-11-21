// The three levels of Velvet Shadow. Each level is built from lists of
// rectangles and points on a 30x20 tile grid, never from a picture: the
// builder below turns the lists into the tile map the game plays on.
//   walls: [x, y, w, h] solid blocks (border walls included)
//   bushes: [x, y] low cover — crouch inside and wardens cannot see you
//   crates: [x, y] tall cover — block sight and movement
//   lamps: [x, y] pools of light — you are easier to spot inside one
//   relics: [x, y] the three Starling relics, in pickup order for the HUD
//   exit: [x, y] the green door; sealed until all three relics are taken
//   player: [x, y] where Wren starts
//   guards: [{ wp: [[x, y], ...] }] patrol loops, in tile centres
import { COLS, ROWS } from './config.js';

export const TILE_WALL = 1;
export const TILE_FLOOR = 0;
export const TILE_BUSH = 2;
export const TILE_CRATE = 3;

function border() {
  return [
    [0, 0, COLS, 1],
    [0, ROWS - 1, COLS, 1],
    [0, 0, 1, ROWS],
    [COLS - 1, 0, 1, ROWS],
  ];
}

export const LEVELS = [
  {
    name: 'THE GILDED GALLERY',
    sub: 'Steal the three Starling relics, then reach the green door unseen.',
    walls: [
      ...border(),
      [8, 2, 6, 1], [19, 2, 5, 1],
      [5, 6, 4, 2], [16, 6, 4, 2], [24, 6, 3, 2],
      [5, 11, 4, 2], [16, 11, 4, 2], [24, 11, 3, 2],
      [8, 16, 6, 1], [19, 16, 5, 1],
    ],
    bushes: [[3, 1], [3, 5], [10, 8], [20, 8], [26, 3], [3, 13], [12, 15], [22, 18], [14, 5], [14, 14]],
    crates: [[13, 3], [25, 8], [2, 8], [21, 14], [12, 13], [26, 14]],
    lamps: [[14, 4], [7, 9], [22, 9], [14, 15]],
    relics: [[27, 1], [27, 18], [1, 18]],
    exit: [28, 9],
    player: [1, 1],
    guards: [
      { name: 'Bram', wp: [[4, 4], [14, 4], [14, 8], [4, 8]] },
      { name: 'Cora', wp: [[20, 4], [27, 4], [27, 9], [20, 9]] },
      { name: 'Dain', wp: [[16, 13], [25, 13], [25, 17], [16, 17]] },
    ],
  },
  {
    name: 'THE CLOCKWORK VAULT',
    sub: 'Four wardens now. The gears never sleep — the wardens barely do.',
    walls: [
      ...border(),
      [4, 3, 5, 1], [13, 3, 5, 1], [22, 3, 5, 1],
      [4, 8, 2, 4], [13, 8, 2, 4], [22, 8, 2, 4],
      [7, 14, 6, 1], [18, 14, 6, 1],
      [4, 16, 5, 1], [22, 16, 5, 1],
    ],
    bushes: [[2, 2], [11, 5], [18, 5], [27, 5], [2, 12], [10, 12], [19, 12], [27, 12], [15, 17], [15, 1]],
    crates: [[9, 3], [20, 3], [9, 16], [20, 16], [15, 9], [2, 9], [27, 9]],
    lamps: [[10, 4], [19, 4], [10, 15], [19, 15], [15, 12]],
    relics: [[28, 1], [1, 18], [28, 18]],
    exit: [15, 18],
    player: [1, 1],
    guards: [
      { name: 'Bram', wp: [[3, 5], [10, 5], [10, 7], [3, 7]] },
      { name: 'Cora', wp: [[19, 5], [26, 5], [26, 7], [19, 7]] },
      { name: 'Dain', wp: [[3, 13], [6, 13], [6, 15], [3, 15]] },
      { name: 'Wren-watch', wp: [[24, 13], [27, 13], [27, 15], [24, 15]] },
    ],
  },
  {
    name: 'THE STARLING SANCTUM',
    sub: 'Five wardens guard the last relic. Slow is smooth, smooth is unseen.',
    walls: [
      ...border(),
      [3, 2, 4, 1], [12, 2, 4, 1], [21, 2, 4, 1],
      [3, 6, 2, 3], [12, 6, 2, 3], [21, 6, 2, 3],
      [7, 10, 4, 1], [18, 10, 4, 1],
      [3, 13, 2, 3], [12, 13, 2, 3], [21, 13, 2, 3],
      [7, 17, 4, 1], [18, 17, 4, 1],
    ],
    bushes: [[1, 4], [9, 4], [18, 4], [28, 4], [1, 11], [9, 11], [18, 11], [28, 11], [14, 8], [14, 15], [5, 18], [24, 18]],
    crates: [[6, 1], [15, 1], [24, 1], [6, 17], [15, 17], [24, 17], [10, 8], [19, 8], [10, 15], [19, 15]],
    lamps: [[9, 3], [20, 3], [9, 16], [20, 16], [14, 10]],
    relics: [[28, 1], [1, 18], [28, 18]],
    exit: [14, 1],
    player: [14, 18],
    guards: [
      { name: 'Bram', wp: [[2, 3], [8, 3], [8, 5], [2, 5]] },
      { name: 'Cora', wp: [[23, 3], [27, 3], [27, 5], [23, 5]] },
      { name: 'Dain', wp: [[11, 4], [17, 4], [17, 5], [11, 5]] },
      { name: 'Ivo', wp: [[2, 12], [8, 12], [8, 16], [2, 16]] },
      { name: 'Marlowe', wp: [[23, 12], [27, 12], [27, 16], [23, 16]] },
    ],
  },
];

/** Turn a level definition into the tile map and the placed objects. */
export function buildLevel(def) {
  const tiles = [];
  for (let y = 0; y < ROWS; y += 1) tiles.push(new Array(COLS).fill(TILE_FLOOR));
  for (const [x, y, w, h] of def.walls) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) tiles[yy][xx] = TILE_WALL;
    }
  }
  for (const [x, y] of def.bushes) tiles[y][x] = TILE_BUSH;
  for (const [x, y] of def.crates) tiles[y][x] = TILE_CRATE;
  return {
    def,
    tiles,
    lamps: def.lamps.map(([x, y]) => ({ x, y })),
    relics: def.relics.map(([x, y], i) => ({ x, y, taken: false, index: i })),
    exit: { x: def.exit[0], y: def.exit[1] },
    playerStart: { x: def.player[0], y: def.player[1] },
    guardDefs: def.guards,
  };
}

/** A level is broken if anything it names sits on a wall or outside the grid. */
export function validateLevel(def) {
  const problems = [];
  const onFloor = (x, y, what) => {
    if (x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2) problems.push(`${what} outside the hall: ${x},${y}`);
  };
  const blocked = new Set();
  for (const [x, y, w, h] of def.walls) {
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) blocked.add(`${xx},${yy}`);
  }
  // Crates block movement too: a warden whose waypoint sits on one stalls forever.
  const crateSet = new Set(def.crates.map(([x, y]) => `${x},${y}`));
  const solid = (x, y) => blocked.has(`${x},${y}`) || crateSet.has(`${x},${y}`);
  for (const [x, y] of [...def.bushes, ...def.crates]) {
    if (blocked.has(`${x},${y}`)) problems.push(`cover on a wall: ${x},${y}`);
  }
  for (const [x, y] of def.relics) {
    onFloor(x, y, 'relic');
    if (blocked.has(`${x},${y}`)) problems.push(`relic on a wall: ${x},${y}`);
  }
  for (const [x, y] of def.lamps) onFloor(x, y, 'lamp');
  onFloor(def.exit[0], def.exit[1], 'exit');
  onFloor(def.player[0], def.player[1], 'player');
  def.guards.forEach((guard, gi) => {
    guard.wp.forEach(([x, y]) => {
      onFloor(x, y, `guard ${gi} waypoint`);
      if (blocked.has(`${x},${y}`)) problems.push(`guard ${gi} waypoint on a wall: ${x},${y}`);
      if (crateSet.has(`${x},${y}`)) problems.push(`guard ${gi} waypoint on a crate: ${x},${y}`);
    });
    // A patrol leg must run through open floor, or the warden walks into a wall forever.
    for (let i = 0; i < guard.wp.length; i += 1) {
      const [ax, ay] = guard.wp[i];
      const [bx, by] = guard.wp[(i + 1) % guard.wp.length];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4;
      for (let s = 0; s <= steps; s += 1) {
        const x = Math.round(ax + ((bx - ax) * s) / steps);
        const y = Math.round(ay + ((by - ay) * s) / steps);
        if (solid(x, y)) {
          problems.push(`guard ${gi} patrol leg ${ax},${ay} -> ${bx},${by} crosses a solid tile at ${x},${y}`);
          break;
        }
      }
    }
  });
  return problems;
}
