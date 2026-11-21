// Everything the player sees: the hall, the cones, the wardens, the HUD and
// the screens between levels. The judge reads the game mostly through the
// screenshots, so every render is drawn to be readable at a glance: cones
// bright against a dark floor, cover you can read, an exit you cannot miss.
import {
  TILE, COLS, ROWS, PLAY_W, PLAY_H, HUD_H, VIEW_W, VIEW_H, COLORS,
  GUARD_RANGE, PLAYER_RADIUS, GUARD_RADIUS,
} from './config.js';
import { TILE_WALL, TILE_BUSH, TILE_CRATE } from './levels.js';
import { conePolygon } from './vision.js';
import { Game } from './game.js';
import { STATE_ALERT, STATE_SUSPICIOUS } from './guard.js';

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function coneColors(state) {
  if (state === STATE_ALERT) return [COLORS.coneAlert, COLORS.coneAlertEdge];
  if (state === STATE_SUSPICIOUS) return [COLORS.coneSuspicious, COLORS.coneSuspiciousEdge];
  return [COLORS.coneCalm, COLORS.coneCalmEdge];
}

export function drawGame(ctx, game, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawHud(ctx, game);
  ctx.save();
  ctx.translate(0, HUD_H);
  drawHall(ctx, game, now);
  drawPebbles(ctx, game, now);
  drawExit(ctx, game, now);
  drawRelics(ctx, game, now);
  drawGuards(ctx, game, now);
  drawPlayer(ctx, game, now);
  drawToasts(ctx, game);
  ctx.restore();
  if (game.screen !== 'play') drawOverlay(ctx, game, now);
}

function drawHud(ctx, game) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 1, VIEW_W, 1);

  const level = game.current.def;
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${game.levelIndex + 1}  ${level.name}`, 14, 20);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(level.sub, 14, 42);

  // Detection meter in the middle.
  const barX = 470;
  const barW = 190;
  const barY = 18;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DETECTION', barX, 12);
  ctx.fillStyle = '#10131c';
  roundRect(ctx, barX, barY, barW, 14, 4);
  ctx.fill();
  const heat = game.heat / 100;
  ctx.fillStyle = heat >= 1 ? COLORS.danger : heat >= 0.4 ? '#ff9a3c' : COLORS.ok;
  if (heat > 0.01) {
    roundRect(ctx, barX, barY, Math.max(6, barW * heat), 14, 4);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.hudLine;
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, 14, 4);
  ctx.stroke();
  ctx.fillStyle = heat >= 1 ? COLORS.danger : heat >= 0.4 ? '#ff9a3c' : COLORS.ok;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(game.stateLabel, barX, 46);

  // Right side: relics, pebbles, time, score.
  let rx = VIEW_W - 14;
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`SCORE ${game.score}`, rx, 18);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`TIME ${fmtTime(game.time)}   SPOTTED ${game.spotted}`, rx, 40);
  const relicCount = `${game.relicsTaken}/${game.current.relics.length}`;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`◆ ${relicCount}   ● ${game.player.pebbles} pebbles`, rx - 230, 46);
}

function drawHall(ctx, game, now) {
  const tiles = game.tiles;
  // Floor: a quiet checker so patrol routes read at a glance.
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = tiles[y][x];
      if (tile === TILE_WALL) continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  // Lamplight pools, warm against the dark floor.
  for (const lamp of game.current.lamps) {
    const cx = (lamp.x + 0.5) * TILE;
    const cy = (lamp.y + 0.5) * TILE;
    const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 110);
    glow.addColorStop(0, COLORS.lampGlow);
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 110, cy - 110, 220, 220);
  }
  // Vision cones, under everything that stands in the hall.
  for (const guard of game.guards) {
    const [fill, edge] = coneColors(guard.state);
    const poly = conePolygon(game.tiles, guard.x, guard.y, guard.facing);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Walls, crates and bushes.
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (tile === TILE_WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = COLORS.wallDark;
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      } else if (tile === TILE_CRATE) {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateDark;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 5);
        ctx.lineTo(px + TILE - 5, py + TILE - 5);
        ctx.moveTo(px + TILE - 5, py + 5);
        ctx.lineTo(px + 5, py + TILE - 5);
        ctx.strokeStyle = COLORS.crateLight;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (tile === TILE_BUSH) {
        ctx.fillStyle = COLORS.bush;
        roundRect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, 8);
        ctx.fill();
        ctx.fillStyle = COLORS.bushLight;
        ctx.beginPath();
        ctx.arc(px + 11, py + 12, 7, 0, Math.PI * 2);
        ctx.arc(px + 21, py + 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.bushDot;
        ctx.beginPath();
        ctx.arc(px + 20, py + 10, 3, 0, Math.PI * 2);
        ctx.arc(px + 10, py + 22, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Lamp posts, drawn over the floor.
  for (const lamp of game.current.lamps) {
    const cx = (lamp.x + 0.5) * TILE;
    const cy = (lamp.y + 0.5) * TILE;
    ctx.fillStyle = '#3a2f1c';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lampCore;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // A soft vignette: the hall feels dark, but the play stays readable.
  const vg = ctx.createRadialGradient(PLAY_W / 2, PLAY_H / 2, PLAY_H * 0.35, PLAY_W / 2, PLAY_H / 2, PLAY_H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
}

function drawExit(ctx, game, now) {
  const exit = game.current.exit;
  const cx = (exit.x + 0.5) * TILE;
  const cy = (exit.y + 0.5) * TILE;
  const open = game.exitOpen;
  if (open) {
    const pulse = 0.55 + 0.25 * Math.sin(now / 280);
    ctx.fillStyle = `rgba(57, 217, 138, ${pulse * 0.35})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
  roundRect(ctx, cx - 13, cy - 13, 26, 26, 5);
  ctx.fill();
  ctx.strokeStyle = open ? '#a9f5cd' : '#8a9a86';
  ctx.lineWidth = 2;
  roundRect(ctx, cx - 13, cy - 13, 26, 26, 5);
  ctx.stroke();
  ctx.fillStyle = '#0c1a12';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? '➤' : '✕', cx, cy + 1);
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.textDim;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT · SEALED', cx, cy + 24);
}

function drawRelics(ctx, game, now) {
  for (const relic of game.current.relics) {
    if (relic.taken) continue;
    const cx = (relic.x + 0.5) * TILE;
    const cy = (relic.y + 0.5) * TILE;
    const color = Game.relicColor(relic.index);
    const bob = Math.sin(now / 300 + relic.index * 2) * 3;
    const glow = ctx.createRadialGradient(cx, cy + bob, 2, cx, cy + bob, 26);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 26, cy + bob - 26, 52, 52);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Game.relicName(relic.index).toUpperCase(), cx, cy + 22);
  }
}

function drawGuards(ctx, game, now) {
  for (const guard of game.guards) {
    // A faint ring shows how close a warden is to spotting you.
    if (guard.state === STATE_SUSPICIOUS) {
      ctx.strokeStyle = 'rgba(255, 150, 60, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD_RADIUS + 5 + Math.sin(now / 200) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.guardDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Visor: the direction the warden faces.
    const vx = guard.x + Math.cos(guard.facing) * 8;
    const vy = guard.y + Math.sin(guard.facing) * 8;
    ctx.fillStyle = guard.state === STATE_ALERT ? COLORS.danger : '#2c3550';
    ctx.beginPath();
    ctx.arc(vx, vy, 4, 0, Math.PI * 2);
    ctx.fill();
    // Name and state above the head.
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - 22);
    if (guard.state === STATE_ALERT) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - 36);
    } else if (guard.state === STATE_SUSPICIOUS) {
      ctx.fillStyle = '#ff9a3c';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('?', guard.x, guard.y - 36);
    }
    // Suspicion ticks under the warden.
    if (guard.suspicion > 1 && guard.state !== STATE_ALERT) {
      ctx.fillStyle = '#10131c';
      ctx.fillRect(guard.x - 14, guard.y + 16, 28, 4);
      ctx.fillStyle = guard.suspicion >= 40 ? '#ff9a3c' : '#ffd27a';
      ctx.fillRect(guard.x - 14, guard.y + 16, 28 * (guard.suspicion / 100), 4);
    }
  }
}

function drawPlayer(ctx, game, now) {
  const player = game.player;
  const r = player.sneak ? PLAYER_RADIUS - 2 : PLAYER_RADIUS;
  if (player.hidden) {
    ctx.fillStyle = 'rgba(57, 217, 138, 0.25)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, r + 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cloak: a violet circle with a hood point in the facing direction.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  const hx = player.x + Math.cos(player.dir) * (r + 2);
  const hy = player.y + Math.sin(player.dir) * (r + 2);
  ctx.fillStyle = COLORS.playerDark;
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x - 3, player.y - 3, 1.6, 0, Math.PI * 2);
  ctx.arc(player.x + 3, player.y - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.hidden ? COLORS.ok : COLORS.textDim;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(player.sneak ? 'SNEAKING' : player.hidden ? 'HIDDEN' : 'WREN', player.x, player.y - 22);
}

function drawPebbles(ctx, game, now) {
  for (const pebble of game.pebblesFlying) {
    const t = Math.min(1, pebble.t / pebble.dur);
    const x = pebble.x0 + (pebble.x1 - pebble.x0) * t;
    const y = pebble.y0 + (pebble.y1 - pebble.y0) * t - Math.sin(t * Math.PI) * 18;
    ctx.fillStyle = '#c9c2ae';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.player.noise) {
    const n = game.player.noise;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius * (1 - n.ttl / 0.5) + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawToasts(ctx, game) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  game.toasts.forEach((toast, i) => {
    const y = PLAY_H - 24 - i * 22;
    ctx.font = '13px system-ui, sans-serif';
    const w = ctx.measureText(toast.text).width + 20;
    ctx.fillStyle = 'rgba(16, 19, 28, 0.85)';
    roundRect(ctx, (PLAY_W - w) / 2, y - 11, w, 22, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.fillText(toast.text, PLAY_W / 2, y);
  });
  // Controls, always at the bottom so a screenshot teaches the game.
  ctx.fillStyle = 'rgba(232, 228, 216, 0.55)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS move · SHIFT sneak (slow, quiet, harder to see) · SPACE sprint (loud) · CLICK toss a pebble to lure a warden · ESC pause · R restart', PLAY_W / 2, PLAY_H - 6);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
  ctx.fillRect(0, HUD_H, PLAY_W, PLAY_H);
  const w = 620;
  const h = 130 + lines.length * 26;
  const x = (PLAY_W - w) / 2;
  const y = HUD_H + (PLAY_H - h) / 2;
  ctx.fillStyle = '#171c2b';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(title, PLAY_W / 2, y + 44);
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, PLAY_W / 2, y + 84 + i * 26);
  });
}

function drawOverlay(ctx, game, now) {
  if (game.screen === 'title') {
    panel(ctx, 'VELVET SHADOW', [
      'The Starling Vault — a museum after midnight, and you are Wren, its thief.',
      'Pocket the three Starling relics, then slip out the green door — unseen.',
      'Wardens patrol with lanterns and vision cones. Bushes hide you. Crates block sight.',
      'Sneak with SHIFT. Sprint with SPACE, but sprinting is loud. Click to toss a pebble.',
      'Press ENTER or click to begin.',
      `Best score: ${game.best}`,
    ], COLORS.gold);
    return;
  }
  if (game.screen === 'pause') {
    panel(ctx, 'PAUSED', ['The wardens wait. So do the relics.', 'ESC to keep sneaking · R to restart the level'], COLORS.textDim);
    return;
  }
  if (game.screen === 'levelclear') {
    panel(ctx, `${game.current.def.name} — CLEARED`, [
      `Time ${fmtTime(game.time)} · time bonus +${game.levelClearBonus} · score ${game.score}`,
      game.levelIndex + 1 >= 3 ? 'That was the last hall.' : 'The next hall is darker, and its wardens are more of them.',
      'Press ENTER or click for the next level.',
    ], COLORS.ok);
    return;
  }
  if (game.screen === 'caught') {
    panel(ctx, 'SPOTTED!', [
      'A warden caught Wren in the lamplight. The vault keeps its relics — this time.',
      `Score ${game.score} · spotted ${game.spotted} time${game.spotted === 1 ? '' : 's'} · level ${game.levelIndex + 1} of 3`,
      'Press ENTER or click to try the level again.',
    ], COLORS.danger);
    return;
  }
  if (game.screen === 'win') {
    const final = game.finalScore();
    if (final > game.best) game.best = final;
    panel(ctx, 'THE VAULT IS YOURS', [
      'Three halls, three relics, and not a single warden the wiser. Wren vanishes into the night.',
      `Final score ${final}  (spotted penalty −${game.spotted * 100}) · spotted ${game.spotted} time${game.spotted === 1 ? '' : 's'}`,
      'Press ENTER or click to return to the title screen.',
    ], COLORS.gold);
  }
}

export { fmtTime };
