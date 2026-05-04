import Phaser from 'phaser';
import {
  COLORS,
  BASE_ENEMY_CONTACT_DAMAGE,
  CONTACT_DAMAGE_INTERVAL_MS,
  INVULN_AFTER_HIT_MS,
} from '../constants';
import { killEnemyWithLoot } from './xp';
import { triggerGameOver } from './modals';
import type { GameScene, ArcadeRectBody } from '../gameSceneTypes';

export function applyPlayerKnockback(scene: GameScene, enemy: ArcadeRectBody): void {
  const mult = (enemy.getData('playerKnockMult') as number | undefined) ?? 1;
  const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
  const f = 195 * mult;
  scene.playerKnock.x += Math.cos(ang) * f;
  scene.playerKnock.y += Math.sin(ang) * f;
  const cap = 380;
  const len = Math.hypot(scene.playerKnock.x, scene.playerKnock.y);
  if (len > cap) {
    scene.playerKnock.x = (scene.playerKnock.x / len) * cap;
    scene.playerKnock.y = (scene.playerKnock.y / len) * cap;
  }
}

export function onEnemyTouchingPlayer(scene: GameScene, enemy: ArcadeRectBody): void {
  if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;
  if (scene.physics.world.isPaused) return;
  const t = scene.time.now;
  if (t < scene.invulnUntil) return;
  if (t < scene.nextContactDamageAt) return;

  scene.nextContactDamageAt = t + CONTACT_DAMAGE_INTERVAL_MS;
  scene.invulnUntil = t + INVULN_AFTER_HIT_MS;

  const baseDmg =
    (enemy.getData('contactDamage') as number | undefined) ?? BASE_ENEMY_CONTACT_DAMAGE;
  const dmg = Math.max(1, Math.round(baseDmg * scene.stats.damageTakenMult));
  scene.stats.hp -= dmg;

  applyPlayerKnockback(scene, enemy);

  scene.player.setAlpha(0.45);
  scene.tweens.add({
    targets: scene.player,
    alpha: 1,
    duration: INVULN_AFTER_HIT_MS,
    ease: 'Sine.easeOut',
  });

  if (scene.stats.hp <= 0) {
    scene.stats.hp = 0;
    triggerGameOver(scene);
  }
}

export function autoAttack(scene: GameScene, time: number): void {
  if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;
  if (time < scene.nextAttackAt) return;

  scene.nextAttackAt = time + scene.stats.attackCooldownMs;

  const r = scene.stats.attackRange;
  scene.attackGfx.clear();
  scene.attackGfx.lineStyle(3, COLORS.attackFlash, 0.85);
  scene.attackGfx.strokeCircle(scene.player.x, scene.player.y, r);
  scene.time.delayedCall(110, () => scene.attackGfx.clear());

  const px = scene.player.x;
  const py = scene.player.y;
  const dmg = scene.stats.auraDamage;

  const children = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const enemy of children) {
    if (!enemy.body || !enemy.active) continue;
    if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) > r) continue;

    const km = (enemy.getData('auraKnockMult') as number | undefined) ?? 1;
    const ang = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
    const kf = 240 * km;
    const kx = ((enemy.getData('kbX') as number | undefined) || 0) + Math.cos(ang) * kf;
    const ky = ((enemy.getData('kbY') as number | undefined) || 0) + Math.sin(ang) * kf;
    enemy.setData('kbX', kx);
    enemy.setData('kbY', ky);

    let hp = (enemy.getData('hp') as number | undefined) ?? 1;
    hp -= dmg;
    enemy.setData('hp', hp);

    if (hp <= 0) {
      killEnemyWithLoot(scene, enemy);
    }
  }
}
