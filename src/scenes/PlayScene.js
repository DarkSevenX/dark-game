import Phaser from 'phaser';
import {
  WORLD,
  COLORS,
  ROCK_COUNT,
  ROCK_SIZE,
  ENEMY_SPEED_BASE,
  BASE_SPAWN_SEC,
  BASE_ATTACK_RANGE,
  BASE_ATTACK_COOLDOWN_MS,
  BASE_PICKUP_RADIUS,
  BASE_ENEMY_CONTACT_DAMAGE,
  CONTACT_DAMAGE_INTERVAL_MS,
  INVULN_AFTER_HIT_MS,
  MAX_ENEMIES_ALIVE,
  WORLD_ORB_COUNT,
  WORLD_ORB_MIN_FROM_PLAYER,
  WORLD_ORB_MIN_SPACING,
  VIEW_REF,
  DEV_START_WEAPONS,
} from '../game/constants.js';
import { ENEMY_DEFS, ENEMY_LEGEND_ORDER } from '../game/data/enemies.js';
import { pickThreeUpgrades } from '../game/data/upgrades.js';
import { formatSurvivalTime } from '../game/utils/format.js';
import { xpForLevel } from '../game/utils/xp.js';
import { getUnlockedEnemyKeys, pickEnemyTypeForSpawn } from '../game/enemySpawn.js';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  create() {
    this.runStartedAt = this.time.now;
    this.gameOver = false;
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
    /** @type {{ interval: number; range: number; damage: number; nextAt: number } | null} */
    this.lightningWeapon = null;
    /** @type {{ interval: number; range: number; damage: number; speed: number; maxDist: number; nextAt: number } | null} */
    this.projectileWeapon = null;

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

    this.add.rectangle(WORLD.W / 2, WORLD.H / 2, WORLD.W, WORLD.H, COLORS.bg);

    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.grid, 0.55);
    const step = 48;
    for (let x = 0; x <= WORLD.W; x += step) {
      grid.lineBetween(x, 0, x, WORLD.H);
    }
    for (let y = 0; y <= WORLD.H; y += step) {
      grid.lineBetween(0, y, WORLD.W, y);
    }
    grid.setDepth(-2);

    this.rocks = this.physics.add.staticGroup();

    const startX = WORLD.W / 2;
    const startY = WORLD.H / 2;
    this.placeRocks(startX, startY);

    const boxSize = 36;
    this.player = this.add.rectangle(startX, startY, boxSize, boxSize, COLORS.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.syncPlayerMaxVelocity();

    this.physics.add.collider(this.player, this.rocks);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, this.rocks);

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_p, enemy) => this.onEnemyTouchingPlayer(enemy),
      undefined,
      this,
    );

    this.projectiles = this.physics.add.group();
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (proj, enemy) => this.onProjectileHitEnemy(proj, enemy),
      undefined,
      this,
    );
    this.physics.add.collider(this.projectiles, this.rocks, (proj) => {
      if (proj.active) proj.destroy();
    });

    this.applyDevStartWeapons();

    this.orbs = this.add.group();
    this.placeWorldOrbs(startX, startY);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.keyRestart = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.attackGfx = this.add.graphics();
    this.attackGfx.setDepth(5);
    this.lightningGfx = this.add.graphics();
    this.lightningGfx.setDepth(6);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.W, WORLD.H);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyViewZoom();
    this.scale.on('resize', this.onGameResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onGameResize, this);
      if (this.pauseRoot) {
        this.pauseRoot.destroy(true);
        this.pauseRoot = null;
      }
    });

    this.createHud();
    this.scheduleNextSpawn();
    this.spawnEnemy();
  }

  syncPlayerMaxVelocity() {
    const v = this.stats.moveSpeed;
    this.player.body.setMaxVelocity(v, v);
  }

  createHud() {
    const font = 'system-ui, sans-serif';
    const depth = 3000;

    this.hudTimerCenter = this.add
      .text(this.scale.width / 2, 12, '0:00', {
        fontFamily: font,
        fontSize: '26px',
        color: COLORS.hudText,
        fontStyle: '800',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    this.hudLevel = this.add
      .text(16, 14, '', {
        fontFamily: font,
        fontSize: '15px',
        color: COLORS.hudText,
        fontStyle: '600',
      })
      .setScrollFactor(0)
      .setDepth(depth);

    this.hudKills = this.add
      .text(0, 14, '', {
        fontFamily: font,
        fontSize: '15px',
        color: COLORS.hudText,
        fontStyle: '600',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    const barY0 = 52;
    this.hudHpBg = this.add
      .rectangle(16 + this.HUD_BAR_W / 2, barY0, this.HUD_BAR_W, this.HUD_BAR_H, COLORS.hpBarBg, 1)
      .setStrokeStyle(1, 0x334155)
      .setScrollFactor(0)
      .setDepth(depth);

    this.hudHpFill = this.add
      .rectangle(16, barY0, this.HUD_BAR_W, this.HUD_BAR_H, COLORS.hpBarFill, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.hudHpLabel = this.add
      .text(16 + this.HUD_BAR_W + 8, barY0, '', {
        fontFamily: font,
        fontSize: '13px',
        color: COLORS.hudText,
        fontStyle: '600',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);

    const barY1 = 74;
    this.hudXpBg = this.add
      .rectangle(16 + this.HUD_BAR_W / 2, barY1, this.HUD_BAR_W, this.HUD_BAR_H, COLORS.xpBarBg, 1)
      .setStrokeStyle(1, 0x334155)
      .setScrollFactor(0)
      .setDepth(depth);

    this.hudXpFill = this.add
      .rectangle(16, barY1, this.HUD_BAR_W, this.HUD_BAR_H, COLORS.xpBarFill, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    this.hudXpLabel = this.add
      .text(16 + this.HUD_BAR_W + 8, barY1, '', {
        fontFamily: font,
        fontSize: '12px',
        color: COLORS.hudText,
        fontStyle: '500',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);

    this.createEnemyLegend(font, depth);
  }

  createEnemyLegend(font, depth) {
    let y = 98;
    this.hudLegendEntries = [];
    for (const key of ENEMY_LEGEND_ORDER) {
      const d = ENEMY_DEFS[key];
      const sw = this.add
        .rectangle(22, y, 10, 10, d.color, 1)
        .setStrokeStyle(1, d.stroke)
        .setScrollFactor(0)
        .setDepth(depth);
      const tx = this.add
        .text(34, y, d.label, {
          fontFamily: font,
          fontSize: '11px',
          color: COLORS.hudText,
          fontStyle: '500',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(depth);
      this.hudLegendEntries.push({ key, sw, tx });
      y += 16;
    }
  }

  updateLegendUnlocks(elapsedSec) {
    if (!this.hudLegendEntries) return;
    const unlocked = new Set(getUnlockedEnemyKeys(elapsedSec));
    for (const row of this.hudLegendEntries) {
      const ok = unlocked.has(row.key);
      row.sw.setAlpha(ok ? 1 : 0.38);
      row.tx.setAlpha(ok ? 1 : 0.38);
      const label = ENEMY_DEFS[row.key].label;
      row.tx.setText(ok ? label : `${label}  ···`);
    }
  }

  updateHud() {
    if (!this.hudTimerCenter) return;

    const elapsed = this.gameOver ? this.finalSurvivalMs : this.time.now - this.runStartedAt;
    const timeStr = formatSurvivalTime(elapsed);
    this.hudTimerCenter.setText(timeStr);
    this.hudTimerCenter.setX(this.scale.width / 2);

    this.hudLevel.setText(`Nivel  ${this.level}`);
    this.hudKills.setText(`Bajas  ${this.killCount}`);
    this.hudKills.setX(this.scale.width - 16);

    this.updateLegendUnlocks(elapsed / 1000);

    const hpR = this.stats.maxHp > 0 ? Phaser.Math.Clamp(this.stats.hp / this.stats.maxHp, 0, 1) : 0;
    this.hudHpFill.setSize(this.HUD_BAR_W * hpR, this.HUD_BAR_H);
    this.hudHpLabel.setText(`${Math.ceil(this.stats.hp)} / ${this.stats.maxHp}`);

    const xpR = this.xpToNext > 0 ? Phaser.Math.Clamp(this.xp / this.xpToNext, 0, 1) : 0;
    this.hudXpFill.setSize(this.HUD_BAR_W * xpR, this.HUD_BAR_H);
    this.hudXpLabel.setText(`XP  ${Math.floor(this.xp)} / ${this.xpToNext}`);
  }

  applyPlayerKnockback(enemy) {
    const mult = enemy.getData('playerKnockMult') ?? 1;
    const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const f = 195 * mult;
    this.playerKnock.x += Math.cos(ang) * f;
    this.playerKnock.y += Math.sin(ang) * f;
    const cap = 380;
    const len = Math.hypot(this.playerKnock.x, this.playerKnock.y);
    if (len > cap) {
      this.playerKnock.x = (this.playerKnock.x / len) * cap;
      this.playerKnock.y = (this.playerKnock.y / len) * cap;
    }
  }

  scheduleNextSpawn() {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }
    if (this.gameOver || this.pausedForLevelUp || this.pausedGame) return;

    const elapsedMin = (this.time.now - this.runStartedAt) / 60000;
    const freqMult = 1 + elapsedMin * 0.42;
    const delayMs = Math.max(380, (BASE_SPAWN_SEC * 1000) / freqMult);

    this.spawnTimer = this.time.delayedCall(delayMs, () => {
      if (this.gameOver || this.pausedForLevelUp || this.pausedGame) return;

      const n = this.enemies.countActive(true);
      const burst = 1 + Math.min(4, Math.floor(elapsedMin * 0.55));
      for (let i = 0; i < burst && n + i < MAX_ENEMIES_ALIVE; i++) {
        if (i === 0) this.spawnEnemy();
        else this.time.delayedCall(i * 70, () => this.spawnEnemy());
      }
      this.scheduleNextSpawn();
    });
  }

  getEnemySpeedMult() {
    const elapsedMin = (this.time.now - this.runStartedAt) / 60000;
    return Math.min(2.35, 1 + elapsedMin * 0.2);
  }

  onGameResize(gameSize) {
    this.applyViewZoom(gameSize);
  }

  applyViewZoom(gameSize) {
    const w = gameSize?.width ?? this.scale.width;
    const h = gameSize?.height ?? this.scale.height;
    if (!w || !h || w < 2 || h < 2) return;

    this.cameras.resize(w, h);

    const z = Math.min(w / VIEW_REF.W, h / VIEW_REF.H);
    if (!Number.isFinite(z) || z <= 0) return;

    const cam = this.cameras.main;
    cam.setZoom(z);
    cam.setBounds(0, 0, WORLD.W, WORLD.H);

    if (this.player && this.player.body) {
      cam.startFollow(this.player, true, 0.12, 0.12);
    }
  }

  placeRocks(avoidX, avoidY) {
    const minFromPlayer = 120;
    const minFromRock = ROCK_SIZE + 8;
    let placed = 0;
    let guard = 0;
    const positions = [];

    while (placed < ROCK_COUNT && guard < ROCK_COUNT * 80) {
      guard += 1;
      const x = Phaser.Math.Between(ROCK_SIZE, WORLD.W - ROCK_SIZE);
      const y = Phaser.Math.Between(ROCK_SIZE, WORLD.H - ROCK_SIZE);

      if (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < minFromPlayer) continue;

      let ok = true;
      for (const p of positions) {
        if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < minFromRock) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      positions.push({ x, y });
      const rock = this.add.rectangle(x, y, ROCK_SIZE, ROCK_SIZE, COLORS.rock);
      rock.setStrokeStyle(2, 0x1144aa, 0.9);
      this.physics.add.existing(rock, true);
      this.rocks.add(rock);
      placed += 1;
    }
  }

  spawnEnemy() {
    if (this.gameOver || this.pausedForLevelUp || this.pausedGame) return;
    if (this.enemies.countActive(true) >= MAX_ENEMIES_ALIVE) return;

    const elapsedSec = (this.time.now - this.runStartedAt) / 1000;
    const typeKey = pickEnemyTypeForSpawn(elapsedSec);
    const def = ENEMY_DEFS[typeKey];
    const size = def.size;

    const margin = size;
    let x;
    let y;
    let tries = 0;
    do {
      tries += 1;
      const edge = Phaser.Math.Between(0, 3);
      if (edge === 0) {
        x = Phaser.Math.Between(margin, WORLD.W - margin);
        y = margin;
      } else if (edge === 1) {
        x = WORLD.W - margin;
        y = Phaser.Math.Between(margin, WORLD.H - margin);
      } else if (edge === 2) {
        x = Phaser.Math.Between(margin, WORLD.W - margin);
        y = WORLD.H - margin;
      } else {
        x = margin;
        y = Phaser.Math.Between(margin, WORLD.H - margin);
      }
    } while (
      tries < 60 &&
      Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 420
    );

    const enemy = this.add.rectangle(x, y, size, size, def.color);
    enemy.setStrokeStyle(1, def.stroke, 0.9);
    this.physics.add.existing(enemy);
    enemy.setData('etype', typeKey);
    enemy.setData('hp', def.maxHp);
    enemy.setData('maxHp', def.maxHp);
    enemy.setData('speedMult', def.speedMult);
    enemy.setData('contactDamage', def.contactDamage);
    enemy.setData('auraKnockMult', def.auraKnockMult);
    enemy.setData('playerKnockMult', def.playerKnockMult);
    enemy.setData('xpBonus', def.xpBonus);
    this.enemies.add(enemy);
  }

  placeWorldOrbs(avoidX, avoidY) {
    const positions = [];
    let placed = 0;
    let guard = 0;

    while (placed < WORLD_ORB_COUNT && guard < WORLD_ORB_COUNT * 120) {
      guard += 1;
      const x = Phaser.Math.Between(50, WORLD.W - 50);
      const y = Phaser.Math.Between(50, WORLD.H - 50);

      if (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < WORLD_ORB_MIN_FROM_PLAYER) continue;

      let ok = true;
      for (const rock of this.rocks.getChildren()) {
        if (Phaser.Math.Distance.Between(x, y, rock.x, rock.y) < ROCK_SIZE * 0.65 + 12) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      for (const p of positions) {
        if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < WORLD_ORB_MIN_SPACING) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      positions.push({ x, y });
      const base = Phaser.Math.Between(2, 7);
      this.spawnXpOrb(x, y, base, { worldPickup: true });
      placed += 1;
    }
  }

  spawnXpOrb(x, y, baseXp, options = {}) {
    const variance = options.variance !== false;
    const value = variance
      ? Math.max(1, Math.round(baseXp * Phaser.Math.FloatBetween(0.82, 1.12)))
      : Math.max(1, Math.round(baseXp));
    const rad = options.radius ?? 7;
    const orb = this.add.circle(x, y, rad, COLORS.orb, 0.9);
    if (options.worldPickup) {
      orb.setStrokeStyle(2, 0xc4b5fd, 0.55);
      orb.setData('worldOrb', true);
    } else {
      orb.setStrokeStyle(2, 0xffffff, 0.35);
    }
    orb.setData('xpValue', value);
    this.orbs.add(orb);
  }

  collectOrbs() {
    const px = this.player.x;
    const py = this.player.y;
    const r = this.stats.pickupRadius;

    for (const orb of this.orbs.getChildren()) {
      if (!orb.active) continue;
      if (Phaser.Math.Distance.Between(px, py, orb.x, orb.y) <= r) {
        const raw = orb.getData('xpValue') ?? 3;
        const gained = Math.max(1, Math.round(raw * this.stats.xpGainMult));
        this.gainXp(gained);
        orb.destroy();
      }
    }
  }

  gainXp(amount) {
    if (this.gameOver) return;
    this.xp += amount;
    this.tryLevelUp();
  }

  tryLevelUp() {
    if (this.gameOver || this.pausedForLevelUp) return;
    if (this.xp < this.xpToNext) return;

    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = xpForLevel(this.level);
    this.openLevelUpMenu();
  }

  openLevelUpMenu() {
    if (this.levelUpRoot) return;
    this.pausedForLevelUp = true;
    this.physics.pause();
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);

    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72).setScrollFactor(0);
    dim.setInteractive();
    root.add(dim);

    const title = this.add
      .text(w / 2, h * 0.18, '¡Subiste de nivel!\nElige una mejora', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#f8fafc',
        align: 'center',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    root.add(title);

    const choices = pickThreeUpgrades();
    const cardW = Math.min(220, (w - 80) / 3.2);
    const gap = 18;
    const totalW = 3 * cardW + 2 * gap;
    const startX = w / 2 - totalW / 2 + cardW / 2;

    for (let i = 0; i < 3; i++) {
      const def = choices[i];
      const cx = startX + i * (cardW + gap);
      const cy = h * 0.52;

      const card = this.add
        .rectangle(cx, cy, cardW, 150, COLORS.panelBg, 0.96)
        .setStrokeStyle(2, 0x64748b)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const nameTxt = this.add
        .text(cx, cy - 48, def.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#38bdf8',
          fontStyle: '700',
          align: 'center',
          wordWrap: { width: cardW - 20 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      const descTxt = this.add
        .text(cx, cy + 12, def.desc, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#e2e8f0',
          align: 'center',
          wordWrap: { width: cardW - 16 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      card.on('pointerover', () => card.setStrokeStyle(2, 0x38bdf8));
      card.on('pointerout', () => card.setStrokeStyle(2, 0x64748b));
      card.on('pointerdown', () => {
        def.apply(this);
        this.syncPlayerMaxVelocity();
        this.closeLevelUpMenu(root);
      });

      root.add([card, nameTxt, descTxt]);
    }

    this.levelUpRoot = root;
  }

  closeLevelUpMenu(root) {
    root.destroy(true);
    this.levelUpRoot = null;
    this.pausedForLevelUp = false;
    if (!this.gameOver) {
      this.physics.resume();
      this.scheduleNextSpawn();
    }
    this.tryLevelUp();
  }

  onEnemyTouchingPlayer(enemy) {
    if (this.gameOver || this.pausedForLevelUp || this.pausedGame) return;
    if (this.physics.world.isPaused) return;
    const t = this.time.now;
    if (t < this.invulnUntil) return;
    if (t < this.nextContactDamageAt) return;

    this.nextContactDamageAt = t + CONTACT_DAMAGE_INTERVAL_MS;
    this.invulnUntil = t + INVULN_AFTER_HIT_MS;

    const baseDmg = enemy.getData('contactDamage') ?? BASE_ENEMY_CONTACT_DAMAGE;
    const dmg = Math.max(1, Math.round(baseDmg * this.stats.damageTakenMult));
    this.stats.hp -= dmg;

    this.applyPlayerKnockback(enemy);

    this.player.setAlpha(0.45);
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: INVULN_AFTER_HIT_MS,
      ease: 'Sine.easeOut',
    });

    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.finalSurvivalMs = this.time.now - this.runStartedAt;
    this.physics.pause();
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(6000);

    root.add(this.add.rectangle(w / 2, h / 2, w, h, 0x0f172a, 0.88).setScrollFactor(0));

    const title = this.add
      .text(w / 2, h * 0.3, 'Fin de la partida', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: '#f87171',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const timeStr = formatSurvivalTime(this.finalSurvivalMs);
    const sub = this.add
      .text(w / 2, h * 0.4, `Tiempo sobrevivido: ${timeStr}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const hint = this.add
      .text(w / 2, h * 0.48, `Nivel ${this.level}  ·  Bajas: ${this.killCount}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const btn = this.add
      .rectangle(w / 2, h * 0.64, 280, 52, 0x334155, 1)
      .setStrokeStyle(2, 0x64748b)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const btnTxt = this.add
      .text(w / 2, h * 0.64, 'Volver a intentar  ·  R', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#f1f5f9',
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    btn.on('pointerover', () => btn.setFillStyle(0x475569));
    btn.on('pointerout', () => btn.setFillStyle(0x334155));
    btn.on('pointerdown', () => this.scene.restart());

    root.add([title, sub, hint, btn, btnTxt]);
    this.gameOverRoot = root;
  }

  killEnemyWithLoot(enemy) {
    const ox = enemy.x;
    const oy = enemy.y;
    const bonus = enemy.getData('xpBonus') ?? 0;
    this.killCount += 1;
    enemy.destroy();
    const xpBase =
      Phaser.Math.Between(4, 8) + Math.min(6, Math.floor(this.level * 0.35)) + bonus;
    this.spawnXpOrb(ox, oy, xpBase);
  }

  applyDevStartWeapons() {
    for (const id of DEV_START_WEAPONS) {
      if (id === 'lightning') this.applyLightningWeaponUpgrade();
      if (id === 'projectile') this.applyProjectileWeaponUpgrade();
    }
  }

  applyLightningWeaponUpgrade() {
    if (!this.lightningWeapon) {
      this.lightningWeapon = {
        interval: 920,
        range: 400,
        damage: 10,
        nextAt: 0,
      };
    } else {
      this.lightningWeapon.damage = Math.round(this.lightningWeapon.damage * 1.12);
      this.lightningWeapon.interval = Math.max(380, Math.floor(this.lightningWeapon.interval * 0.9));
      this.lightningWeapon.range = Math.min(640, this.lightningWeapon.range + 24);
    }
  }

  applyProjectileWeaponUpgrade() {
    if (!this.projectileWeapon) {
      this.projectileWeapon = {
        interval: 1050,
        range: 430,
        damage: 9,
        speed: 440,
        maxDist: 720,
        nextAt: 0,
      };
    } else {
      this.projectileWeapon.damage = Math.round(this.projectileWeapon.damage * 1.1);
      this.projectileWeapon.interval = Math.max(420, Math.floor(this.projectileWeapon.interval * 0.91));
      this.projectileWeapon.speed = Math.min(640, this.projectileWeapon.speed + 38);
      this.projectileWeapon.range = Math.min(620, this.projectileWeapon.range + 22);
      this.projectileWeapon.maxDist = Math.min(1100, this.projectileWeapon.maxDist + 70);
    }
  }

  onProjectileHitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active || !enemy.body) return;
    const dmg = proj.getData('damage') ?? this.projectileWeapon?.damage ?? 9;
    let hp = enemy.getData('hp') ?? 1;
    hp -= dmg;
    enemy.setData('hp', hp);
    proj.destroy();
    if (hp <= 0) {
      this.killEnemyWithLoot(enemy);
    }
  }

  tickProjectileWeapon(time) {
    if (!this.projectileWeapon || this.gameOver || this.pausedForLevelUp || this.pausedGame) {
      return;
    }
    if (time < this.projectileWeapon.nextAt) return;

    const { range, interval, speed } = this.projectileWeapon;
    const px = this.player.x;
    const py = this.player.y;

    let target = null;
    let bestD = Infinity;
    for (const e of this.enemies.getChildren()) {
      if (!e.body || !e.active) continue;
      const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
      if (d <= range && d < bestD) {
        bestD = d;
        target = e;
      }
    }

    this.projectileWeapon.nextAt = time + interval;

    if (!target) return;

    const ang = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;

    const w = 18;
    const h = 8;
    const proj = this.add.rectangle(px, py, w, h, 0xff7043, 1);
    proj.setStrokeStyle(2, 0xffccbc, 1);
    proj.setRotation(ang);
    proj.setDepth(4);

    // Segundo argumento false = cuerpo dinámico (si es estático, setVelocity no lo mueve).
    this.physics.add.existing(proj, false);
    const body = proj.body;
    body.setAllowGravity(false);
    body.setImmovable(false);
    body.setCollideWorldBounds(false);
    body.setSize(w, h);

    this.projectiles.add(proj);

    body.setVelocity(vx, vy);
    this.time.delayedCall(0, () => {
      if (proj.active && proj.body) {
        proj.body.setVelocity(vx, vy);
      }
    });

    proj.setData('damage', this.projectileWeapon.damage);
    proj.setData('startX', px);
    proj.setData('startY', py);
    proj.setData('maxDist', this.projectileWeapon.maxDist);
  }

  cullProjectiles() {
    for (const p of this.projectiles.getChildren()) {
      if (!p.active || !p.body) continue;
      if (p.x < -50 || p.x > WORLD.W + 50 || p.y < -50 || p.y > WORLD.H + 50) {
        p.destroy();
        continue;
      }
      const sx = p.getData('startX');
      const sy = p.getData('startY');
      const maxD = p.getData('maxDist');
      if (sx == null || maxD == null) continue;
      if (Phaser.Math.Distance.Between(sx, sy, p.x, p.y) > maxD) {
        p.destroy();
      }
    }
  }

  drawLightningBolt(x1, y1, x2, y2) {
    const g = this.lightningGfx;
    g.clear();
    const midX = (x1 + x2) / 2 + Phaser.Math.Between(-22, 22);
    const midY = (y1 + y2) / 2 + Phaser.Math.Between(-22, 22);
    g.lineStyle(4, 0xffee58, 0.98);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(midX, midY);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(2, 0xe3f2fd, 0.75);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(midX, midY);
    g.lineTo(x2, y2);
    g.strokePath();
    this.time.delayedCall(90, () => g.clear());
  }

  tickLightningWeapon(time) {
    if (!this.lightningWeapon || this.gameOver || this.pausedForLevelUp || this.pausedGame) {
      return;
    }
    if (time < this.lightningWeapon.nextAt) return;

    const { range, damage, interval } = this.lightningWeapon;
    const px = this.player.x;
    const py = this.player.y;

    let target = null;
    let bestD = Infinity;
    for (const e of this.enemies.getChildren()) {
      if (!e.body || !e.active) continue;
      const d = Phaser.Math.Distance.Between(px, py, e.x, e.y);
      if (d <= range && d < bestD) {
        bestD = d;
        target = e;
      }
    }

    this.lightningWeapon.nextAt = time + interval;

    if (!target) return;

    this.drawLightningBolt(px, py, target.x, target.y);

    const km = target.getData('auraKnockMult') ?? 1;
    const ang = Phaser.Math.Angle.Between(px, py, target.x, target.y);
    const kf = 130 * km;
    target.setData('kbX', (target.getData('kbX') || 0) + Math.cos(ang) * kf);
    target.setData('kbY', (target.getData('kbY') || 0) + Math.sin(ang) * kf);

    let hp = target.getData('hp') ?? 1;
    hp -= damage;
    target.setData('hp', hp);

    if (hp <= 0) {
      this.killEnemyWithLoot(target);
    }
  }

  autoAttack(time) {
    if (this.gameOver || this.pausedForLevelUp || this.pausedGame) return;
    if (time < this.nextAttackAt) return;

    this.nextAttackAt = time + this.stats.attackCooldownMs;

    const r = this.stats.attackRange;
    this.attackGfx.clear();
    this.attackGfx.lineStyle(3, COLORS.attackFlash, 0.85);
    this.attackGfx.strokeCircle(this.player.x, this.player.y, r);
    this.time.delayedCall(110, () => this.attackGfx.clear());

    const px = this.player.x;
    const py = this.player.y;
    const dmg = this.stats.auraDamage;

    for (const enemy of [...this.enemies.getChildren()]) {
      if (!enemy.body || !enemy.active) continue;
      if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) > r) continue;

      const km = enemy.getData('auraKnockMult') ?? 1;
      const ang = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
      const kf = 240 * km;
      const kx = (enemy.getData('kbX') || 0) + Math.cos(ang) * kf;
      const ky = (enemy.getData('kbY') || 0) + Math.sin(ang) * kf;
      enemy.setData('kbX', kx);
      enemy.setData('kbY', ky);

      let hp = enemy.getData('hp') ?? 1;
      hp -= dmg;
      enemy.setData('hp', hp);

      if (hp <= 0) {
        this.killEnemyWithLoot(enemy);
      }
    }
  }

  togglePause() {
    if (this.gameOver || this.pausedForLevelUp) return;
    this.pausedGame = !this.pausedGame;
    if (this.pausedGame) {
      this.physics.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
      this.tweens.resumeAll();
      this.time.paused = false;
      this.physics.resume();
    }
  }

  showPauseMenu() {
    if (this.pauseRoot) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(4400);

    const dim = this.add
      .rectangle(w / 2, h / 2, w, h, 0x0f172a, 0.68)
      .setScrollFactor(0)
      .setInteractive();
    dim.on('pointerdown', () => {
      if (this.pausedGame) this.togglePause();
    });
    root.add(dim);

    const title = this.add
      .text(w / 2, h * 0.34, 'PAUSA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#f8fafc',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    root.add(title);

    const elapsed = this.time.now - this.runStartedAt;
    const clock = this.add
      .text(w / 2, h * 0.44, `Cronómetro  ${formatSurvivalTime(elapsed)}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e2e8f0',
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    root.add(clock);

    const hint = this.add
      .text(w / 2, h * 0.54, 'ESC  ·  clic para reanudar', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    root.add(hint);

    this.pauseRoot = root;
  }

  hidePauseMenu() {
    if (!this.pauseRoot) return;
    this.pauseRoot.destroy(true);
    this.pauseRoot = null;
  }

  update(time) {
    this.updateHud();

    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.keyRestart)) {
        this.scene.restart();
      }
      return;
    }

    if (this.pausedForLevelUp) return;

    if (this.pausedGame) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.togglePause();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.togglePause();
    }

    this.autoAttack(time);
    this.tickLightningWeapon(time);
    this.tickProjectileWeapon(time);
    this.cullProjectiles();
    this.collectOrbs();

    const body = this.player.body;
    const spd = this.stats.moveSpeed;
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

    body.velocity.x += this.playerKnock.x;
    body.velocity.y += this.playerKnock.y;
    this.playerKnock.x *= 0.82;
    this.playerKnock.y *= 0.82;

    const espBase = ENEMY_SPEED_BASE * this.getEnemySpeedMult();
    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.body) continue;
      const sm = enemy.getData('speedMult') ?? 1;
      let kbX = enemy.getData('kbX') || 0;
      let kbY = enemy.getData('kbY') || 0;
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
