/**
 * XP necesario para pasar de `level` a `level + 1`.
 */
export function xpForLevel(level) {
  const L = Math.max(1, level);
  return Math.floor(32 + L * 52 + L * L * 4.2 + 0.15 * L * L * L);
}
