import { LEVEL_UP_MANA_FILL_RATIO } from '../constants';
import type { GameScene } from '../gameSceneTypes';

/** Maná ganado al rechazar las tres cartas de subida de nivel. */
export function grantRejectManaReward(scene: GameScene): void {
  const gain = scene.stats.maxMana * LEVEL_UP_MANA_FILL_RATIO;
  scene.stats.mana = Math.min(scene.stats.maxMana, scene.stats.mana + gain);
}
