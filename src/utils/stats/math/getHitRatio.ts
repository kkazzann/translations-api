export function getHitRatio(hits: number, misses: number): number {
  const total = hits + misses;
  return total > 0 ? Math.round((hits / total) * 100) / 100 : 0;
}
