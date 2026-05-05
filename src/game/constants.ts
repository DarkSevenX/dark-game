/** Mundo lógico y ajustes de gameplay (un solo sitio para tunear). */

export const WORLD = {
  W: 6400,
  H: 4800,
} as const;

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
  heartFill: 0xf43f5e,
  heartStroke: 0x9f1239,
} as const;

/** XP y aspecto de orbes por categoría (mundo y loot). */
export const ORB_TIERS = {
  dim: {
    baseMin: 1,
    baseMax: 3,
    radius: 5,
    color: 0x94a3b8,
    strokeWorld: 0xd1d5db,
    strokeDrop: 0x9ca3af,
  },
  normal: {
    baseMin: 4,
    baseMax: 8,
    radius: 7,
    color: 0x7b68ee,
    strokeWorld: 0xc4b5fd,
    strokeDrop: 0xffffff,
  },
  rich: {
    baseMin: 10,
    baseMax: 18,
    radius: 10,
    color: 0xf59e0b,
    strokeWorld: 0xfcd34d,
    strokeDrop: 0xfef08a,
  },
} as const;

export type OrbTier = keyof typeof ORB_TIERS;

export const ROCK_COUNT = 120;
export const ROCK_SIZE = 52;
export const ENEMY_SPEED_BASE = 95;
export const BASE_SPAWN_SEC = 1.75;
export const BASE_ATTACK_RANGE = 110;
export const BASE_ATTACK_COOLDOWN_MS = 520;
export const BASE_PICKUP_RADIUS = 52;
export const BASE_ENEMY_CONTACT_DAMAGE = 13;
export const CONTACT_DAMAGE_INTERVAL_MS = 620;
export const INVULN_AFTER_HIT_MS = 520;
export const MAX_ENEMIES_ALIVE = 160;
export const WORLD_ORB_COUNT = 240;
export const WORLD_ORB_MIN_FROM_PLAYER = 240;
export const WORLD_ORB_MIN_SPACING = 38;

/** Corazones en el mapa (pocos) y botín; curación acotada al máx. de PV actuales. */
export const WORLD_HEART_COUNT = 12;
export const WORLD_HEART_MIN_FROM_PLAYER = 320;
export const WORLD_HEART_MIN_SPACING = 52;
/** Probabilidad por enemigo muerto de soltar un corazón además del orbe de XP. */
export const HEART_DROP_CHANCE = 0.034;
export const HEART_HEAL_MIN = 14;
export const HEART_HEAL_MAX = 26;
export const HEART_RADIUS = 8;

/** Encuadre de referencia para zoom de cámara. */
export const VIEW_REF = { W: 960, H: 540 } as const;

export type DevWeaponId = 'lightning' | 'projectile' | 'pierce' | 'orbit' | 'nova';

/**
 * Pruebas rápidas: armas extra al iniciar la escena (vacío en juego normal).
 */
export const DEV_START_WEAPONS: DevWeaponId[] = [];
