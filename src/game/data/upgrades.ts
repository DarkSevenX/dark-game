import type { GameScene } from '../gameSceneTypes';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface LevelUpPick {
  id: string;
  name: string;
  desc: string;
  apply: (scene: GameScene) => void;
}

export const UPGRADE_POOL: LevelUpPick[] = [
  {
    id: 'vitality',
    name: 'Vitalidad',
    desc: '+28 PV máx. Cura 14 PV al instante.',
    apply: (scene) => {
      scene.stats.maxHp += 28;
      scene.stats.hp = Math.min(scene.stats.hp + 14, scene.stats.maxHp);
    },
  },
  {
    id: 'swift',
    name: 'Botas ligeras',
    desc: '+11% velocidad de movimiento.',
    apply: (scene) => {
      scene.stats.moveSpeed *= 1.11;
    },
  },
  {
    id: 'reach',
    name: 'Alcance del vacío',
    desc: '+32 px de radio del aura automática.',
    apply: (scene) => {
      scene.stats.attackRange += 32;
    },
  },
  {
    id: 'fury',
    name: 'Metrónomo cruel',
    desc: '-14% tiempo entre pulsos del aura (mín. 200 ms).',
    apply: (scene) => {
      scene.stats.attackCooldownMs = Math.max(200, scene.stats.attackCooldownMs * 0.86);
    },
  },
  {
    id: 'magnet',
    name: 'Imán etéreo',
    desc: '+62 px de radio para atraer esencias.',
    apply: (scene) => {
      scene.stats.pickupRadius += 62;
    },
  },
  {
    id: 'bulwark',
    name: 'Piel de piedra',
    desc: 'Recibes 14% menos daño por contacto.',
    apply: (scene) => {
      scene.stats.damageTakenMult *= 0.86;
    },
  },
  {
    id: 'essence',
    name: 'Hambre de conocimiento',
    desc: '+40% experiencia ganada por orbe.',
    apply: (scene) => {
      scene.stats.xpGainMult *= 1.4;
    },
  },
  {
    id: 'second_wind',
    name: 'Segundo aire',
    desc: '+22 PV máx. +7% velocidad. Cura 8 PV.',
    apply: (scene) => {
      scene.stats.maxHp += 22;
      scene.stats.hp = Math.min(scene.stats.hp + 8, scene.stats.maxHp);
      scene.stats.moveSpeed *= 1.07;
    },
  },
];

export const WEAPON_POOL: LevelUpPick[] = [
  {
    id: 'weapon_lightning',
    name: 'Arco voltaico',
    desc:
      'Dispara un rayo al enemigo vivo más cercano dentro del alcance, de uno en uno. Si ya lo tienes, sube daño y cadencia.',
    apply: (scene) => {
      scene.applyLightningWeaponUpgrade();
    },
  },
  {
    id: 'weapon_projectile',
    name: 'Dardos lúgubres',
    desc:
      'Cada cierto tiempo lanza un proyectil hacia el enemigo más cercano; vuela en línea recta hasta impactar, roca o límite. Mejoras sucesivas suben daño, velocidad y cadencia.',
    apply: (scene) => {
      scene.applyProjectileWeaponUpgrade();
    },
  },
  {
    id: 'weapon_pierce',
    name: 'Carrete perforante',
    desc:
      'Lanza una saeta que atraviesa a varios enemigos en línea (no atraviesa rocas). Mejoras suman blancos atravesados y daño.',
    apply: (scene) => {
      scene.applyPierceWeaponUpgrade();
    },
  },
  {
    id: 'weapon_orbit',
    name: 'Vértigos certeros',
    desc:
      'Hojas orbitales que cortan cada poco tiempo. Mejoras suben daño, radio o añaden una hoja (máx. 5).',
    apply: (scene) => {
      scene.applyOrbitWeaponUpgrade();
    },
  },
  {
    id: 'weapon_nova',
    name: 'Pulsación abisal',
    desc:
      'Onda de choque cada pocos segundos: daña a todos los enemigos en un radio amplio. Mejoras bajan intervalo y suben daño y alcance.',
    apply: (scene) => {
      scene.applyNovaWeaponUpgrade();
    },
  },
];

const LEVEL_UP_POOL: LevelUpPick[] = [...UPGRADE_POOL, ...WEAPON_POOL];

export function pickThreeUpgrades(): LevelUpPick[] {
  const full = shuffle([...LEVEL_UP_POOL]);
  const out: LevelUpPick[] = [];
  const seen = new Set<string>();
  for (const item of full) {
    if (out.length >= 3) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  let guard = 0;
  while (out.length < 3 && guard < 50) {
    guard += 1;
    const pick = LEVEL_UP_POOL[Math.floor(Math.random() * LEVEL_UP_POOL.length)]!;
    if (seen.has(pick.id)) continue;
    seen.add(pick.id);
    out.push(pick);
  }
  return out;
}
