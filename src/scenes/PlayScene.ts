import Phaser from 'phaser';
import {
  WORLD,
  COLORS,
  BASE_ATTACK_RANGE,
  BASE_ATTACK_COOLDOWN_MS,
  BASE_PICKUP_RADIUS,
  ENEMY_SPEED_BASE,
} from '../game/constants';
import { xpForLevel } from '../game/utils/xp';
import { applyViewZoom, onGameResize } from '../game/play/camera';
import { createPlayHud, updatePlayHud, bindHudLayoutToCameraFollow } from '../game/play/hud';
import { createWorldBackground, placeRocks, placeWorldOrbs, placeWorldHearts } from '../game/play/world';
import {
  scheduleNextSpawn as armSpawnTimer,
  spawnEnemy,
  getEnemySpeedMult,
} from '../game/play/spawn';
import {
  applyDevStartWeapons,
  onProjectileHitEnemy,
  tickProjectileWeapon,
  tickPierceWeapon,
  cullProjectiles,
  tickLightningWeapon,
  tickOrbitWeapon,
  tickNovaWeapon,
  applyLightningWeaponUpgrade as applyLightningToScene,
  applyProjectileWeaponUpgrade as applyProjectileToScene,
  applyPierceWeaponUpgrade as applyPierceToScene,
  applyOrbitWeaponUpgrade as applyOrbitToScene,
  applyNovaWeaponUpgrade as applyNovaToScene,
} from '../game/play/weapons';
import { collectOrbs } from '../game/play/xp';
import { autoAttack, onEnemyTouchingPlayer } from '../game/play/combat';
import { togglePause } from '../game/play/modals';
import { readControlMode, type ControlMode } from '../game/controlMode';
import type { GameScene, ArcadeRectBody } from '../game/gameSceneTypes';

export class PlayScene extends Phaser.Scene implements GameScene {
  runStartedAt!: number;
  gameOver!: boolean;
  finalSurvivalMs!: number;
  pausedForLevelUp!: boolean;
  nextContactDamageAt!: number;
  invulnUntil!: number;
  nextAttackAt!: number;
  spawnTimer!: Phaser.Time.TimerEvent | null;
  levelUpRoot!: Phaser.GameObjects.Container | null;
  gameOverRoot!: Phaser.GameObjects.Container | null;
  pauseRoot!: Phaser.GameObjects.Container | null;
  pausedGame!: boolean;
  killCount!: number;
  playerKnock!: { x: number; y: number };
  lightningWeapon!: GameScene['lightningWeapon'];
  projectileWeapon!: GameScene['projectileWeapon'];
  pierceWeapon!: GameScene['pierceWeapon'];
  orbitWeapon!: GameScene['orbitWeapon'];
  novaWeapon!: GameScene['novaWeapon'];
  orbitBlades!: Phaser.GameObjects.Rectangle[];
  stats!: GameScene['stats'];
  level!: number;
  xp!: number;
  xpToNext!: number;
  HUD_BAR_W!: number;
  HUD_BAR_H!: number;
  rocks!: Phaser.Physics.Arcade.StaticGroup;
  player!: GameScene['player'];
  enemies!: Phaser.Physics.Arcade.Group;
  projectiles!: Phaser.Physics.Arcade.Group;
  orbs!: Phaser.GameObjects.Group;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: GameScene['wasd'];
  keyRestart!: Phaser.Input.Keyboard.Key;
  keyEsc!: Phaser.Input.Keyboard.Key;
  attackGfx!: Phaser.GameObjects.Graphics;
  lightningGfx!: Phaser.GameObjects.Graphics;
  novaGfx!: Phaser.GameObjects.Graphics;
  hudTimerCenter!: Phaser.GameObjects.Text;
  hudLevel!: Phaser.GameObjects.Text;
  hudKills!: Phaser.GameObjects.Text;
  hudHpBg!: Phaser.GameObjects.Rectangle;
  hudHpFill!: Phaser.GameObjects.Rectangle;
  hudHpLabel!: Phaser.GameObjects.Text;
  hudXpBg!: Phaser.GameObjects.Rectangle;
  hudXpFill!: Phaser.GameObjects.Rectangle;
  hudXpLabel!: Phaser.GameObjects.Text;
  hudLegendEntries!: GameScene['hudLegendEntries'];
  controlMode!: ControlMode;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    this.controlMode = readControlMode(this);
    this.runStartedAt = this.time.now;
    this.gameOver = false;
    this.finalSurvivalMs = 0;
    this.pausedForLevelUp = false;
    this.nextContactDamageAt = 0;
    this.invulnUntil = 0;
    this.nextAttackAt = 0;
    this.spawnTimer = null;
    this.levelUpRoot = null;
    this.gameOverRoot = null;
    this.pauseRoot = null;
    this.pausedGame = false;
    this.killCount = 0;
    this.playerKnock = { x: 0, y: 0 };
    this.lightningWeapon = null;
    this.projectileWeapon = null;
    this.pierceWeapon = null;
    this.orbitWeapon = null;
    this.novaWeapon = null;
    this.orbitBlades = [];

    this.stats = {
      hp: 100,
      maxHp: 100,
      moveSpeed: 220,
      attackRange: BASE_ATTACK_RANGE,
      attackCooldownMs: BASE_ATTACK_COOLDOWN_MS,
      pickupRadius: BASE_PICKUP_RADIUS,
      damageTakenMult: 1,
      xpGainMult: 1,
      auraDamage: 11,
    };

    this.level = 1;
    this.xp = 0;
    this.xpToNext = xpForLevel(this.level);

    this.HUD_BAR_W = 210;
    this.HUD_BAR_H = 11;

    this.physics.world.setBounds(0, 0, WORLD.W, WORLD.H);

    createWorldBackground(this);

    this.rocks = this.physics.add.staticGroup();

    const startX = WORLD.W / 2;
    const startY = WORLD.H / 2;
    placeRocks(this, startX, startY);

    const boxSize = 36;
    const rect = this.add.rectangle(startX, startY, boxSize, boxSize, COLORS.player) as ArcadeRectBody;
    this.physics.add.existing(rect);
    this.player = rect;
    this.player.body.setCollideWorldBounds(true);
    this.syncPlayerMaxVelocity();

    this.physics.add.collider(this.player, this.rocks);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, this.rocks);

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_p, enemy) =>
        onEnemyTouchingPlayer(this, enemy as ArcadeRectBody),
      undefined,
      this,
    );

    this.projectiles = this.physics.add.group();
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (proj, enemy) =>
        onProjectileHitEnemy(
          this,
          proj as ArcadeRectBody,
          enemy as ArcadeRectBody,
        ),
      undefined,
      this,
    );
    this.physics.add.collider(this.projectiles, this.rocks, (proj) => {
      const p = proj as ArcadeRectBody;
      if (p.active) p.destroy();
    });

    applyDevStartWeapons(this);

    this.orbs = this.add.group();
    placeWorldOrbs(this, startX, startY);
    placeWorldHearts(this, startX, startY);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as GameScene['wasd'];
    this.keyRestart = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.attackGfx = this.add.graphics();
    this.attackGfx.setDepth(5);
    this.lightningGfx = this.add.graphics();
    this.lightningGfx.setDepth(6);
    this.novaGfx = this.add.graphics();
    this.novaGfx.setDepth(5);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.W, WORLD.H);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, 0.12, 0.12);
    applyViewZoom(this);
    this.scale.on('resize', this._onGameResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this._onGameResize, this);
      if (this.pauseRoot) {
        this.pauseRoot.destroy(true);
        this.pauseRoot = null;
      }
    });

    createPlayHud(this);
    bindHudLayoutToCameraFollow(this);
    armSpawnTimer(this);
    spawnEnemy(this);
  }

  private _onGameResize = (gameSize: Phaser.Structs.Size): void => {
    onGameResize(this, { width: gameSize.width, height: gameSize.height });
  };

  syncPlayerMaxVelocity(): void {
    const v = this.stats.moveSpeed;
    this.player.body.setMaxVelocity(v, v);
  }

  scheduleNextSpawn(): void {
    armSpawnTimer(this);
  }

  applyLightningWeaponUpgrade(): void {
    applyLightningToScene(this);
  }

  applyProjectileWeaponUpgrade(): void {
    applyProjectileToScene(this);
  }

  applyPierceWeaponUpgrade(): void {
    applyPierceToScene(this);
  }

  applyOrbitWeaponUpgrade(): void {
    applyOrbitToScene(this);
  }

  applyNovaWeaponUpgrade(): void {
    applyNovaToScene(this);
  }

  update(time: number, _delta: number): void {
    updatePlayHud(this);

    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.keyRestart)) {
        this.scene.restart();
      }
      return;
    }

    if (this.pausedForLevelUp) return;

    if (this.pausedGame) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        togglePause(this);
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      togglePause(this);
    }

    autoAttack(this, time);
    tickLightningWeapon(this, time);
    tickProjectileWeapon(this, time);
    tickPierceWeapon(this, time);
    tickOrbitWeapon(this, time);
    tickNovaWeapon(this, time);
    cullProjectiles(this);
    collectOrbs(this);

    const body = this.player.body;
    const spd = this.stats.moveSpeed;

    if (this.controlMode === 'mouse') {
      const pointer = this.input.activePointer;
      if (pointer) {
        const cam = this.cameras.main;
        const target = cam.getWorldPoint(pointer.x, pointer.y);
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const len = Math.hypot(dx, dy);
        if (len > 8) {
          body.setVelocity((dx / len) * spd, (dy / len) * spd);
        } else {
          body.setVelocity(0, 0);
        }
      } else {
        body.setVelocity(0, 0);
      }
    } else {
      body.setVelocity(0);

      const left = this.cursors.left.isDown || this.wasd.left.isDown;
      const right = this.cursors.right.isDown || this.wasd.right.isDown;
      const up = this.cursors.up.isDown || this.wasd.up.isDown;
      const down = this.cursors.down.isDown || this.wasd.down.isDown;

      if (left) body.setVelocityX(-spd);
      else if (right) body.setVelocityX(spd);

      if (up) body.setVelocityY(-spd);
      else if (down) body.setVelocityY(spd);

      if (left && right) body.setVelocityX(0);
      if (up && down) body.setVelocityY(0);

      if (body.velocity.lengthSq() > 0) {
        body.velocity.normalize().scale(spd);
      }
    }

    body.velocity.x += this.playerKnock.x;
    body.velocity.y += this.playerKnock.y;
    this.playerKnock.x *= 0.82;
    this.playerKnock.y *= 0.82;

    const espBase = ENEMY_SPEED_BASE * getEnemySpeedMult(this);
    const enemyList = this.enemies.getChildren() as ArcadeRectBody[];
    for (const enemy of enemyList) {
      if (!enemy.body) continue;
      const sm = (enemy.getData('speedMult') as number | undefined) ?? 1;
      let kbX = (enemy.getData('kbX') as number | undefined) || 0;
      let kbY = (enemy.getData('kbY') as number | undefined) || 0;
      kbX *= 0.88;
      kbY *= 0.88;
      enemy.setData('kbX', kbX);
      enemy.setData('kbY', kbY);

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const esp = espBase * sm;
      const vx = Math.cos(angle) * esp + kbX;
      const vy = Math.sin(angle) * esp + kbY;
      enemy.body.setVelocity(vx, vy);
    }
  }
}
