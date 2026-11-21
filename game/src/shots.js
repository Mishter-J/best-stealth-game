// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh game for a fixed number of steps, steered by an
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. No state is staged by hand.
//
// The careful pilot plans a route on the tile grid (Dijkstra, where a tile a
// warden can see right now costs far more than an open one) and walks it,
// waiting out a cone when the next tile is watched and it is safe where it
// stands. The reckless pilot sprints straight at the nearest relic.
import { TILE } from './config.js';
import { canSeePoint } from './vision.js';
import { scriptedInput } from './input.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT } from './game.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 120;
const SAMPLE = 1 / 30;
const REPLAN_EVERY = 0.5;

function tileIsOpen(game, tx, ty) {
  if (ty < 0 || ty >= game.tiles.length || tx < 0 || tx >= game.tiles[0].length) return false;
  const tile = game.tiles[ty][tx];
  return tile !== 1 && tile !== 3;
}

function tileDanger(game, tx, ty) {
  const cx = (tx + 0.5) * TILE;
  const cy = (ty + 0.5) * TILE;
  let danger = 0;
  for (const guard of game.guards) {
    if (canSeePoint(game.tiles, guard.x, guard.y, guard.facing, cx, cy)) danger += 40;
    const d = Math.hypot(cx - guard.x, cy - guard.y);
    if (d < 64) danger += 5;
  }
  return danger;
}

/** Cheapest route (tiles) from the player's tile to a target tile, or null. */
function planRoute(game, targetTx, targetTy) {
  const startTx = Math.floor(game.player.x / TILE);
  const startTy = Math.floor(game.player.y / TILE);
  const key = (x, y) => `${x},${y}`;
  const cost = new Map([[key(startTx, startTy), 0]]);
  const cameFrom = new Map();
  const open = [[0, startTx, startTy]];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (open.length > 0) {
    open.sort((a, b) => a[0] - b[0]);
    const [c, x, y] = open.shift();
    if (c !== cost.get(key(x, y))) continue;
    if (x === targetTx && y === targetTy) {
      const path = [];
      let cur = key(x, y);
      while (cur !== key(startTx, startTy)) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift([px, py]);
        cur = cameFrom.get(cur);
      }
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!tileIsOpen(game, nx, ny)) continue;
      const nc = c + 1 + tileDanger(game, nx, ny);
      if (nc < (cost.get(key(nx, ny)) ?? Infinity)) {
        cost.set(key(nx, ny), nc);
        cameFrom.set(key(nx, ny), key(x, y));
        open.push([nc, nx, ny]);
      }
    }
  }
  return null;
}

function nearestTargetTile(game) {
  const player = game.player;
  let best = null;
  let bestDist = Infinity;
  for (const relic of game.current.relics) {
    if (relic.taken) continue;
    const d = Math.hypot(relic.x - player.tileX, relic.y - player.tileY);
    if (d < bestDist) {
      bestDist = d;
      best = [relic.x, relic.y];
    }
  }
  if (!best) best = [game.current.exit.x, game.current.exit.y];
  return best;
}

/** Stateful careful pilot: replan twice a second, walk the route, wait out cones. */
export function makeCarefulPilot() {
  let route = null;
  let replanIn = 0;
  let lastTarget = null;
  return function carefulPilot(game, dt) {
    replanIn -= dt;
    const target = nearestTargetTile(game);
    if (!route || replanIn <= 0 || target[0] !== lastTarget?.[0] || target[1] !== lastTarget?.[1]) {
      route = planRoute(game, target[0], target[1]);
      replanIn = REPLAN_EVERY;
      lastTarget = target;
    }
    if (!route || route.length === 0) return [0, 0];
    const [tx, ty] = route[0];
    const cx = (tx + 0.5) * TILE;
    const cy = (ty + 0.5) * TILE;
    const player = game.player;
    if (Math.hypot(cx - player.x, cy - player.y) < 6) {
      route.shift();
      return [0, 0];
    }
    // The next tile is watched and we are safe here: wait the cone out.
    const hereDanger = tileDanger(game, player.tileX, player.tileY);
    if (tileDanger(game, tx, ty) >= 40 && hereDanger === 0) return [0, 0];
    const dx = cx - player.x;
    const dy = cy - player.y;
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
}

/** The reckless pilot: sprint straight at the relic, cones be damned. */
export function recklessPilot(game) {
  const player = game.player;
  const target = nearestTargetTile(game);
  const dx = (target[0] + 0.5) * TILE - player.x;
  const dy = (target[1] + 0.5) * TILE - player.y;
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

/**
 * Set `game` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, game) {
  if (name !== 'play' && name !== 'end') {
    game.screen = SCREEN_TITLE;
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) game.step(SAMPLE, scriptedInput(0, 0, false, false));
    return { screen: SCREEN_TITLE };
  }
  game.startGame();
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? recklessPilot : makeCarefulPilot();
  for (let i = 0; i < limit / SAMPLE; i += 1) {
    const [mx, my] = pilot(game, SAMPLE);
    const input = name === 'end'
      ? scriptedInput(mx, my, false, true)
      : scriptedInput(mx, my, true, false);
    game.step(SAMPLE, input);
    if (game.screen !== SCREEN_PLAY) break;
  }
  return { screen: game.screen === SCREEN_CAUGHT ? SCREEN_CAUGHT : SCREEN_PLAY };
}
