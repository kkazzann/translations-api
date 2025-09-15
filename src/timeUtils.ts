export function formatTime(date: Date) {
  return date.toLocaleTimeString('pl');
}

export function getMilisFromHours(hours: number): number {
  return hours * 60 * 60 * 1000;
}

export function getMilisFromMinutes(minutes: number): number {
  return minutes * 60 * 1000;
}

export function getMilisFromSeconds(seconds: number): number {
  return seconds * 1000;
}

export function getMilisFromDays(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}
