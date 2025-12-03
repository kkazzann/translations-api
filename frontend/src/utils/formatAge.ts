export const formatAge = (timestamp: number) => {
  // convert absolute timestamp (ms) to milliseconds elapsed from now
  timestamp = Date.now() - timestamp;
  if (timestamp < 0) timestamp = 0;

  const seconds = Math.floor(timestamp / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}min ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}min`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
};
