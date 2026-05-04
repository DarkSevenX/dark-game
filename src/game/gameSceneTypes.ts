import Phaser from 'phaser';
import type { EnemyId } from './data/enemies';

export interface PlayStats {
  hp: number;
  maxHp: number;
  moveSpeed: number;
  attackRange: number;
  attackCooldownMs: number;
  pickupRadius: number;
  damageTakenMult: number;
  xpGainMult: number;
  auraDamage: number;
  mana: number;
  maxMana: number;
}

export interface LightningWeaponState {
  interval: number;
  range: number;
  damage: number;
  nextAt: number;
}

export interface ProjectileWeaponState {
  interval: number;
  range: number;
  damage: number;
  speed: number;
  maxDist: number;
  nextAt: number;
}

export interface PierceWeaponState extends ProjectileWeaponState {
  pierceHits: number;
}

export interface OrbitWeaponState {
  bladeCount: number;
  radius: number;
  rotSpeed: number;
  damage: number;
  hitInterval: number;
  hitRadius: number;
  angle: number;
  nextHitAt: number;
}

export interface NovaWeaponState {
  interval: number;
  radius: number;
  damage: number;
  nextAt: number;
}

export interface HudLegendRow {
  key: EnemyId;
  sw: Phaser.GameObjects.Rectangle;
  tx: Phaser.GameObjects.Text;
}

/** Rectángulo/cuerpo arcade (jugador, enemigos, proyectiles). */
export type ArcadeRectBody = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

/** Escena de partida: estado compartido entre módulos `play/*`. */
export interface GameScene extends Phaser.Scene {
  runStartedAt: number;
  gameOver: boolean;
  finalSurvivalMs: number;
  pausedForLevelUp: boolean;
  nextContactDamageAt: number;
  invulnUntil: number;
  nextAttackAt: number;
  spawnTimer: Phaser.Time.TimerEvent | null;
  levelUpRoot: Phaser.GameObjects.Container | null;
  gameOverRoot: Phaser.GameObjects.Container | null;
  pauseRoot: Phaser.GameObjects.Container | null;
  pausedGame: boolean;
  killCount: number;
  playerKnock: { x: number; y: number };
  lightningWeapon: LightningWeaponState | null;
  projectileWeapon: ProjectileWeaponState | null;
  pierceWeapon: PierceWeaponState | null;
  orbitWeapon: OrbitWeaponState | null;
  novaWeapon: NovaWeaponState | null;
  orbitBlades: Phaser.GameObjects.Rectangle[];
  stats: PlayStats;
  level: number;
  xp: number;
  xpToNext: number;
  HUD_BAR_W: number;
  HUD_BAR_H: number;
  rocks: Phaser.Physics.Arcade.StaticGroup;
  player: ArcadeRectBody;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  orbs: Phaser.GameObjects.Group;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  keyRestart: Phaser.Input.Keyboard.Key;
  keyEsc: Phaser.Input.Keyboard.Key;
  attackGfx: Phaser.GameObjects.Graphics;
  lightningGfx: Phaser.GameObjects.Graphics;
  novaGfx: Phaser.GameObjects.Graphics;
  hudTimerCenter: Phaser.GameObjects.Text;
  hudLevel: Phaser.GameObjects.Text;
  hudKills: Phaser.GameObjects.Text;
  hudHpBg: Phaser.GameObjects.Rectangle;
  hudHpFill: Phaser.GameObjects.Rectangle;
  hudHpLabel: Phaser.GameObjects.Text;
  hudXpBg: Phaser.GameObjects.Rectangle;
  hudXpFill: Phaser.GameObjects.Rectangle;
  hudXpLabel: Phaser.GameObjects.Text;
  hudManaBg: Phaser.GameObjects.Rectangle;
  hudManaFill: Phaser.GameObjects.Rectangle;
  hudManaLabel: Phaser.GameObjects.Text;
  hudLegendEntries: HudLegendRow[];
  syncPlayerMaxVelocity(): void;
  scheduleNextSpawn(): void;
  applyLightningWeaponUpgrade(): void;
  applyProjectileWeaponUpgrade(): void;
  applyPierceWeaponUpgrade(): void;
  applyOrbitWeaponUpgrade(): void;
  applyNovaWeaponUpgrade(): void;
}
