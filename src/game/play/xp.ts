import Phaser from 'phaser';
import {
  COLORS,
  ORB_TIERS,
  HEART_DROP_CHANCE,
  HEART_HEAL_MIN,
  HEART_HEAL_MAX,
  HEART_RADIUS,
  type OrbTier,
} from '../constants';
import { consumeLevel } from './levelFlow';
import { openLevelUpMenu } from './modals';
import type { GameScene, ArcadeRectBody } from '../gameSceneTypes';

/** Orden para loot y pesos similares en el mundo. */
export function pickRandomOrbTier(): OrbTier {
  const r = Math.random();
  if (r < 0.34) return 'dim';
  if (r < 0.78) return 'normal';
  return 'rich';
}

export interface SpawnXpOrbOptions {
  worldPickup?: boolean;
  tier?: OrbTier;
  variance?: boolean;
  radius?: number;
  bonusFlat?: number;
}

export function spawnXpOrb(
  scene: GameScene,
  x: number,
  y: number,
  baseXp: number,
  options: SpawnXpOrbOptions = {},
): void {
  const tierKey = options.tier ?? null;
  const def = tierKey ? ORB_TIERS[tierKey] : null;
  const variance = options.variance !== false;

  let value: number;
  if (def) {
    const raw = Phaser.Math.Between(def.baseMin, def.baseMax);
    value = variance ? Math.max(1, Math.round(raw * Phaser.Math.FloatBetween(0.85, 1.1))) : Math.max(1, raw);
  } else {
    const raw = baseXp;
    value = variance
      ? Math.max(1, Math.round(raw * Phaser.Math.FloatBetween(0.82, 1.12)))
      : Math.max(1, Math.round(raw));
  }

  const rad = options.radius ?? def?.radius ?? 7;
  const fill = def?.color ?? COLORS.orb;
  const orb = scene.add.circle(x, y, rad, fill, 0.9);
  if (options.worldPickup) {
    const sw = def?.strokeWorld ?? 0xc4b5fd;
    orb.setStrokeStyle(2, sw, 0.55);
    orb.setData('worldOrb', true);
  } else {
    const sw = def?.strokeDrop ?? 0xffffff;
    orb.setStrokeStyle(2, sw, 0.35);
  }
  if (tierKey) orb.setData('orbTier', tierKey);
  orb.setData('xpValue', value);

  const extra = options.bonusFlat ?? 0;
  if (extra > 0) {
    const v = (orb.getData('xpValue') as number) + extra;
    orb.setData('xpValue', v);
  }

  scene.orbs.add(orb);
}

export function spawnHeartPickup(scene: GameScene, x: number, y: number): void {
  const heal = Phaser.Math.Between(HEART_HEAL_MIN, HEART_HEAL_MAX);
  const heart = scene.add.circle(x, y, HEART_RADIUS, COLORS.heartFill, 0.92);
  heart.setStrokeStyle(2, COLORS.heartStroke, 0.58);
  heart.setData('heartHeal', heal);
  scene.orbs.add(heart);
}

export function collectOrbs(scene: GameScene): void {
  const px = scene.player.x;
  const py = scene.player.y;
  const r = scene.stats.pickupRadius;

  for (const orb of scene.orbs.getChildren()) {
    const o = orb as Phaser.GameObjects.Arc;
    if (!o.active) continue;
    if (Phaser.Math.Distance.Between(px, py, o.x, o.y) > r) continue;

    const heartHeal = o.getData('heartHeal') as number | undefined;
    if (heartHeal !== undefined && heartHeal > 0) {
      if (!scene.gameOver && scene.stats.hp < scene.stats.maxHp) {
        scene.stats.hp = Math.min(scene.stats.maxHp, scene.stats.hp + heartHeal);
        o.destroy();
      }
      continue;
    }

    const raw = (o.getData('xpValue') as number | undefined) ?? 3;
    const gained = Math.max(1, Math.round(raw * scene.stats.xpGainMult));
    gainXp(scene, gained);
    o.destroy();
  }
}

export function gainXp(scene: GameScene, amount: number): void {
  if (scene.gameOver) return;
  scene.xp += amount;
  if (consumeLevel(scene)) openLevelUpMenu(scene);
}

export function killEnemyWithLoot(scene: GameScene, enemy: ArcadeRectBody): void {
  const ox = enemy.x;
  const oy = enemy.y;
  const bonus = (enemy.getData('xpBonus') as number | undefined) ?? 0;
  scene.killCount += 1;
  enemy.destroy();
  const levelExtra = Math.min(8, Math.floor(scene.level * 0.4));
  spawnXpOrb(scene, ox, oy, 0, {
    tier: pickRandomOrbTier(),
    variance: true,
    bonusFlat: bonus + levelExtra,
  });
  if (Math.random() < HEART_DROP_CHANCE) {
    const j = 26;
    spawnHeartPickup(scene, ox + Phaser.Math.Between(-j, j), oy + Phaser.Math.Between(-j, j));
  }
}
