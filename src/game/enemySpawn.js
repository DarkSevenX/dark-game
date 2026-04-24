import { ENEMY_UNLOCK_SEC } from './data/enemies.js';

export function getUnlockedEnemyKeys(elapsedSec) {
  const s = Math.floor(Math.max(0, elapsedSec));
  const keys = ['stalker'];
  if (s >= ENEMY_UNLOCK_SEC.runner) keys.push('runner');
  if (s >= ENEMY_UNLOCK_SEC.brute) keys.push('brute');
  if (s >= ENEMY_UNLOCK_SEC.swarm) keys.push('swarm');
  if (s >= ENEMY_UNLOCK_SEC.warden) keys.push('warden');
  return keys;
}

export function pickEnemyTypeForSpawn(elapsedSec) {
  const pool = getUnlockedEnemyKeys(elapsedSec);
  const elapsedMin = elapsedSec / 60;
  const baseW = {
    stalker: 36,
    runner: 24,
    brute: 14,
    swarm: 16,
    warden: 7,
  };
  const entries = pool.map((key) => {
    let w = baseW[key] ?? 10;
    if (elapsedMin >= 2.5) w += key === 'runner' || key === 'swarm' ? 5 : 0;
    if (elapsedMin >= 4) w += key === 'brute' ? 8 : 0;
    if (elapsedMin >= 5) w += key === 'warden' ? 12 : 0;
    if (elapsedMin >= 6) w += key === 'swarm' ? 6 : 0;
    return { key, w };
  });
  const total = entries.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.key;
  }
  return pool[0];
}
