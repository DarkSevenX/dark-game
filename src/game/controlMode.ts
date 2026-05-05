/** Cómo se mueve el jugador; se guarda en `scene.registry` antes de iniciar la partida. */

import type Phaser from 'phaser';

export type ControlMode = 'keyboard' | 'mouse';

export const CONTROL_MODE_REGISTRY_KEY = 'controlMode';

export function readControlMode(scene: Phaser.Scene): ControlMode {
  const v = scene.registry.get(CONTROL_MODE_REGISTRY_KEY) as ControlMode | undefined;
  return v === 'mouse' ? 'mouse' : 'keyboard';
}
