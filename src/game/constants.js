/** Mundo lógico y ajustes de gameplay (un solo sitio para tunear). */

export const WORLD = {
  W: 4200,
  H: 3200,
};

export const COLORS = {
  bg: 0xb0b4bc,
  grid: 0x6d7078,
  player: 0x33ff66,
  rock: 0x2266cc,
  attackFlash: 0x88ffaa,
  orb: 0x7b68ee,
  hudText: '#1e293b',
  panelBg: 0x1e293b,
  hpBarFill: 0x22c55e,
  hpBarBg: 0x475569,
  xpBarFill: 0xa855f7,
  xpBarBg: 0x475569,
};

export const ROCK_COUNT = 55;
export const ROCK_SIZE = 52;
export const ENEMY_SPEED_BASE = 95;
export const BASE_SPAWN_SEC = 1.75;
export const BASE_ATTACK_RANGE = 110;
export const BASE_ATTACK_COOLDOWN_MS = 520;
export const BASE_PICKUP_RADIUS = 76;
export const BASE_ENEMY_CONTACT_DAMAGE = 13;
export const CONTACT_DAMAGE_INTERVAL_MS = 620;
export const INVULN_AFTER_HIT_MS = 520;
export const MAX_ENEMIES_ALIVE = 160;
export const WORLD_ORB_COUNT = 110;
export const WORLD_ORB_MIN_FROM_PLAYER = 240;
export const WORLD_ORB_MIN_SPACING = 38;

/** Encuadre de referencia para zoom de cámara. */
export const VIEW_REF = { W: 960, H: 540 };

/**
 * Pruebas rápidas: armas extra al iniciar la escena (vacío en juego normal).
 * Edita el array mientras desarrollas; vuelve a `[]` antes de un release.
 *
 * Valores: `'lightning'` (Arco voltaico), `'projectile'` (Dardos lúgubres).
 *
 * @example
 * export const DEV_START_WEAPONS = ['projectile'];
 * export const DEV_START_WEAPONS = ['lightning', 'projectile'];
 */
export const DEV_START_WEAPONS = /** @type {('lightning' | 'projectile')[]} */ ([]);
