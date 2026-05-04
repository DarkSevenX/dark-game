import Phaser from 'phaser';
import { COLORS } from '../constants';
import { pickThreeUpgrades } from '../data/upgrades';
import { formatSurvivalTime } from '../utils/format';
import { getCameraViewLayout } from './camera';
import { consumeLevel } from './levelFlow';
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
  const L = getCameraViewLayout(scene);
  const zx = L.zoomX;
  const zy = L.zoomY;
  const root = scene.add.container(L.worldViewX, L.worldViewY).setDepth(5000);

  const dim = scene.add.rectangle(w / (2 * zx), h / (2 * zy), w / zx, h / zy, 0x000000, 0.72);
  dim.setInteractive();
  root.add(dim);

  const title = scene.add
    .text(w / (2 * zx), (h * 0.16) / zy, '¡Subiste de nivel!\nElige una mejora', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '26px',
      color: '#f8fafc',
      align: 'center',
      fontStyle: '700',
    })
    .setOrigin(0.5);
  root.add(title);

  const choices = pickThreeUpgrades();
  const cardW = Math.min(210, (w - 80) / 3.2);
  const gap = 16;
  const totalW = 3 * cardW + 2 * gap;
  const startX = w / 2 - totalW / 2 + cardW / 2;

  for (let i = 0; i < 3; i++) {
    const def = choices[i];
    if (!def) break;
    const cx = (startX + i * (cardW + gap)) / zx;
    const cy = (h * 0.52) / zy;

    const card = scene.add
      .rectangle(cx, cy, cardW / zx, 150 / zy, COLORS.panelBg, 0.96)
      .setStrokeStyle(2, 0x64748b)
      .setInteractive({ useHandCursor: true });

    const nameTxt = scene.add
      .text(cx, cy - 48 / zy, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#38bdf8',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: (cardW - 20) / zx },
      })
      .setOrigin(0.5);

    const descTxt = scene.add
      .text(cx, cy + 12 / zy, def.desc, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: (cardW - 16) / zx },
      })
      .setOrigin(0.5);

    card.on('pointerover', () => card.setStrokeStyle(2, 0x38bdf8));
    card.on('pointerout', () => card.setStrokeStyle(2, 0x64748b));
    card.on('pointerdown', () => {
      def.apply(scene);
      scene.syncPlayerMaxVelocity();
      closeLevelUpMenu(scene, root);
    });

    root.add([card, nameTxt, descTxt]);
  }

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

export function togglePause(scene: GameScene): void {
  if (scene.gameOver || scene.pausedForLevelUp) return;
  scene.pausedGame = !scene.pausedGame;
  if (scene.pausedGame) {
    scene.physics.pause();
    const w = scene.scale.width;
    const h = scene.scale.height;
    const L = getCameraViewLayout(scene);
    const zx = L.zoomX;
    const zy = L.zoomY;
    const root = scene.add.container(L.worldViewX, L.worldViewY).setDepth(4500);
    const dim = scene.add.rectangle(w / (2 * zx), h / (2 * zy), w / zx, h / zy, 0x000000, 0.55);
    dim.setInteractive();
    root.add(dim);
    const txt = scene.add
      .text(w / (2 * zx), h / (2 * zy), 'Pausa\n\nPulsa ESC o haz clic para continuar', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        align: 'center',
        fontStyle: '600',
      })
      .setOrigin(0.5);
    root.add(txt);
    dim.on('pointerdown', () => togglePause(scene));
    scene.pauseRoot = root;
  } else {
    if (scene.pauseRoot) {
      scene.pauseRoot.destroy(true);
      scene.pauseRoot = null;
    }
    scene.physics.resume();
    scene.scheduleNextSpawn();
  }
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
  if (scene.pauseRoot) {
    scene.pauseRoot.destroy(true);
    scene.pauseRoot = null;
  }
  scene.pausedGame = false;

  const w = scene.scale.width;
  const h = scene.scale.height;
  const L = getCameraViewLayout(scene);
  const zx = L.zoomX;
  const zy = L.zoomY;
  const root = scene.add.container(L.worldViewX, L.worldViewY).setDepth(5000);

  const dim = scene.add.rectangle(w / (2 * zx), h / (2 * zy), w / zx, h / zy, 0x000011, 0.78);
  root.add(dim);

  const title = scene.add
    .text(w / (2 * zx), (h * 0.34) / zy, 'Fin de la partida', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#f8fafc',
      align: 'center',
      fontStyle: '800',
    })
    .setOrigin(0.5);
  root.add(title);

  const summary = scene.add
    .text(
      w / (2 * zx),
      (h * 0.48) / zy,
      `Supervivencia: ${formatSurvivalTime(scene.finalSurvivalMs)}\nBajas: ${scene.killCount}`,
      {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#e2e8f0',
        align: 'center',
        fontStyle: '500',
      },
    )
    .setOrigin(0.5);
  root.add(summary);

  const btn = scene.add
    .text(w / (2 * zx), (h * 0.64) / zy, 'Volver a intentar', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#38bdf8',
      fontStyle: '700',
      backgroundColor: '#1e293b',
      padding: { x: 18, y: 10 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setStyle({ color: '#7dd3fc' }));
  btn.on('pointerout', () => btn.setStyle({ color: '#38bdf8' }));
  btn.on('pointerdown', () => scene.scene.restart());
  root.add(btn);

  scene.gameOverRoot = root;
}
