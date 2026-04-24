/** Tipos de enemigo (placeholder hasta sprites). */

export const ENEMY_DEFS = {
  stalker: {
    id: 'stalker',
    label: 'Acechador',
    size: 30,
    maxHp: 1,
    speedMult: 1,
    contactDamage: 13,
    auraKnockMult: 1,
    playerKnockMult: 1,
    color: 0xdd2222,
    stroke: 0x880000,
    xpBonus: 0,
  },
  runner: {
    id: 'runner',
    label: 'Corredor',
    size: 26,
    maxHp: 1,
    speedMult: 1.38,
    contactDamage: 9,
    auraKnockMult: 1.25,
    playerKnockMult: 0.75,
    color: 0xff5522,
    stroke: 0xaa2200,
    xpBonus: 1,
  },
  brute: {
    id: 'brute',
    label: 'Bruto',
    size: 38,
    maxHp: 14,
    speedMult: 0.7,
    contactDamage: 19,
    auraKnockMult: 0.55,
    playerKnockMult: 1.35,
    color: 0x6b0f0f,
    stroke: 0x3d0808,
    xpBonus: 4,
  },
  swarm: {
    id: 'swarm',
    label: 'Turba',
    size: 22,
    maxHp: 1,
    speedMult: 1.52,
    contactDamage: 7,
    auraKnockMult: 1.35,
    playerKnockMult: 0.55,
    color: 0xd4af37,
    stroke: 0x8b6914,
    xpBonus: 2,
  },
  warden: {
    id: 'warden',
    label: 'Celador',
    size: 40,
    maxHp: 28,
    speedMult: 0.52,
    contactDamage: 22,
    auraKnockMult: 0.45,
    playerKnockMult: 1.55,
    color: 0x5b21b6,
    stroke: 0x3b0764,
    xpBonus: 8,
  },
};

/** Segundos de partida → desbloqueo de tipos. */
export const ENEMY_UNLOCK_SEC = {
  runner: 45,
  brute: 90,
  swarm: 180,
  warden: 300,
};

export const ENEMY_LEGEND_ORDER = ['stalker', 'runner', 'brute', 'swarm', 'warden'];
