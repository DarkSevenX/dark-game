import { WORLD, VIEW_REF } from '../constants';
import type { GameScene } from '../gameSceneTypes';

/** Métricas para colocar HUD / modales en espacio mundo acorde al zoom y al encuadre actual. */
export interface CameraViewLayout {
  worldViewX: number;
  worldViewY: number;
  viewW: number;
  viewH: number;
  midX: number;
  midY: number;
  zoomX: number;
  zoomY: number;
  /** Píxel de pantalla desde el borde izquierdo del encuadre → coordenada X en mundo. */
  padX: (screenPxFromLeft: number) => number;
  /** Píxel de pantalla desde el borde superior del encuadre → coordenada Y en mundo. */
  padY: (screenPxFromTop: number) => number;
}

export function getCameraViewLayout(scene: GameScene): CameraViewLayout {
  const cam = scene.cameras.main;
  const wv = cam.worldView;
  const zx = cam.zoomX;
  const zy = cam.zoomY;
  return {
    worldViewX: wv.x,
    worldViewY: wv.y,
    viewW: wv.width,
    viewH: wv.height,
    midX: cam.midPoint.x,
    midY: cam.midPoint.y,
    zoomX: zx,
    zoomY: zy,
    padX: (px) => wv.x + px / zx,
    padY: (py) => wv.y + py / zy,
  };
}

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
