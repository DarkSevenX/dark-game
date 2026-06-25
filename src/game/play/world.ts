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
  const bg = scene.add.rectangle(WORLD.W / 2, WORLD.H / 2, WORLD.W, WORLD.H, COLORS.bg);
  bg.setDepth(-10); // Ensure background is behind everything

  const map = scene.make.tilemap({ key: 'mapa' });
  const tilesetSuelo = map.addTilesetImage('suelo', 'suelo');
  const tilesetProps = map.addTilesetImage('props', 'props');
  const tilesetArboles = map.addTilesetImage('arboles', 'arboles');

  // Filter out any tilesets that failed to load to prevent crashes
  const tilesets: any[] = [tilesetSuelo, tilesetProps, tilesetArboles].filter(Boolean);

  const capa1 = map.createLayer('Capa de patrones 1', tilesets, 0, 0);
  const capa2 = map.createLayer('arboles', tilesets, 0, 0);
  
  if (capa1) capa1.setDepth(-2);
  if (capa2) capa2.setDepth(-1);

  const objectLayer = map.getObjectLayer('Capa de Objetos 1');
  if (objectLayer && objectLayer.objects) {
    objectLayer.objects.forEach(obj => {
      const w = obj.width || 32;
      const h = obj.height || 32;
      const cx = (obj.x || 0) + w / 2;
      const cy = (obj.y || 0) + h / 2;
      
      const rect = scene.add.rectangle(cx, cy, w, h); // No color = invisible
      scene.physics.add.existing(rect, true); // true = static body
      scene.rocks.add(rect);
    });
  }
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
