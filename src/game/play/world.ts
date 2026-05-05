import Phaser from 'phaser';
import {
  WORLD,
  COLORS,
  ROCK_COUNT,
  ROCK_SIZE,
  WORLD_ORB_COUNT,
  WORLD_ORB_MIN_FROM_PLAYER,
  WORLD_ORB_MIN_SPACING,
  WORLD_HEART_COUNT,
  WORLD_HEART_MIN_FROM_PLAYER,
  WORLD_HEART_MIN_SPACING,
} from '../constants';
import { spawnXpOrb, spawnHeartPickup, pickRandomOrbTier } from './xp';
import type { GameScene } from '../gameSceneTypes';

export function createWorldBackground(scene: GameScene): void {
  scene.add.rectangle(WORLD.W / 2, WORLD.H / 2, WORLD.W, WORLD.H, COLORS.bg);

  const grid = scene.add.graphics();
  grid.lineStyle(1, COLORS.grid, 0.55);
  const step = 48;
  for (let x = 0; x <= WORLD.W; x += step) {
    grid.lineBetween(x, 0, x, WORLD.H);
  }
  for (let y = 0; y <= WORLD.H; y += step) {
    grid.lineBetween(0, y, WORLD.W, y);
  }
  grid.setDepth(-2);
}

export function placeRocks(scene: GameScene, avoidX: number, avoidY: number): void {
  const minFromPlayer = 120;
  const minFromRock = ROCK_SIZE + 8;
  let placed = 0;
  let guard = 0;
  const positions: { x: number; y: number }[] = [];

  while (placed < ROCK_COUNT && guard < ROCK_COUNT * 80) {
    guard += 1;
    const x = Phaser.Math.Between(ROCK_SIZE, WORLD.W - ROCK_SIZE);
    const y = Phaser.Math.Between(ROCK_SIZE, WORLD.H - ROCK_SIZE);

    if (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < minFromPlayer) continue;

    let ok = true;
    for (const p of positions) {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < minFromRock) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    positions.push({ x, y });
    const rock = scene.add.rectangle(x, y, ROCK_SIZE, ROCK_SIZE, COLORS.rock);
    rock.setStrokeStyle(2, 0x1144aa, 0.9);
    scene.physics.add.existing(rock, true);
    scene.rocks.add(rock);
    placed += 1;
  }
}

export function placeWorldOrbs(scene: GameScene, avoidX: number, avoidY: number): void {
  const positions: { x: number; y: number }[] = [];
  let placed = 0;
  let guard = 0;

  while (placed < WORLD_ORB_COUNT && guard < WORLD_ORB_COUNT * 120) {
    guard += 1;
    const x = Phaser.Math.Between(50, WORLD.W - 50);
    const y = Phaser.Math.Between(50, WORLD.H - 50);

    if (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < WORLD_ORB_MIN_FROM_PLAYER) continue;

    let ok = true;
    for (const rock of scene.rocks.getChildren()) {
      const rg = rock as Phaser.GameObjects.Rectangle;
      if (Phaser.Math.Distance.Between(x, y, rg.x, rg.y) < ROCK_SIZE * 0.65 + 12) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    for (const p of positions) {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < WORLD_ORB_MIN_SPACING) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    positions.push({ x, y });
    spawnXpOrb(scene, x, y, 0, { worldPickup: true, tier: pickRandomOrbTier(), variance: true });
    placed += 1;
  }
}

export function placeWorldHearts(scene: GameScene, avoidX: number, avoidY: number): void {
  const positions: { x: number; y: number }[] = [];
  let placed = 0;
  let guard = 0;

  const minDistToAnyPickup = (x: number, y: number): number => {
    let min = Infinity;
    for (const child of scene.orbs.getChildren()) {
      const go = child as Phaser.GameObjects.Arc;
      if (!go.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, go.x, go.y);
      if (d < min) min = d;
    }
    return min;
  };

  while (placed < WORLD_HEART_COUNT && guard < WORLD_HEART_COUNT * 200) {
    guard += 1;
    const x = Phaser.Math.Between(50, WORLD.W - 50);
    const y = Phaser.Math.Between(50, WORLD.H - 50);

    if (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < WORLD_HEART_MIN_FROM_PLAYER) continue;

    let ok = true;
    for (const rock of scene.rocks.getChildren()) {
      const rg = rock as Phaser.GameObjects.Rectangle;
      if (Phaser.Math.Distance.Between(x, y, rg.x, rg.y) < ROCK_SIZE * 0.65 + 14) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    if (minDistToAnyPickup(x, y) < WORLD_HEART_MIN_SPACING) continue;

    for (const p of positions) {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < WORLD_HEART_MIN_SPACING) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    positions.push({ x, y });
    spawnHeartPickup(scene, x, y);
    placed += 1;
  }
}
