export function getTopEntries<T>(
  map: Map<string, number>,
  limit: number,
  transform: (key: string, count: number) => T
): T[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => transform(key, count));
}
