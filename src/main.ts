import Phaser from 'phaser';
import { createGameConfig } from './game/gameConfig';

const game = new Phaser.Game(createGameConfig());

function scheduleGameResize(): void {
  const w = Math.max(2, window.innerWidth);
  const h = Math.max(2, window.innerHeight);
  game.scale.resize(w, h);
}

let resizeRaf = 0;
function onViewportResize(): void {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(scheduleGameResize);
}

window.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('resize', onViewportResize);
