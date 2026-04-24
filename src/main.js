import Phaser from 'phaser';
import { createGameConfig } from './game/gameConfig.js';

const game = new Phaser.Game(createGameConfig());

function scheduleGameResize() {
  const w = Math.max(2, window.innerWidth);
  const h = Math.max(2, window.innerHeight);
  game.scale.resize(w, h);
}

let resizeRaf = 0;
function onViewportResize() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(scheduleGameResize);
}

window.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('resize', onViewportResize);
