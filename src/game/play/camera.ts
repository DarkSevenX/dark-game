import { WORLD, VIEW_REF } from '../constants';
import type { GameScene } from '../gameSceneTypes';

export function applyViewZoom(scene: GameScene, gameSize?: { width: number; height: number }): void {
  const w = gameSize?.width ?? scene.scale.width;
  const h = gameSize?.height ?? scene.scale.height;
  if (!w || !h || w < 2 || h < 2) return;

  scene.cameras.resize(w, h);

  const z = Math.min(w / VIEW_REF.W, h / VIEW_REF.H);
  if (!Number.isFinite(z) || z <= 0) return;

  const cam = scene.cameras.main;
  cam.setZoom(z);
  cam.setBounds(0, 0, WORLD.W, WORLD.H);

  if (scene.player && scene.player.body) {
    cam.startFollow(scene.player, true, 0.12, 0.12);
  }
}

export function onGameResize(scene: GameScene, gameSize: { width: number; height: number }): void {
  applyViewZoom(scene, gameSize);
}
