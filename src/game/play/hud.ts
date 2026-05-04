import Phaser from 'phaser';
import { COLORS } from '../constants';
import { ENEMY_DEFS, ENEMY_LEGEND_ORDER } from '../data/enemies';
import { getUnlockedEnemyKeys } from '../enemySpawn';
import { formatSurvivalTime } from '../utils/format';
import { getCameraViewLayout } from './camera';
import type { GameScene } from '../gameSceneTypes';

/** Desplazamiento vertical (pantalla) de la fila de leyenda respecto al borde superior del encuadre. */
const LEGEND_TOP_SCREEN = 98;
const LEGEND_ROW_STEP = 16;

export function createPlayHud(scene: GameScene): void {
  const font = 'system-ui, sans-serif';
  const depth = 3000;

  scene.hudTimerCenter = scene.add
    .text(0, 0, '0:00', {
      fontFamily: font,
      fontSize: '26px',
      color: COLORS.hudText,
      fontStyle: '800',
    })
    .setOrigin(0.5, 0)
    .setDepth(depth);

  scene.hudLevel = scene.add
    .text(0, 0, '', {
      fontFamily: font,
      fontSize: '15px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setDepth(depth);

  scene.hudKills = scene.add
    .text(0, 0, '', {
      fontFamily: font,
      fontSize: '15px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setOrigin(1, 0)
    .setDepth(depth);

  scene.hudHpBg = scene.add
    .rectangle(0, 0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.hpBarBg, 1)
    .setStrokeStyle(1, 0x334155)
    .setDepth(depth);

  scene.hudHpFill = scene.add
    .rectangle(0, 0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.hpBarFill, 1)
    .setOrigin(0, 0.5)
    .setDepth(depth + 1);

  scene.hudHpLabel = scene.add
    .text(0, 0, '', {
      fontFamily: font,
      fontSize: '13px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth);

  scene.hudXpBg = scene.add
    .rectangle(0, 0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.xpBarBg, 1)
    .setStrokeStyle(1, 0x334155)
    .setDepth(depth);

  scene.hudXpFill = scene.add
    .rectangle(0, 0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.xpBarFill, 1)
    .setOrigin(0, 0.5)
    .setDepth(depth + 1);

  scene.hudXpLabel = scene.add
    .text(0, 0, '', {
      fontFamily: font,
      fontSize: '12px',
      color: COLORS.hudText,
      fontStyle: '500',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth);

  createEnemyLegend(scene, font, depth);
  layoutHud(scene);
}

function createEnemyLegend(scene: GameScene, font: string, depth: number): void {
  scene.hudLegendEntries = [];
  for (const key of ENEMY_LEGEND_ORDER) {
    const d = ENEMY_DEFS[key];
    const sw = scene.add
      .rectangle(0, 0, 10, 10, d.color, 1)
      .setStrokeStyle(1, d.stroke)
      .setDepth(depth);
    const tx = scene.add
      .text(0, 0, d.label, {
        fontFamily: font,
        fontSize: '11px',
        color: COLORS.hudText,
        fontStyle: '500',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth);
    scene.hudLegendEntries.push({ key, sw, tx });
  }
}

function layoutHud(scene: GameScene): void {
  const L = getCameraViewLayout(scene);
  const barLeft = L.padX(16);
  const barHalf = scene.HUD_BAR_W / 2;
  const gapText = 8 / L.zoomX;

  scene.hudTimerCenter.setPosition(L.midX, L.padY(12));

  scene.hudLevel.setPosition(L.padX(16), L.padY(14));

  scene.hudKills.setPosition(L.worldViewX + L.viewW - 16 / L.zoomX, L.padY(14));

  const yHp = L.padY(52);
  scene.hudHpBg.setPosition(barLeft + barHalf, yHp);
  scene.hudHpFill.setPosition(barLeft, yHp);
  scene.hudHpLabel.setPosition(barLeft + scene.HUD_BAR_W + gapText, yHp);

  const yXp = L.padY(74);
  scene.hudXpBg.setPosition(barLeft + barHalf, yXp);
  scene.hudXpFill.setPosition(barLeft, yXp);
  scene.hudXpLabel.setPosition(barLeft + scene.HUD_BAR_W + gapText, yXp);

  scene.hudLegendEntries.forEach((row, i) => {
    const y = L.padY(LEGEND_TOP_SCREEN + i * LEGEND_ROW_STEP);
    row.sw.setPosition(L.padX(22), y);
    row.tx.setPosition(L.padX(34), y);
  });
}

/**
 * Coloca el HUD después de que la cámara actualice el scroll en preRender (`FOLLOW_UPDATE`).
 * Si se hace en `scene.update()`, `worldView` sigue siendo del frame anterior y el HUD tiembla al moverse.
 */
export function bindHudLayoutToCameraFollow(scene: GameScene): void {
  const cam = scene.cameras.main;
  const sync = () => layoutHud(scene);
  cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    cam.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, sync);
  });
}

function updateLegendUnlocks(scene: GameScene, elapsedSec: number): void {
  const unlocked = new Set(getUnlockedEnemyKeys(elapsedSec));
  for (const row of scene.hudLegendEntries) {
    const ok = unlocked.has(row.key);
    row.sw.setAlpha(ok ? 1 : 0.38);
    row.tx.setAlpha(ok ? 1 : 0.38);
    const label = ENEMY_DEFS[row.key].label;
    row.tx.setText(ok ? label : `${label}  ···`);
  }
}

export function updatePlayHud(scene: GameScene): void {
  const elapsed = scene.gameOver ? scene.finalSurvivalMs : scene.time.now - scene.runStartedAt;
  const timeStr = formatSurvivalTime(elapsed);
  scene.hudTimerCenter.setText(timeStr);

  scene.hudLevel.setText(`Nivel  ${scene.level}`);
  scene.hudKills.setText(`Bajas  ${scene.killCount}`);

  updateLegendUnlocks(scene, elapsed / 1000);

  const hpR =
    scene.stats.maxHp > 0 ? Phaser.Math.Clamp(scene.stats.hp / scene.stats.maxHp, 0, 1) : 0;
  scene.hudHpFill.setSize(scene.HUD_BAR_W * hpR, scene.HUD_BAR_H);
  scene.hudHpLabel.setText(`${Math.ceil(scene.stats.hp)} / ${scene.stats.maxHp}`);

  const xpR = scene.xpToNext > 0 ? Phaser.Math.Clamp(scene.xp / scene.xpToNext, 0, 1) : 0;
  scene.hudXpFill.setSize(scene.HUD_BAR_W * xpR, scene.HUD_BAR_H);
  scene.hudXpLabel.setText(`XP  ${Math.floor(scene.xp)} / ${scene.xpToNext}`);
}
