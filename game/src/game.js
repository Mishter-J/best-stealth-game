// The game itself: screens, levels, scoring and the rules that tie the
// player, the wardens and the relics together. One step is one fixed slice
// of time, so the same inputs always play the same game — the screenshot
// autopilot and the play-tester both drive it through step().
import { TILE, SCORE_RELIC, SCORE_LEVEL_BONUS, SCORE_BONUS_PER_SECOND, SCORE_SPOTTED_PENALTY, NOISE_PEBBLE } from './config.js';
import { LEVELS, buildLevel } from './levels.js';
import { Player } from './player.js';
import { Guard } from './guard.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_LEVEL_CLEAR = 'levelclear';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const RELIC_NAMES = ['Sun Disk', 'Moon Opal', 'Star Sapphire'];
const RELIC_COLORS = ['#ffd27a', '#7ad4ff', '#ff7ad4'];

export class Game {
  constructor(sfx) {
    this.sfx = sfx;
    this.screen = SCREEN_TITLE;
    this.levelIndex = 0;
    this.score = 0;
    this.best = 0;
    this.spotted = 0;
    this.time = 0;
    this.toasts = [];
    this.pebblesFlying = [];
    this.levelClearBonus = 0;
    this.sealedToastTimer = 0;
    this.loadLevel(0);
  }

  get level() {
    return this.current;
  }

  get heat() {
    let max = 0;
    for (const guard of this.guards) max = Math.max(max, guard.suspicion);
    return max;
  }

  get stateLabel() {
    if (this.guards.some((g) => g.state === 'alert')) return 'SPOTTED!';
    if (this.heat >= 40) return 'SUSPICIOUS';
    return 'UNSEEN';
  }

  get relicsTaken() {
    return this.current.relics.filter((r) => r.taken).length;
  }

  get exitOpen() {
    return this.relicsTaken === this.current.relics.length;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.current = buildLevel(LEVELS[index]);
    this.tiles = this.current.tiles;
    this.player = new Player(this.current.playerStart);
    this.guards = this.current.guardDefs.map((def) => new Guard(def));
    this.time = 0;
    this.pebblesFlying = [];
    this.toasts = [];
  }

  startGame() {
    this.score = 0;
    this.spotted = 0;
    this.loadLevel(0);
    this.screen = SCREEN_PLAY;
  }

  restartLevel() {
    const keepScore = this.score;
    this.loadLevel(this.levelIndex);
    this.score = keepScore;
    this.screen = SCREEN_PLAY;
  }

  toast(text, seconds = 2.6) {
    this.toasts.push({ text, ttl: seconds });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  /** A click during play throws a pebble; on a menu screen it advances. */
  click(worldX, worldY) {
    if (this.screen === SCREEN_TITLE) {
      this.startGame();
      return;
    }
    if (this.screen === SCREEN_LEVEL_CLEAR) {
      this.nextLevel();
      return;
    }
    if (this.screen === SCREEN_CAUGHT) {
      this.restartLevel();
      return;
    }
    if (this.screen === SCREEN_WIN) {
      this.screen = SCREEN_TITLE;
      return;
    }
    if (this.screen !== SCREEN_PLAY) return;
    const landing = this.player.throwPebble(worldX, worldY);
    if (!landing) {
      this.toast('No pebbles left — sneak instead.');
      return;
    }
    this.sfx.throwPebble();
    this.pebblesFlying.push({ x0: this.player.x, y0: this.player.y, x1: landing.x, y1: landing.y, t: 0, dur: 0.32 });
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN_WIN;
      this.sfx.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = SCREEN_PLAY;
    this.toast(`${LEVELS[this.levelIndex].name} — ${LEVELS[this.levelIndex].sub}`, 3.5);
  }

  step(dt, input) {
    if (this.screen === SCREEN_PLAY) this.updatePlay(dt, input);
    if (this.screen === SCREEN_TITLE) this.updateBackdrop(dt);
    if (this.sealedToastTimer > 0) this.sealedToastTimer -= dt;
    for (const toast of this.toasts) toast.ttl -= dt;
    this.toasts = this.toasts.filter((t) => t.ttl > 0);
  }

  /** The title screen's living backdrop: wardens patrol while nobody plays. */
  updateBackdrop(dt) {
    const ghost = { x: -500, y: -500, hidden: true, sneak: false, sprint: false };
    for (const guard of this.guards) guard.update(dt, this.tiles, ghost, this.current.lamps, this.sfx);
  }

  updatePlay(dt, input) {
    this.time += dt;
    this.player.update(dt, this.tiles, input, this.sfx);

    // Pebbles fly, land with a clatter, and every warden in earshot turns.
    for (const pebble of this.pebblesFlying) pebble.t += dt;
    const landed = this.pebblesFlying.filter((p) => p.t >= p.dur);
    this.pebblesFlying = this.pebblesFlying.filter((p) => p.t < p.dur);
    for (const pebble of landed) {
      this.sfx.pebbleLand();
      for (const guard of this.guards) guard.hear(pebble.x1, pebble.y1, NOISE_PEBBLE);
      this.toast('Clatter! A warden heard that.', 1.6);
    }

    // The player's own sprinting rings out too.
    if (this.player.noise) {
      for (const guard of this.guards) {
        guard.hear(this.player.noise.x, this.player.noise.y, this.player.noise.radius);
      }
    }

    for (const guard of this.guards) {
      guard.update(dt, this.tiles, this.player, this.current.lamps, this.sfx);
      if (guard.justSpotted) {
        this.spotted += 1;
        this.sfx.alert();
        this.toast(`${guard.name} spotted you! Break line of sight!`, 2.4);
      } else if (guard.justSuspicious) {
        this.sfx.suspicious();
      }
      if (guard.catches(this.player)) {
        this.screen = SCREEN_CAUGHT;
        this.sfx.caught();
        return;
      }
    }

    // Relics: walk over one to pocket it.
    for (const relic of this.current.relics) {
      if (relic.taken) continue;
      const dx = (relic.x + 0.5) * TILE - this.player.x;
      const dy = (relic.y + 0.5) * TILE - this.player.y;
      if (Math.hypot(dx, dy) < 24) {
        relic.taken = true;
        this.score += SCORE_RELIC;
        this.sfx.pickup();
        const left = this.current.relics.length - this.relicsTaken;
        if (left === 0) {
          this.sfx.doorUnlock();
          this.toast('All relics taken — the green door stands open!', 3);
        } else {
          this.toast(`${RELIC_NAMES[relic.index]} taken — ${left} relic${left === 1 ? '' : 's'} left.`, 2.4);
        }
      }
    }

    // The exit: sealed until every relic is pocketed.
    const exit = this.current.exit;
    const edx = (exit.x + 0.5) * TILE - this.player.x;
    const edy = (exit.y + 0.5) * TILE - this.player.y;
    if (Math.hypot(edx, edy) < 26) {
      if (this.exitOpen) {
        this.levelClearBonus = Math.max(0, SCORE_LEVEL_BONUS - Math.floor(this.time) * SCORE_BONUS_PER_SECOND);
        this.score += this.levelClearBonus;
        this.screen = SCREEN_LEVEL_CLEAR;
        this.sfx.levelClear();
      } else if (this.sealedToastTimer <= 0) {
        this.sealedToastTimer = 3;
        this.toast(`The door is sealed — ${this.current.relics.length - this.relicsTaken} relic(s) remain.`, 2.4);
      }
    }
  }

  /** Final tally shown on the win screen. */
  finalScore() {
    return Math.max(0, this.score - this.spotted * SCORE_SPOTTED_PENALTY);
  }

  static relicName(index) {
    return RELIC_NAMES[index];
  }

  static relicColor(index) {
    return RELIC_COLORS[index];
  }
}
