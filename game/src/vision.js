// Sight lines and vision cones: the geometry every stealth decision hangs on.
// Walls and crates block sight; bushes and lamps do not. All of it is pure
// functions over the tile map, so the game, the autopilot and the tests share it.
import { TILE_WALL, TILE_CRATE } from './levels.js';
import { TILE, GUARD_HALF_ANGLE, GUARD_RANGE } from './config.js';

export function tileAt(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return TILE_WALL;
  return tiles[ty][tx];
}

export function blocksSight(tiles, tx, ty) {
  const tile = tileAt(tiles, tx, ty);
  return tile === TILE_WALL || tile === TILE_CRATE;
}

export function blocksMove(tiles, tx, ty) {
  return blocksSight(tiles, tx, ty);
}

/** True when no wall or crate stands between two pixel points. Samples every 4 px. */
export function hasLineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    if (blocksSight(tiles, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/** Distance from (x, y) along `angle` until a wall, a crate or the range limit. */
export function castRay(tiles, x, y, angle, maxDist) {
  const step = 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    const px = x + cos * d;
    const py = y + sin * d;
    if (blocksSight(tiles, Math.floor(px / TILE), Math.floor(py / TILE))) return d - step;
  }
  return maxDist;
}

/**
 * The vision cone as a polygon: the guard's position plus the raycast edge,
 * one ray every ~3 degrees across the cone. Drawn by the renderer, tested by
 * canSeePoint, so what the player sees is exactly what the guard sees.
 */
export function conePolygon(tiles, x, y, facing, range = GUARD_RANGE) {
  const rays = 26;
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const angle = facing - GUARD_HALF_ANGLE + ((2 * GUARD_HALF_ANGLE * i) / rays);
    const d = castRay(tiles, x, y, angle, range);
    points.push({ x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d });
  }
  return points;
}

/** Angle difference wrapped to [-PI, PI]. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** True when a point sits inside the guard's cone and in open sight. */
export function canSeePoint(tiles, guardX, guardY, facing, px, py, range = GUARD_RANGE) {
  const dx = px - guardX;
  const dy = py - guardY;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > GUARD_HALF_ANGLE) return false;
  return hasLineOfSight(tiles, guardX, guardY, px, py);
}
