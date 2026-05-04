import Phaser from 'phaser';
import { WORLD, DEV_START_WEAPONS } from '../constants';
import {
  type GameScene,
  type PierceWeaponState,
  type ProjectileWeaponState,
  type ArcadeRectBody,
} from '../gameSceneTypes';
import { killEnemyWithLoot } from './xp';

export function applyDevStartWeapons(scene: GameScene): void {
  for (const id of DEV_START_WEAPONS) {
    if (id === 'lightning') applyLightningWeaponUpgrade(scene);
    if (id === 'projectile') applyProjectileWeaponUpgrade(scene);
    if (id === 'pierce') applyPierceWeaponUpgrade(scene);
    if (id === 'orbit') applyOrbitWeaponUpgrade(scene);
    if (id === 'nova') applyNovaWeaponUpgrade(scene);
  }
}

export function applyLightningWeaponUpgrade(scene: GameScene): void {
  if (!scene.lightningWeapon) {
    scene.lightningWeapon = {
      interval: 920,
      range: 400,
      damage: 10,
      nextAt: 0,
    };
  } else {
    scene.lightningWeapon.damage = Math.round(scene.lightningWeapon.damage * 1.12);
    scene.lightningWeapon.interval = Math.max(380, Math.floor(scene.lightningWeapon.interval * 0.9));
    scene.lightningWeapon.range = Math.min(640, scene.lightningWeapon.range + 24);
  }
}

export function applyProjectileWeaponUpgrade(scene: GameScene): void {
  if (!scene.projectileWeapon) {
    scene.projectileWeapon = {
      interval: 1050,
      range: 430,
      damage: 9,
      speed: 440,
      maxDist: 720,
      nextAt: 0,
    };
  } else {
    scene.projectileWeapon.damage = Math.round(scene.projectileWeapon.damage * 1.1);
    scene.projectileWeapon.interval = Math.max(420, Math.floor(scene.projectileWeapon.interval * 0.91));
    scene.projectileWeapon.speed = Math.min(640, scene.projectileWeapon.speed + 38);
    scene.projectileWeapon.range = Math.min(620, scene.projectileWeapon.range + 22);
    scene.projectileWeapon.maxDist = Math.min(1100, scene.projectileWeapon.maxDist + 70);
  }
}

export function applyPierceWeaponUpgrade(scene: GameScene): void {
  if (!scene.pierceWeapon) {
    scene.pierceWeapon = {
      interval: 1180,
      range: 410,
      damage: 8,
      speed: 420,
      maxDist: 820,
      pierceHits: 3,
      nextAt: 0,
    };
  } else {
    scene.pierceWeapon.damage = Math.round(scene.pierceWeapon.damage * 1.09);
    scene.pierceWeapon.interval = Math.max(480, Math.floor(scene.pierceWeapon.interval * 0.92));
    scene.pierceWeapon.speed = Math.min(620, scene.pierceWeapon.speed + 32);
    scene.pierceWeapon.pierceHits = Math.min(8, scene.pierceWeapon.pierceHits + 1);
    scene.pierceWeapon.range = Math.min(600, scene.pierceWeapon.range + 20);
    scene.pierceWeapon.maxDist = Math.min(1100, scene.pierceWeapon.maxDist + 55);
  }
}

function syncOrbitBladeSprites(scene: GameScene): void {
  if (!scene.orbitWeapon) return;
  const n = scene.orbitWeapon.bladeCount;
  while (scene.orbitBlades.length < n) {
    const b = scene.add.rectangle(0, 0, 12, 22, 0x38bdf8, 0.95);
    b.setStrokeStyle(1, 0xe0f2fe);
    b.setDepth(4);
    scene.orbitBlades.push(b);
  }
  while (scene.orbitBlades.length > n) {
    const b = scene.orbitBlades.pop();
    b?.destroy();
  }
}

export function applyOrbitWeaponUpgrade(scene: GameScene): void {
  if (!scene.orbitWeapon) {
    scene.orbitWeapon = {
      bladeCount: 2,
      radius: 74,
      rotSpeed: 2.15,
      damage: 7,
      hitInterval: 400,
      hitRadius: 15,
      angle: 0,
      nextHitAt: 0,
    };
  } else {
    scene.orbitWeapon.damage = Math.round(scene.orbitWeapon.damage * 1.08);
    scene.orbitWeapon.hitInterval = Math.max(260, Math.floor(scene.orbitWeapon.hitInterval * 0.93));
    scene.orbitWeapon.radius = Math.min(112, scene.orbitWeapon.radius + 6);
    if (scene.orbitWeapon.bladeCount < 5 && Math.random() < 0.48) {
      scene.orbitWeapon.bladeCount += 1;
    } else {
      scene.orbitWeapon.rotSpeed += 0.38;
      scene.orbitWeapon.hitRadius = Math.min(22, scene.orbitWeapon.hitRadius + 1);
    }
  }
  syncOrbitBladeSprites(scene);
}

export function applyNovaWeaponUpgrade(scene: GameScene): void {
  if (!scene.novaWeapon) {
    scene.novaWeapon = {
      interval: 3000,
      radius: 175,
      damage: 12,
      nextAt: 0,
    };
  } else {
    scene.novaWeapon.damage = Math.round(scene.novaWeapon.damage * 1.1);
    scene.novaWeapon.interval = Math.max(1850, Math.floor(scene.novaWeapon.interval * 0.92));
    scene.novaWeapon.radius = Math.min(265, scene.novaWeapon.radius + 14);
  }
}

export function onProjectileHitEnemy(
  scene: GameScene,
  proj: ArcadeRectBody,
  enemy: ArcadeRectBody,
): void {
  if (!proj.active || !enemy.active || !enemy.body) return;

  const hitList = (proj.getData('hitEnemies') as ArcadeRectBody[] | undefined) ?? [];
  if (hitList.includes(enemy)) return;
  hitList.push(enemy);
  proj.setData('hitEnemies', hitList);

  const fromPierce = proj.getData('fromPierce') === true;
  const dmg = fromPierce
    ? ((proj.getData('damage') as number | undefined) ?? scene.pierceWeapon?.damage ?? 8)
    : ((proj.getData('damage') as number | undefined) ?? scene.projectileWeapon?.damage ?? 9);

  let hp = (enemy.getData('hp') as number | undefined) ?? 1;
  hp -= dmg;
  enemy.setData('hp', hp);

  let remaining = proj.getData('hitsRemaining') as number | undefined;
  if (remaining === undefined) remaining = 1;
  remaining -= 1;
  if (remaining <= 0) proj.destroy();
  else proj.setData('hitsRemaining', remaining);

  if (hp <= 0) {
    killEnemyWithLoot(scene, enemy);
  }
}

function fireStraightProjectile(
  scene: GameScene,
  time: number,
  weapon: ProjectileWeaponState | PierceWeaponState,
  color: number,
  stroke: number,
  fromPierce: boolean,
): boolean {
  if (!weapon || scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return false;
  if (time < weapon.nextAt) return false;

  const { range, interval, speed } = weapon;
  const px = scene.player.x;
  const py = scene.player.y;

  let target: ArcadeRectBody | null = null;
  let bestD = Infinity;
  const enemyList = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const e of enemyList) {
    if (!e.body || !e.active) continue;
    const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
    if (d <= range && d < bestD) {
      bestD = d;
      target = e;
    }
  }

  weapon.nextAt = time + interval;
  if (!target) return true;

  const ang = Phaser.Math.Angle.Between(px, py, target.x, target.y);
  const vx = Math.cos(ang) * speed;
  const vy = Math.sin(ang) * speed;

  const rw = fromPierce ? 20 : 18;
  const rh = fromPierce ? 7 : 8;
  const proj = scene.add.rectangle(px, py, rw, rh, color, 1) as ArcadeRectBody;
  proj.setStrokeStyle(2, stroke, 1);
  proj.setRotation(ang);
  proj.setDepth(4);

  scene.physics.add.existing(proj, false);
  const body = proj.body;
  body.setAllowGravity(false);
  body.setImmovable(false);
  body.setCollideWorldBounds(false);
  body.setSize(rw, rh);
  scene.projectiles.add(proj);

  body.setVelocity(vx, vy);
  scene.time.delayedCall(0, () => {
    if (proj.active && proj.body) {
      proj.body.setVelocity(vx, vy);
    }
  });

  proj.setData('damage', weapon.damage);
  proj.setData('startX', px);
  proj.setData('startY', py);
  proj.setData('maxDist', weapon.maxDist);
  proj.setData('fromPierce', fromPierce);
  proj.setData('hitEnemies', []);
  if (fromPierce) {
    proj.setData('hitsRemaining', (weapon as PierceWeaponState).pierceHits);
  } else {
    proj.setData('hitsRemaining', 1);
  }
  return true;
}

export function tickProjectileWeapon(scene: GameScene, time: number): void {
  const w = scene.projectileWeapon;
  if (!w) return;
  fireStraightProjectile(scene, time, w, 0xff7043, 0xffccbc, false);
}

export function tickPierceWeapon(scene: GameScene, time: number): void {
  const w = scene.pierceWeapon;
  if (!w) return;
  fireStraightProjectile(scene, time, w, 0x2dd4bf, 0xccfbf1, true);
}

export function cullProjectiles(scene: GameScene): void {
  for (const p of scene.projectiles.getChildren() as ArcadeRectBody[]) {
    if (!p.active || !p.body) continue;
    if (p.x < -50 || p.x > WORLD.W + 50 || p.y < -50 || p.y > WORLD.H + 50) {
      p.destroy();
      continue;
    }
    const sx = p.getData('startX') as number | undefined;
    const sy = p.getData('startY') as number | undefined;
    const maxD = p.getData('maxDist') as number | undefined;
    if (sx == null || sy == null || maxD == null) continue;
    if (Phaser.Math.Distance.Between(sx, sy, p.x, p.y) > maxD) {
      p.destroy();
    }
  }
}

function drawLightningBolt(scene: GameScene, x1: number, y1: number, x2: number, y2: number): void {
  const g = scene.lightningGfx;
  g.clear();
  const midX = (x1 + x2) / 2 + Phaser.Math.Between(-22, 22);
  const midY = (y1 + y2) / 2 + Phaser.Math.Between(-22, 22);
  g.lineStyle(4, 0xffee58, 0.98);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(midX, midY);
  g.lineTo(x2, y2);
  g.strokePath();
  g.lineStyle(2, 0xe3f2fd, 0.75);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(midX, midY);
  g.lineTo(x2, y2);
  g.strokePath();
  scene.time.delayedCall(90, () => g.clear());
}

export function tickLightningWeapon(scene: GameScene, time: number): void {
  if (!scene.lightningWeapon || scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) {
    return;
  }
  if (time < scene.lightningWeapon.nextAt) return;

  const { range, damage, interval } = scene.lightningWeapon;
  const px = scene.player.x;
  const py = scene.player.y;

  let target: ArcadeRectBody | null = null;
  let bestD = Infinity;
  const enemyList = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const e of enemyList) {
    if (!e.body || !e.active) continue;
    const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
    if (d <= range && d < bestD) {
      bestD = d;
      target = e;
    }
  }

  scene.lightningWeapon.nextAt = time + interval;
  if (!target) return;

  drawLightningBolt(scene, px, py, target.x, target.y);

  const km = (target.getData('auraKnockMult') as number | undefined) ?? 1;
  const ang = Phaser.Math.Angle.Between(px, py, target.x, target.y);
  const kf = 130 * km;
  target.setData('kbX', ((target.getData('kbX') as number | undefined) || 0) + Math.cos(ang) * kf);
  target.setData('kbY', ((target.getData('kbY') as number | undefined) || 0) + Math.sin(ang) * kf);

  let hp = (target.getData('hp') as number | undefined) ?? 1;
  hp -= damage;
  target.setData('hp', hp);

  if (hp <= 0) {
    killEnemyWithLoot(scene, target);
  }
}

function applyOrbitalSlashDamage(
  scene: GameScene,
  bx: number,
  by: number,
  dmg: number,
  hitRadius: number,
): void {
  const enemyList = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const enemy of enemyList) {
    if (!enemy.body || !enemy.active) continue;
    const approxR = Math.max(enemy.width || 0, enemy.height || 0) * 0.35 + hitRadius;
    if (Phaser.Math.Distance.Between(bx, by, enemy.x, enemy.y) > approxR) continue;

    let hp = (enemy.getData('hp') as number | undefined) ?? 1;
    hp -= dmg;
    enemy.setData('hp', hp);
    const km = (enemy.getData('auraKnockMult') as number | undefined) ?? 1;
    const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
    const kf = 95 * km;
    enemy.setData('kbX', ((enemy.getData('kbX') as number | undefined) || 0) + Math.cos(ang) * kf);
    enemy.setData('kbY', ((enemy.getData('kbY') as number | undefined) || 0) + Math.sin(ang) * kf);
    if (hp <= 0) killEnemyWithLoot(scene, enemy);
  }
}

export function tickOrbitWeapon(scene: GameScene, time: number): void {
  const w = scene.orbitWeapon;
  if (!w || scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;

  const dt = scene.game.loop.delta / 1000;
  w.angle += w.rotSpeed * dt;

  const px = scene.player.x;
  const py = scene.player.y;
  let i = 0;
  for (const blade of scene.orbitBlades) {
    const a = w.angle + (Math.PI * 2 * i) / w.bladeCount;
    const bx = px + Math.cos(a) * w.radius;
    const by = py + Math.sin(a) * w.radius;
    blade.setPosition(bx, by);
    blade.setRotation(a + Math.PI / 2);
    i += 1;
  }

  if (time < w.nextHitAt) return;
  w.nextHitAt = time + w.hitInterval;

  i = 0;
  for (; i < scene.orbitBlades.length; i++) {
    const a = w.angle + (Math.PI * 2 * i) / w.bladeCount;
    const bx = px + Math.cos(a) * w.radius;
    const by = py + Math.sin(a) * w.radius;
    applyOrbitalSlashDamage(scene, bx, by, w.damage, w.hitRadius);
  }
}

export function tickNovaWeapon(scene: GameScene, time: number): void {
  const w = scene.novaWeapon;
  if (!w || scene.gameOver || scene.pausedForLevelUp || scene.pausedGame) return;
  if (time < w.nextAt) return;
  w.nextAt = time + w.interval;

  const px = scene.player.x;
  const py = scene.player.y;
  const r = w.radius;
  const g = scene.novaGfx;
  g.clear();
  g.lineStyle(6, 0x818cf8, 0.8);
  g.strokeCircle(px, py, r);
  scene.time.delayedCall(140, () => g.clear());
  scene.time.delayedCall(50, () => {
    g.lineStyle(3, 0xe9d5ff, 0.45);
    g.strokeCircle(px, py, r * 0.92);
  });

  const enemyList = scene.enemies.getChildren() as ArcadeRectBody[];
  for (const enemy of enemyList) {
    if (!enemy.body || !enemy.active) continue;
    if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) > r) continue;
    let hp = (enemy.getData('hp') as number | undefined) ?? 1;
    hp -= w.damage;
    enemy.setData('hp', hp);
    const km = (enemy.getData('auraKnockMult') as number | undefined) ?? 1;
    const ang = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
    const kf = 165 * km;
    enemy.setData('kbX', ((enemy.getData('kbX') as number | undefined) || 0) + Math.cos(ang) * kf);
    enemy.setData('kbY', ((enemy.getData('kbY') as number | undefined) || 0) + Math.sin(ang) * kf);
    if (hp <= 0) killEnemyWithLoot(scene, enemy);
  }
}
