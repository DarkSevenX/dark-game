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

export function performAttack(scene: GameScene, time: number): void {
  if (scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;
  if (time < scene.nextAttackAt) return;

  scene.nextAttackAt = time + scene.stats.attackCooldownMs;

  const px = scene.player.x;
  const py = scene.player.y;
  const r = scene.stats.attackRange;

  // A dash attack triggers if we attack during a dash or within 200ms after it ends.
  const isDashAttack = time <= scene.dashUntil + 200;

  let attackAngle = scene.player.getData('lastFacingAngle') as number ?? 0;
  if (scene.controlMode === 'mouse' && !isDashAttack) {
    const pointer = scene.input.activePointer;
    if (pointer) {
      const cam = scene.cameras.main;
      const target = cam.getWorldPoint(pointer.x, pointer.y);
      attackAngle = Phaser.Math.Angle.Between(px, py, target.x, target.y);
      scene.player.setData('lastFacingAngle', attackAngle);
    }
  }

  scene.attackGfx.clear();
  scene.attackGfx.lineStyle(3, COLORS.attackFlash, 0.85);
  
  if (isDashAttack) {
    scene.attackGfx.strokeCircle(px, py, r);
  } else {
    scene.attackGfx.beginPath();
    scene.attackGfx.arc(px, py, r, attackAngle - Math.PI / 2, attackAngle + Math.PI / 2, false);
    scene.attackGfx.lineTo(px, py);
    scene.attackGfx.closePath();
    scene.attackGfx.strokePath();
  }
  
  scene.time.delayedCall(110, () => scene.attackGfx.clear());

  const dmg = scene.stats.auraDamage;

  const children = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const enemy of children) {
    if (!enemy.body || !enemy.active) continue;
    if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) > r) continue;

    const ang = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
    
    if (!isDashAttack) {
      const angleDiff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(attackAngle), Phaser.Math.RadToDeg(ang));
      if (Math.abs(angleDiff) > 90) continue;
    }

    const km = (enemy.getData('auraKnockMult') as number | undefined) ?? 1;
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
