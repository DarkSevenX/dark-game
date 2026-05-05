import Phaser from 'phaser';
import { COLORS } from '../game/constants';
import { CONTROL_MODE_REGISTRY_KEY, type ControlMode } from '../game/controlMode';

export class MenuScene extends Phaser.Scene {
  private selected: ControlMode = 'keyboard';

  private kbCard!: Phaser.GameObjects.Rectangle;
  private msCard!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add
      .rectangle(w / 2, h / 2, w, h, COLORS.panelBg, 0.94)
      .setScrollFactor(0)
      .setDepth(0);

    this.add
      .text(w / 2, h * 0.2, 'DarkGame', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: '#f8fafc',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1);

    this.add
      .text(w / 2, h * 0.3, 'Elige control y pulsa Jugar', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#94a3b8',
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1);

    const cardW = Math.min(400, w - 40);
    const cardH = 76;

    const kbY = h * 0.42;
    this.kbCard = this.add
      .rectangle(w / 2, kbY, cardW, cardH, 0x1e293b, 0.98)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(w / 2, kbY - 14, 'Teclado', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#f1f5f9',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    this.add
      .text(w / 2, kbY + 18, 'Flechas y WASD a la vez', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: cardW - 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    const msY = h * 0.56;
    this.msCard = this.add
      .rectangle(w / 2, msY, cardW, cardH, 0x1e293b, 0.98)
      .setStrokeStyle(2, 0x64748b)
      .setScrollFactor(0)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(w / 2, msY - 14, 'Ratón', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#f1f5f9',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    this.add
      .text(w / 2, msY + 18, 'Seguimiento del cursor en el mapa (sin teclas de movimiento)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: cardW - 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    this.kbCard.on('pointerdown', () => this.setMode('keyboard'));
    this.msCard.on('pointerdown', () => this.setMode('mouse'));

    const playBtn = this.add
      .text(w / 2, h * 0.74, 'Jugar', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#0f172a',
        fontStyle: '800',
        backgroundColor: '#38bdf8',
        padding: { x: 40, y: 16 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    playBtn.on('pointerover', () => playBtn.setStyle({ backgroundColor: '#7dd3fc' }));
    playBtn.on('pointerout', () => playBtn.setStyle({ backgroundColor: '#38bdf8' }));
    playBtn.on('pointerdown', () => {
      this.registry.set(CONTROL_MODE_REGISTRY_KEY, this.selected);
      this.scene.start('PlayScene');
    });

    this.scale.on('resize', this._onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this._onResize, this);
    });
  }

  private setMode(mode: ControlMode): void {
    this.selected = mode;
    if (mode === 'keyboard') {
      this.kbCard.setStrokeStyle(2, 0x38bdf8);
      this.msCard.setStrokeStyle(2, 0x64748b);
    } else {
      this.kbCard.setStrokeStyle(2, 0x64748b);
      this.msCard.setStrokeStyle(2, 0x38bdf8);
    }
  }

  private _onResize = (): void => {
    this.scene.restart();
  };
}
