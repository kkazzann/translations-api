export function getAverage(numbers: number[]): number | undefined {
  if (numbers.length === 0) return undefined;

  return Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 100) / 100;
}
