import Phaser from 'phaser';
import { WORLD, BASE_SPAWN_SEC, MAX_ENEMIES_ALIVE } from '../constants';
import { ENEMY_DEFS } from '../data/enemies';
import { pickEnemyTypeForSpawn } from '../enemySpawn';
import type { GameScene, ArcadeRectBody } from '../gameSceneTypes';

export function scheduleNextSpawn(scene: GameScene): void {
  if (scene.spawnTimer) {
    scene.spawnTimer.remove();
    scene.spawnTimer = null;
  }
  if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;

  const elapsedMin = (scene.time.now - scene.runStartedAt) / 60000;
  const freqMult = 1 + elapsedMin * 0.42;
  const delayMs = Math.max(380, (BASE_SPAWN_SEC * 1000) / freqMult);

  scene.spawnTimer = scene.time.delayedCall(delayMs, () => {
    if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;

    const n = scene.enemies.countActive(true);
    const burst = 1 + Math.min(4, Math.floor(elapsedMin * 0.55));
    for (let i = 0; i < burst && n + i < MAX_ENEMIES_ALIVE; i++) {
      if (i === 0) spawnEnemy(scene);
      else scene.time.delayedCall(i * 70, () => spawnEnemy(scene));
    }
    scheduleNextSpawn(scene);
  });
}

export function getEnemySpeedMult(scene: GameScene): number {
  const elapsedMin = (scene.time.now - scene.runStartedAt) / 60000;
  return Math.min(2.35, 1 + elapsedMin * 0.2);
}

export function spawnEnemy(scene: GameScene): void {
  if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;
  if (scene.enemies.countActive(true) >= MAX_ENEMIES_ALIVE) return;

  const elapsedSec = (scene.time.now - scene.runStartedAt) / 1000;
  const typeKey = pickEnemyTypeForSpawn(elapsedSec);
  const def = ENEMY_DEFS[typeKey];
  const size = def.size;

  const margin = size;
  let x = 0;
  let y = 0;
  let tries = 0;
  do {
    tries += 1;
    const edge = Phaser.Math.Between(0, 3);
    if (edge === 0) {
      x = Phaser.Math.Between(margin, WORLD.W - margin);
      y = margin;
    } else if (edge === 1) {
      x = WORLD.W - margin;
      y = Phaser.Math.Between(margin, WORLD.H - margin);
    } else if (edge === 2) {
      x = Phaser.Math.Between(margin, WORLD.W - margin);
      y = WORLD.H - margin;
    } else {
      x = margin;
      y = Phaser.Math.Between(margin, WORLD.H - margin);
    }
  } while (
    tries < 60 &&
    Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y) < 420
  );

  const enemy = scene.add.rectangle(x, y, size, size, def.color) as ArcadeRectBody;
  enemy.setStrokeStyle(1, def.stroke, 0.9);
  scene.physics.add.existing(enemy);
  enemy.setData('etype', typeKey);
  enemy.setData('hp', def.maxHp);
  enemy.setData('maxHp', def.maxHp);
  enemy.setData('speedMult', def.speedMult);
  enemy.setData('contactDamage', def.contactDamage);
  enemy.setData('auraKnockMult', def.auraKnockMult);
  enemy.setData('playerKnockMult', def.playerKnockMult);
  enemy.setData('xpBonus', def.xpBonus);
  scene.enemies.add(enemy);
}
