import Phaser from 'phaser';

const WORLD = {
  W: 4200,
  H: 3200,
};

const COLORS = {
  bg: 0x0a1f0a,
  grid: 0x143214,
  player: 0x33ff66,
  rock: 0x2266cc,
  enemy: 0xdd2222,
  attackFlash: 0x88ffaa,
};

const ROCK_COUNT = 55;
const ROCK_SIZE = 52;
const ENEMY_SIZE = 30;
const ENEMY_SPEED = 95;
const SPAWN_INTERVAL_MS = 1800;
const ATTACK_RANGE = 110;
const ATTACK_COOLDOWN_MS = 450;

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.W, WORLD.H);

    this.add.rectangle(WORLD.W / 2, WORLD.H / 2, WORLD.W, WORLD.H, COLORS.bg);

    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.grid, 0.28);
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
    this.player.body.setMaxVelocity(280, 280);

    this.physics.add.collider(this.player, this.rocks);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, this.rocks);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    this.speed = 220;
    this.nextAttackAt = 0;

    this.attackGfx = this.add.graphics();
    this.attackGfx.setDepth(5);

    this.cameras.main.setBounds(0, 0, WORLD.W, WORLD.H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.time.addEvent({
      delay: SPAWN_INTERVAL_MS,
      callback: () => this.spawnEnemy(),
      loop: true,
    });
    this.spawnEnemy();
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
    const margin = ENEMY_SIZE;
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

    const enemy = this.add.rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, COLORS.enemy);
    enemy.setStrokeStyle(1, 0x880000, 0.85);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
  }

  tryAttack(time) {
    if (time < this.nextAttackAt) return;
    if (!Phaser.Input.Keyboard.JustDown(this.keyJ)) return;

    this.nextAttackAt = time + ATTACK_COOLDOWN_MS;

    this.attackGfx.clear();
    this.attackGfx.lineStyle(3, COLORS.attackFlash, 0.85);
    this.attackGfx.strokeCircle(this.player.x, this.player.y, ATTACK_RANGE);
    this.time.delayedCall(120, () => this.attackGfx.clear());

    const px = this.player.x;
    const py = this.player.y;
    const toKill = [];

    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.body) continue;
      if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) <= ATTACK_RANGE) {
        toKill.push(enemy);
      }
    }

    for (const enemy of toKill) {
      enemy.destroy();
    }
  }

  update(time) {
    this.tryAttack(time);

    const body = this.player.body;
    body.setVelocity(0);

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    if (left) body.setVelocityX(-this.speed);
    else if (right) body.setVelocityX(this.speed);

    if (up) body.setVelocityY(-this.speed);
    else if (down) body.setVelocityY(this.speed);

    if (left && right) body.setVelocityX(0);
    if (up && down) body.setVelocityY(0);

    if (body.velocity.lengthSq() > 0) {
      body.velocity.normalize().scale(this.speed);
    }

    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.body) continue;
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(angle, ENEMY_SPEED, enemy.body.velocity);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#0a1f0a',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
