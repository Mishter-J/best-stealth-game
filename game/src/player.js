// Wren, the thief: movement, stance, noise and pebbles. The player never
// touches a wall: movement is axis-separated against the tile map, so a
// diagonal slide along a wall just works.
import {
  TILE, PLAYER_RADIUS, PLAYER_WALK, PLAYER_SNEAK, PLAYER_SPRINT,
  STEP_INTERVAL, NOISE_SPRINT, PEBBLES_START,
} from './config.js';
import { blocksMove, tileAt } from './vision.js';
import { TILE_BUSH } from './levels.js';

export class Player {
  constructor(startTile) {
    this.reset(startTile);
  }

  reset(startTile) {
    this.x = (startTile.x + 0.5) * TILE;
    this.y = (startTile.y + 0.5) * TILE;
    this.dir = 0; // facing angle, radians
    this.sneak = false;
    this.sprint = false;
    this.moving = false;
    this.pebbles = PEBBLES_START;
    this.stepTimer = 0;
    this.stepLeft = false;
    this.noise = null; // { x, y, radius, ttl } while a footfall rings out
    this.hidden = false;
  }

  get tileX() {
    return Math.floor(this.x / TILE);
  }

  get tileY() {
    return Math.floor(this.y / TILE);
  }

  get inBush() {
    return tileAt(this.tiles, this.tileX, this.tileY) === TILE_BUSH;
  }

  /** Try to move by (dx, dy); each axis is tested alone so walls slide. */
  tryMove(tiles, dx, dy) {
    const r = PLAYER_RADIUS;
    const canStand = (x, y) => {
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        if (blocksMove(tiles, Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return false;
      }
      return true;
    };
    if (dx !== 0 && canStand(this.x + dx, this.y)) this.x += dx;
    if (dy !== 0 && canStand(this.x, this.y + dy)) this.y += dy;
  }

  update(dt, tiles, input, sfx) {
    this.tiles = tiles;
    const move = input.moveVector();
    this.sneak = input.sneak && !input.sprint;
    this.sprint = input.sprint && (move.x !== 0 || move.y !== 0);
    this.moving = move.x !== 0 || move.y !== 0;
    const speed = this.sneak ? PLAYER_SNEAK : this.sprint ? PLAYER_SPRINT : PLAYER_WALK;
    if (this.moving) {
      this.dir = Math.atan2(move.y, move.x);
      this.tryMove(tiles, move.x * speed * dt, move.y * speed * dt);
      // Footfalls: sprinting is loud enough for wardens to hear.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = STEP_INTERVAL * (this.sneak ? 1.4 : 1);
        this.stepLeft = !this.stepLeft;
        if (!this.sneak) sfx.footstep(this.sprint, this.stepLeft);
        if (this.sprint) this.noise = { x: this.x, y: this.y, radius: NOISE_SPRINT, ttl: 0.5 };
      }
    }
    if (this.noise) {
      this.noise.ttl -= dt;
      if (this.noise.ttl <= 0) this.noise = null;
    }
    // Hidden means standing in a bush, still — sprinting through one gives you away.
    this.hidden = this.inBush && !this.sprint;
  }

  /** Throw a pebble toward a world point; returns the landing point or null. */
  throwPebble(wx, wy) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    return { x: wx, y: wy };
  }
}
