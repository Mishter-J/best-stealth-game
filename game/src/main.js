// Velvet Shadow, entry point: canvas setup, the frame loop, screen keys,
// and the ?shot= scenes the screenshots are taken from. The game itself
// lives in game.js; this file only wires it to the browser.
import { VIEW_W, VIEW_H, HUD_H } from './config.js';
import { Game, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_LEVEL_CLEAR, SCREEN_CAUGHT, SCREEN_WIN } from './game.js';
import { Input } from './input.js';
import { SoundFX } from './audio.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sfx = new SoundFX();
const game = new Game(sfx);
const input = new Input();
input.attach(canvas);

function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function render(now) {
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  const ox = (canvas.width - VIEW_W * scale) / 2;
  const oy = (canvas.height - VIEW_H * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c0e16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  drawGame(ctx, game, now);
}

function toWorld(sx, sy) {
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  const ox = (canvas.width - VIEW_W * scale) / 2;
  const oy = (canvas.height - VIEW_H * scale) / 2;
  return { x: (sx - ox) / scale, y: (sy - oy) / scale - HUD_H };
}

function announce() {
  const level = game.current.def;
  const lines = {
    [SCREEN_TITLE]: 'Velvet Shadow. Press Enter to begin.',
    [SCREEN_PLAY]: `${level.name}. ${game.relicsTaken} of ${game.current.relics.length} relics. ${game.stateLabel}.`,
    [SCREEN_PAUSE]: 'Paused.',
    [SCREEN_LEVEL_CLEAR]: `${level.name} cleared.`,
    [SCREEN_CAUGHT]: 'Spotted! Caught by a warden.',
    [SCREEN_WIN]: 'You won. The vault is yours.',
  };
  statusEl.textContent = lines[game.screen] ?? '';
}

let lastScreen = game.screen;
function afterStep() {
  if (game.screen !== lastScreen) {
    lastScreen = game.screen;
    announce();
  }
}

// Screen keys: Enter advances, Escape pauses, R restarts, M mutes.
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  sfx.ensure();
  if (key === 'enter') {
    if (game.screen === SCREEN_TITLE) game.startGame();
    else if (game.screen === SCREEN_LEVEL_CLEAR) game.nextLevel();
    else if (game.screen === SCREEN_CAUGHT) game.restartLevel();
    else if (game.screen === SCREEN_WIN) game.screen = SCREEN_TITLE;
  } else if (key === 'escape') {
    if (game.screen === SCREEN_PLAY) game.screen = SCREEN_PAUSE;
    else if (game.screen === SCREEN_PAUSE) game.screen = SCREEN_PLAY;
  } else if (key === 'r') {
    if (game.screen === SCREEN_PLAY || game.screen === SCREEN_CAUGHT || game.screen === SCREEN_PAUSE) game.restartLevel();
  } else if (key === 'm') {
    sfx.muted = !sfx.muted;
  }
  afterStep();
});

canvas.addEventListener('mousedown', (event) => {
  sfx.ensure();
  const rect = canvas.getBoundingClientRect();
  const world = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  game.click(world.x, world.y);
  afterStep();
});

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot mode: stage one real scene, draw one frame, stop.
  fitCanvas();
  stageShot(shot, game);
  render(performance.now());
  announce();
  window.__shotReady = true;
} else {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  let last = performance.now();
  const STEP = 1 / 60;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    let acc = dt;
    while (acc > 0) {
      const slice = Math.min(acc, STEP);
      game.step(slice, input);
      acc -= slice;
    }
    input.consumeClick();
    render(now);
    afterStep();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
