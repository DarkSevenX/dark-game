import Phaser from 'phaser';
import { COLORS } from '../constants';
import { ENEMY_DEFS, ENEMY_LEGEND_ORDER } from '../data/enemies';
import { getUnlockedEnemyKeys } from '../enemySpawn';
import { formatSurvivalTime } from '../utils/format';
import type { GameScene } from '../gameSceneTypes';

export function createPlayHud(scene: GameScene): void {
  const font = 'system-ui, sans-serif';
  const depth = 3000;

  scene.hudTimerCenter = scene.add
    .text(scene.scale.width / 2, 12, '0:00', {
      fontFamily: font,
      fontSize: '26px',
      color: COLORS.hudText,
      fontStyle: '800',
    })
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(depth);

  scene.hudLevel = scene.add
    .text(16, 14, '', {
      fontFamily: font,
      fontSize: '15px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setScrollFactor(0)
    .setDepth(depth);

  scene.hudKills = scene.add
    .text(0, 14, '', {
      fontFamily: font,
      fontSize: '15px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(depth);

  const barY0 = 52;
  scene.hudHpBg = scene.add
    .rectangle(16 + scene.HUD_BAR_W / 2, barY0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.hpBarBg, 1)
    .setStrokeStyle(1, 0x334155)
    .setScrollFactor(0)
    .setDepth(depth);

  scene.hudHpFill = scene.add
    .rectangle(16, barY0, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.hpBarFill, 1)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth + 1);

  scene.hudHpLabel = scene.add
    .text(16 + scene.HUD_BAR_W + 8, barY0, '', {
      fontFamily: font,
      fontSize: '13px',
      color: COLORS.hudText,
      fontStyle: '600',
    })
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth);

  const barY1 = 74;
  scene.hudXpBg = scene.add
    .rectangle(16 + scene.HUD_BAR_W / 2, barY1, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.xpBarBg, 1)
    .setStrokeStyle(1, 0x334155)
    .setScrollFactor(0)
    .setDepth(depth);

  scene.hudXpFill = scene.add
    .rectangle(16, barY1, scene.HUD_BAR_W, scene.HUD_BAR_H, COLORS.xpBarFill, 1)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth + 1);

  scene.hudXpLabel = scene.add
    .text(16 + scene.HUD_BAR_W + 8, barY1, '', {
      fontFamily: font,
      fontSize: '12px',
      color: COLORS.hudText,
      fontStyle: '500',
    })
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth);

  createEnemyLegend(scene, font, depth);
}

function createEnemyLegend(scene: GameScene, font: string, depth: number): void {
  let y = 98;
  scene.hudLegendEntries = [];
  for (const key of ENEMY_LEGEND_ORDER) {
    const d = ENEMY_DEFS[key];
    const sw = scene.add
      .rectangle(22, y, 10, 10, d.color, 1)
      .setStrokeStyle(1, d.stroke)
      .setScrollFactor(0)
      .setDepth(depth);
    const tx = scene.add
      .text(34, y, d.label, {
        fontFamily: font,
        fontSize: '11px',
        color: COLORS.hudText,
        fontStyle: '500',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);
    scene.hudLegendEntries.push({ key, sw, tx });
    y += 16;
  }
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
  scene.hudTimerCenter.setX(scene.scale.width / 2);

  scene.hudLevel.setText(`Nivel  ${scene.level}`);
  scene.hudKills.setText(`Bajas  ${scene.killCount}`);
  scene.hudKills.setX(scene.scale.width - 16);

  updateLegendUnlocks(scene, elapsed / 1000);

  const hpR =
    scene.stats.maxHp > 0 ? Phaser.Math.Clamp(scene.stats.hp / scene.stats.maxHp, 0, 1) : 0;
  scene.hudHpFill.setSize(scene.HUD_BAR_W * hpR, scene.HUD_BAR_H);
  scene.hudHpLabel.setText(`${Math.ceil(scene.stats.hp)} / ${scene.stats.maxHp}`);

  const xpR = scene.xpToNext > 0 ? Phaser.Math.Clamp(scene.xp / scene.xpToNext, 0, 1) : 0;
  scene.hudXpFill.setSize(scene.HUD_BAR_W * xpR, scene.HUD_BAR_H);
  scene.hudXpLabel.setText(`XP  ${Math.floor(scene.xp)} / ${scene.xpToNext}`);
}
