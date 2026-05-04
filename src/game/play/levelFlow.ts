import type { GameScene } from '../gameSceneTypes';
import { xpForLevel } from '../utils/xp';

/**
 * Descuenta XP y sube un nivel si hay suficiente acumulado.
 * No abre UI; el llamador decide si mostrar el menú de mejoras.
 */
export function consumeLevel(scene: GameScene): boolean {
  if (scene.gameOver || scene.pausedForLevelUp) return false;
  if (scene.xp < scene.xpToNext) return false;
  scene.xp -= scene.xpToNext;
  scene.level += 1;
  scene.xpToNext = xpForLevel(scene.level);
  return true;
}
