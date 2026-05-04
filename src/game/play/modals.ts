import Phaser from 'phaser';
import { COLORS, LEVEL_UP_MANA_FILL_RATIO } from '../constants';
import { pickThreeUpgrades } from '../data/upgrades';
import { formatSurvivalTime } from '../utils/format';
import { consumeLevel } from './levelFlow';
import { grantRejectManaReward } from './mana';
import type { GameScene } from '../gameSceneTypes';

export function openLevelUpMenu(scene: GameScene): void {
  if (scene.levelUpRoot) return;
  scene.pausedForLevelUp = true;
  scene.physics.pause();
  if (scene.spawnTimer) {
    scene.spawnTimer.remove();
    scene.spawnTimer = null;
  }

  const w = scene.scale.width;
  const h = scene.scale.height;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(5000);

  const dim = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72).setScrollFactor(0);
  dim.setInteractive();
  root.add(dim);

  const manaPct = Math.round(LEVEL_UP_MANA_FILL_RATIO * 100);
  const title = scene.add
    .text(
      w / 2,
      h * 0.12,
      `¡Subiste de nivel!\nElige una mejora o recházalas por +${manaPct}% maná máx.`,
      {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
        align: 'center',
        fontStyle: '700',
      },
    )
    .setOrigin(0.5)
    .setScrollFactor(0);
  root.add(title);

  const choices = pickThreeUpgrades();
  const cardW = Math.min(200, (w - 72) / 3.25);
  const gap = 14;
  const totalW = 3 * cardW + 2 * gap;
  const startX = w / 2 - totalW / 2 + cardW / 2;

  for (let i = 0; i < 3; i++) {
    const def = choices[i];
    if (!def) break;
    const cx = startX + i * (cardW + gap);
    const cy = h * 0.44;

    const card = scene.add
      .rectangle(cx, cy, cardW, 150, COLORS.panelBg, 0.96)
      .setStrokeStyle(2, 0x64748b)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const nameTxt = scene.add
      .text(cx, cy - 48, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#38bdf8',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: cardW - 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const descTxt = scene.add
      .text(cx, cy + 8, def.desc, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: cardW - 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    card.on('pointerover', () => card.setStrokeStyle(2, 0x38bdf8));
    card.on('pointerout', () => card.setStrokeStyle(2, 0x64748b));
    card.on('pointerdown', () => {
      def.apply(scene);
      scene.syncPlayerMaxVelocity();
      closeLevelUpMenu(scene, root);
    });

    root.add([card, nameTxt, descTxt]);
  }

  const rejectW = Math.min(520, w - 40);
  const rejY = h * 0.72;
  const rejectBg = scene.add
    .rectangle(w / 2, rejY, rejectW, 46, 0x0c4a6e, 0.95)
    .setStrokeStyle(2, 0x38bdf8)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const rejectTxt = scene.add
    .text(w / 2, rejY, `Rechazar las tres  ·  +${manaPct}% de tu maná máximo`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#e0f2fe',
      fontStyle: '600',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  rejectBg.on('pointerover', () => rejectBg.setStrokeStyle(2, 0x7dd3fc));
  rejectBg.on('pointerout', () => rejectBg.setStrokeStyle(2, 0x38bdf8));
  rejectBg.on('pointerdown', () => {
    grantRejectManaReward(scene);
    scene.syncPlayerMaxVelocity();
    closeLevelUpMenu(scene, root);
  });

  root.add([rejectBg, rejectTxt]);
  scene.levelUpRoot = root;
}

export function closeLevelUpMenu(scene: GameScene, root: Phaser.GameObjects.Container): void {
  root.destroy(true);
  scene.levelUpRoot = null;
  scene.pausedForLevelUp = false;
  if (!scene.gameOver) {
    scene.physics.resume();
    scene.scheduleNextSpawn();
  }
  if (consumeLevel(scene)) openLevelUpMenu(scene);
}

export function triggerGameOver(scene: GameScene): void {
  if (scene.gameOver) return;
  scene.gameOver = true;
  scene.finalSurvivalMs = scene.time.now - scene.runStartedAt;
  scene.physics.pause();
  if (scene.spawnTimer) {
    scene.spawnTimer.remove();
    scene.spawnTimer = null;
  }

  const w = scene.scale.width;
  const h = scene.scale.height;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(6000);

  root.add(scene.add.rectangle(w / 2, h / 2, w, h, 0x0f172a, 0.88).setScrollFactor(0));

  const title = scene.add
    .text(w / 2, h * 0.3, 'Fin de la partida', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '36px',
      color: '#f87171',
      fontStyle: '800',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  const timeStr = formatSurvivalTime(scene.finalSurvivalMs);
  const sub = scene.add
    .text(w / 2, h * 0.4, `Tiempo sobrevivido: ${timeStr}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#e2e8f0',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  const hint = scene.add
    .text(w / 2, h * 0.48, `Nivel ${scene.level}  ·  Bajas: ${scene.killCount}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#94a3b8',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  const btn = scene.add
    .rectangle(w / 2, h * 0.64, 280, 52, 0x334155, 1)
    .setStrokeStyle(2, 0x64748b)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const btnTxt = scene.add
    .text(w / 2, h * 0.64, 'Volver a intentar  ·  R', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#f1f5f9',
      fontStyle: '600',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

  btn.on('pointerover', () => btn.setFillStyle(0x475569));
  btn.on('pointerout', () => btn.setFillStyle(0x334155));
  btn.on('pointerdown', () => scene.scene.restart());

  root.add([title, sub, hint, btn, btnTxt]);
  scene.gameOverRoot = root;
}

export function togglePause(scene: GameScene): void {
  if (scene.gameOver || scene.pausedForLevelUp) return;
  scene.pausedGame = !scene.pausedGame;
  if (scene.pausedGame) {
    scene.physics.pause();
    scene.time.paused = true;
    scene.tweens.pauseAll();
    showPauseMenu(scene);
  } else {
    hidePauseMenu(scene);
    scene.tweens.resumeAll();
    scene.time.paused = false;
    scene.physics.resume();
  }
}

function showPauseMenu(scene: GameScene): void {
  if (scene.pauseRoot) return;
  const w = scene.scale.width;
  const h = scene.scale.height;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(4400);

  const dim = scene.add
    .rectangle(w / 2, h / 2, w, h, 0x0f172a, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  dim.on('pointerdown', () => {
    if (scene.pausedGame) togglePause(scene);
  });
  root.add(dim);

  const title = scene.add
    .text(w / 2, h * 0.34, 'PAUSA', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '40px',
      color: '#f8fafc',
      fontStyle: '800',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);
  root.add(title);

  const elapsed = scene.time.now - scene.runStartedAt;
  const clock = scene.add
    .text(w / 2, h * 0.44, `Cronómetro  ${formatSurvivalTime(elapsed)}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#e2e8f0',
      fontStyle: '600',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);
  root.add(clock);

  const hint = scene.add
    .text(w / 2, h * 0.54, 'ESC  ·  clic para reanudar', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#94a3b8',
    })
    .setOrigin(0.5)
    .setScrollFactor(0);
  root.add(hint);

  scene.pauseRoot = root;
}

export function hidePauseMenu(scene: GameScene): void {
  if (!scene.pauseRoot) return;
  scene.pauseRoot.destroy(true);
  scene.pauseRoot = null;
}
