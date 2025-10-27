import {
  cacheRefreshTimes,
  cacheHits,
  cacheMisses,
  cacheHitResponseTimes,
  cacheMissResponseTimes,
  requestTimestamps,
  keyRequestCounts,
  languageRequestCounts,
} from './metrics';
import { formatTime } from './time';
import cache from '../services/cache';

/**
 * A universal result type to standardize responses.
 */
export interface Result<T> {
  code: number; // HTTP-like status code
  message: string;
  data?: T;
  error?: string; // Optional error message
  details?: string; // Optional additional details
  dataOrigin?: 'cache' | 'googleAPI';
  executionTime?: string;
}

/**
 * Return cache statistics for admin UI.
 * For each tracked cache key we return last refresh timestamp, age and a simple size metric.
 */
export async function getCacheStats() {
  const stats: Array<Record<string, any>> = [];
  let totalSize = 0;
  let totalAgeMs = 0;
  let totalHits = 0;
  let totalMisses = 0;

  for (const [key, ts] of cacheRefreshTimes.entries()) {
    try {
      const data = await cache.get(key as any);

      let size = 0;
      if (data == null) size = 0;
      else if (Array.isArray(data)) size = data.length;
      else if (typeof data === 'object') size = Object.keys(data).length;
      else size = 1;

      const ageMs = Date.now() - ts;
      const hits = cacheHits.get(key) || 0;
      const misses = cacheMisses.get(key) || 0;

      totalSize += size;
      totalAgeMs += ageMs;
      totalHits += hits;
      totalMisses += misses;

      stats.push({
        key,
        lastRefresh: ts,
        ageMs,
        size,
        hits,
        misses,
        hitRatio: hits + misses > 0 ? hits / (hits + misses) : 0,
      });
    } catch (err) {
      stats.push({
        key,
        lastRefresh: ts,
        ageMs: Date.now() - ts,
        size: -1,
        hits: 0,
        misses: 0,
        hitRatio: 0,
        error: String(err),
      });
    }
  }

  // Sort stats by size (descending) for topKeys
  const sortedBySize = [...stats].sort((a, b) => b.size - a.size);

  // Calculate average response times
  const avgCacheHitResponseTime =
    cacheHitResponseTimes.length > 0
      ? cacheHitResponseTimes.reduce((a, b) => a + b, 0) / cacheHitResponseTimes.length
      : 0;

  const avgCacheMissResponseTime =
    cacheMissResponseTimes.length > 0
      ? cacheMissResponseTimes.reduce((a, b) => a + b, 0) / cacheMissResponseTimes.length
      : 0;

  const avgOverallResponseTime =
    cacheHitResponseTimes.length + cacheMissResponseTimes.length > 0
      ? [...cacheHitResponseTimes, ...cacheMissResponseTimes].reduce((a, b) => a + b, 0) /
        (cacheHitResponseTimes.length + cacheMissResponseTimes.length)
      : 0;

  // Calculate RPM (requests in the last minute)
  const requestsPerMinute = requestTimestamps.length;

  // Get top requested keys
  const topRequestedKeys = Array.from(keyRequestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }));

  // Get top requested languages
  const topRequestedLanguages = Array.from(languageRequestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }));

  return {
    stats,
    totalSize,
    totalAgeMs,
    totalHits,
    totalMisses,
    avgCacheHitResponseTime,
    avgCacheMissResponseTime,
    avgOverallResponseTime,
    requestsPerMinute,
    topRequestedKeys,
    topRequestedLanguages,
  };
}

export function logCacheEvent(eventType: string, cacheKey: string, additionalInfo: string = '') {
  console.log(`[${formatTime(new Date())}] ${eventType} | ${cacheKey} ${additionalInfo}`);
}

export function handleCacheError(cacheKey: string, error: any): Result<null> {
  console.error(
    `[${formatTime(new Date())}] 🚒 | Failed to process cache key '${cacheKey}':`,
    error
  );

  return {
    code: error.code || 500,
    message: `Error processing cache key '${cacheKey}'`,
    error: String(error),
    details: String(error),
  };
}

/**
 * Retrieves data from the cache or refreshes it using the provided fetch function.
 * @param cacheKey - The key to retrieve or refresh in the cache.
 * @param fetchFunction - A function to fetch fresh data if the cache is stale or missing.
 * @param isCacheHit - Whether the cache was hit (data exists in the cache).
 * @returns The cached or freshly fetched data.
 */
export async function getOrRefreshCache<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  isCacheHit: boolean
): Promise<T> {
  if (isCacheHit) {
    const cachedData = await cache.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // If cache miss or stale data, fetch fresh data
  const freshData = await fetchFunction();
  await cache.set(cacheKey, freshData);
  return freshData;
}
