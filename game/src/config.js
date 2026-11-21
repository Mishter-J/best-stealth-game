// Shared constants for Velvet Shadow: a top-down stealth game.
// One place for every number the other modules tune against, so a
// balance change never means hunting through the game logic.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const PLAY_W = COLS * TILE; // 960
export const PLAY_H = ROWS * TILE; // 640
export const HUD_H = 60;
export const VIEW_W = PLAY_W; // 960
export const VIEW_H = PLAY_H + HUD_H; // 700

// Movement speeds, pixels per second.
export const PLAYER_WALK = 132;
export const PLAYER_SNEAK = 72;
export const PLAYER_SPRINT = 205;
export const GUARD_PATROL = 56;
export const GUARD_SUSPICIOUS = 84;
export const GUARD_CHASE = 132;
export const PLAYER_RADIUS = 11;
export const GUARD_RADIUS = 12;

// Vision: how far a warden sees, and how wide the cone is.
export const GUARD_RANGE = 225;
export const GUARD_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_CLOSE_RANGE = 46; // inside this, a bush hides nobody

// Detection meter 0..100. Rates are per second while the player is seen.
export const DETECT_BASE = 58;
export const DETECT_NEAR_BOOST = 1.45; // very close: seen fast
export const DETECT_FAR_FALLOFF = 0.45; // at the edge of the cone
export const DETECT_SNEAK = 0.55;
export const DETECT_WALK = 1.0;
export const DETECT_SPRINT = 1.75;
export const DETECT_LIT = 1.35; // standing in lamplight
export const DETECT_DARK = 0.8; // standing in shadow
export const DETECT_DECAY = 26; // per second while unseen
export const SUSPICIOUS_AT = 40; // meter at which a warden investigates
export const ALERT_AT = 100; // meter at which a warden gives chase
export const GIVE_UP_SECONDS = 2.6; // unseen this long while chasing: give up
export const INVESTIGATE_SECONDS = 2.4; // looking around at a noise point

// Noise radii in pixels. Walking is silent; sprinting and pebbles are not.
export const NOISE_SPRINT = 135;
export const NOISE_PEBBLE = 175;
export const STEP_INTERVAL = 0.34; // seconds between sprint footfalls
export const PEBBLES_START = 6;

// Scoring.
export const SCORE_RELIC = 250;
export const SCORE_LEVEL_BONUS = 1200;
export const SCORE_BONUS_PER_SECOND = 10;
export const SCORE_SPOTTED_PENALTY = 100;

// Palette: a night museum — deep blue floor, warm lamps, amber cones.
export const COLORS = {
  floorA: '#232a3d',
  floorB: '#202636',
  floorEdge: '#2c3550',
  wall: '#4a5468',
  wallTop: '#6b7894',
  wallDark: '#333c50',
  bush: '#1f4d2e',
  bushLight: '#2f6b40',
  bushDot: '#4c8a58',
  crate: '#6b4a26',
  crateDark: '#4e3419',
  crateLight: '#8a6534',
  lampGlow: 'rgba(255, 190, 90, 0.20)',
  lampCore: '#ffd27a',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 110, 0.55)',
  coneSuspicious: 'rgba(255, 150, 60, 0.30)',
  coneSuspiciousEdge: 'rgba(255, 150, 60, 0.75)',
  coneAlert: 'rgba(255, 70, 60, 0.34)',
  coneAlertEdge: 'rgba(255, 70, 60, 0.85)',
  player: '#7a5cff',
  playerDark: '#4a2fb8',
  guard: '#e8e4d8',
  guardDark: '#8a8578',
  exitLocked: '#5a6b52',
  exitOpen: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.25)',
  hudBg: '#141824',
  hudLine: '#2c3550',
  text: '#e8e4d8',
  textDim: '#9aa3b8',
  gold: '#ffd27a',
  danger: '#ff5148',
  ok: '#39d98a',
};
