export function formatTime(date: Date) {
  return date.toLocaleTimeString('pl');
}

export function getMilisFromHours(hours: number): number {
  return hours * 60 * 60 * 1000;
}
