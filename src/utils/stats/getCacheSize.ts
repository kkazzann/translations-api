export function getCacheSize(data: any): number {
  if (data == null) return 0;

  if (Array.isArray(data)) return data.length;

  if (typeof data === 'object') return Object.keys(data).length;

  return 1;
}
