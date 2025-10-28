import { formatTime } from './time';
import cache from '../services/cache';
import { Result } from '../types/cache/Result';

export function logCacheEvent(eventType: string, cacheKey: string, additionalInfo: string = '') {
  const timestamp = formatTime(new Date());
  const info = additionalInfo ? ` ${additionalInfo}` : '';
  console.log(`[${timestamp}] ${eventType} | ${cacheKey}${info}`);
}

export function handleCacheError(cacheKey: string, error: any): Result<null> {
  const timestamp = formatTime(new Date());
  console.error(`[${timestamp}] 🚒 | Failed to process cache key '${cacheKey}':`, error);

  return {
    message: `Error processing cache key '${cacheKey}'`,
    error: String(error),
    details: String(error),
  };
}

export async function getOrRefreshCache<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  isCacheHit: boolean
): Promise<T> {
  // Try to get cached data if it's a cache hit
  if (isCacheHit) {
    const cachedData = await cache.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Fetch fresh data and cache it
  const freshData = await fetchFunction();
  await cache.set(cacheKey, freshData);
  return freshData;
}
