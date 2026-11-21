// A warden: patrols a loop of waypoints, investigates what it half-sees,
// chases what it fully sees, and gives up when the trail goes cold.
// States: patrol -> suspicious -> alert -> suspicious -> patrol. A warden
// that loses you goes back to its loop; that is the player's second chance.
import {
  TILE, GUARD_RADIUS, GUARD_PATROL, GUARD_SUSPICIOUS, GUARD_CHASE,
  GUARD_RANGE, GUARD_CLOSE_RANGE, SUSPICIOUS_AT, ALERT_AT,
  GIVE_UP_SECONDS, INVESTIGATE_SECONDS, DETECT_BASE, DETECT_NEAR_BOOST,
  DETECT_FAR_FALLOFF, DETECT_SNEAK, DETECT_WALK, DETECT_SPRINT,
  DETECT_LIT, DETECT_DARK, DETECT_DECAY,
} from './config.js';
import { angleDiff, canSeePoint } from './vision.js';
import { TILE_BUSH } from './levels.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.wp.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
    this.reset();
  }

  reset() {
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.wpIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = STATE_PATROL;
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.investigate = null; // { x, y } where it is going to look
    this.lookTimer = 0;
    this.unseenTimer = 0;
    this.stepTimer = 0;
    this.stepLeft = false;
    this.justSpotted = false; // set for one frame when suspicion hits 100
    this.justSuspicious = false; // set for one frame when suspicion crosses 40
  }

  /** Turn toward `angle` at most `rate` radians per second. */
  turnToward(angle, rate, dt) {
    const diff = angleDiff(angle, this.facing);
    const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
    this.facing += step;
  }

  moveToward(tx, ty, speed, dt, tiles) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Axis-separated, like the player: a warden never clips a corner.
    const r = GUARD_RADIUS;
    const canStand = (x, y) => {
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        const tile = tiles[Math.floor((y + oy) / TILE)]?.[Math.floor((x + ox) / TILE)];
        if (tile === 1 || tile === 3 || tile === undefined) return false;
      }
      return true;
    };
    if (canStand(nx, this.y)) this.x = nx;
    if (canStand(this.x, ny)) this.y = ny;
    this.turnToward(Math.atan2(dy, dx), 5, dt);
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.42;
      this.stepLeft = !this.stepLeft;
    }
    return Math.hypot(tx - this.x, ty - this.y) < 3;
  }

  /** A noise at (x, y) with this radius: investigate it if it reaches us. */
  hear(x, y, radius) {
    if (this.state === STATE_ALERT) return;
    if (Math.hypot(x - this.x, y - this.y) > radius) return;
    this.investigate = { x, y };
    if (this.state === STATE_PATROL) {
      this.state = STATE_SUSPICIOUS;
      this.suspicion = Math.max(this.suspicion, SUSPICIOUS_AT);
      this.justSuspicious = true;
    }
  }

  update(dt, tiles, player, lamps, sfx) {
    this.justSpotted = false;
    this.justSuspicious = false;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const playerHidden = player.hidden && dist > GUARD_CLOSE_RANGE;
    const seen = !playerHidden && canSeePoint(tiles, this.x, this.y, this.facing, player.x, player.y);

    if (seen) {
      // Fill the meter: faster up close, slower far away, slower still
      // against a sneaking thief in the dark, faster in lamplight.
      const distFactor = 1 + (DETECT_NEAR_BOOST - 1) * (1 - dist / GUARD_RANGE)
        + (DETECT_FAR_FALLOFF - 1) * (dist / GUARD_RANGE);
      const stance = player.sneak ? DETECT_SNEAK : player.sprint ? DETECT_SPRINT : DETECT_WALK;
      const inLight = lamps.some((lamp) => Math.hypot(player.x - (lamp.x + 0.5) * TILE, player.y - (lamp.y + 0.5) * TILE) < 95);
      const light = inLight ? DETECT_LIT : DETECT_DARK;
      const before = this.suspicion;
      this.suspicion = Math.min(ALERT_AT, this.suspicion + DETECT_BASE * distFactor * stance * light * dt);
      this.unseenTimer = 0;
      if (before < SUSPICIOUS_AT && this.suspicion >= SUSPICIOUS_AT && this.state === STATE_PATROL) {
        this.state = STATE_SUSPICIOUS;
        this.investigate = { x: player.x, y: player.y };
        this.justSuspicious = true;
      }
      if (this.suspicion >= ALERT_AT && this.state !== STATE_ALERT) {
        this.state = STATE_ALERT;
        this.justSpotted = true;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - DETECT_DECAY * dt);
      if (this.state === STATE_ALERT) {
        this.unseenTimer += dt;
        if (this.unseenTimer >= GIVE_UP_SECONDS) {
          this.state = STATE_SUSPICIOUS;
          this.investigate = { x: player.x, y: player.y };
          this.suspicion = SUSPICIOUS_AT;
          this.unseenTimer = 0;
        }
      } else if (this.state === STATE_SUSPICIOUS && this.suspicion < SUSPICIOUS_AT && !this.investigate) {
        this.state = STATE_PATROL;
      }
    }

    if (this.state === STATE_PATROL) {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        const next = this.waypoints[this.wpIndex];
        this.turnToward(Math.atan2(next.y - this.y, next.x - this.x), 2.2, dt);
      } else {
        const target = this.waypoints[this.wpIndex];
        if (this.moveToward(target.x, target.y, GUARD_PATROL, dt, tiles)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseTimer = 1.1;
        }
      }
    } else if (this.state === STATE_SUSPICIOUS) {
      if (this.investigate) {
        if (this.moveToward(this.investigate.x, this.investigate.y, GUARD_SUSPICIOUS, dt, tiles)) {
          this.investigate = null;
          this.lookTimer = INVESTIGATE_SECONDS;
        }
      } else if (this.lookTimer > 0) {
        this.lookTimer -= dt;
        this.turnToward(this.facing + 2.4 * dt, 2.4, dt); // scan the room
        if (this.lookTimer <= 0 && this.suspicion < SUSPICIOUS_AT) this.state = STATE_PATROL;
      } else {
        this.state = STATE_PATROL;
      }
    } else if (this.state === STATE_ALERT) {
      // Chase the thief: straight at them while visible, at their last
      // seen spot once they break line of sight.
      this.moveToward(player.x, player.y, GUARD_CHASE, dt, tiles);
    }
  }

  /** Caught means the warden is on top of the thief. */
  catches(player) {
    return this.state === STATE_ALERT && Math.hypot(player.x - this.x, player.y - this.y) < 20;
  }
}
