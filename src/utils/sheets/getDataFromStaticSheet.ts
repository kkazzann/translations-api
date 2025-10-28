import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { refreshCacheInBackground } from '../refresh';
import {
  REFRESH_THRESHOLD_MS,
  cacheRefreshTimes,
  recordCacheHit,
  recordCacheMiss,
  recordStaticSheetAccess,
  recordStaticSheetUpdate,
  recordRequest,
  recordResponseTime,
} from '../metrics';
import { logCacheEvent, handleCacheError } from '../cache';
import { Result } from '../../types/cache/Result';

export async function getDataFromStaticSheet(
  sheetName: string,
  cacheKey: string,
  isPrewarm: boolean = false
): Promise<Result<any>> {
  let start_time = Date.now();

  try {
    recordRequest(); // Track request for RPM
    recordStaticSheetAccess(cacheKey); // Track static sheet access

    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      const responseTime = Number((Date.now() - start_time).toFixed(2));
      const lastRefreshTime = cacheRefreshTimes.get(cacheKey) || 0;
      const timeSinceRefresh = Date.now() - lastRefreshTime;

      if (timeSinceRefresh > REFRESH_THRESHOLD_MS) {
        if (!isPrewarm)
          logCacheEvent(
            '🔄 Triggering background refresh',
            cacheKey,
            `(${Math.round(timeSinceRefresh / 1000)}s old)`
          );
        refreshCacheInBackground(sheetName, cacheKey);
      }

      if (!isPrewarm)
        logCacheEvent('⚡ Cache hit', cacheKey, `(age: ${Math.round(timeSinceRefresh / 1000)}s)`);

      // Only record metrics after successful response (not for prewarm)
      if (!isPrewarm) {
        recordCacheHit(cacheKey);
        recordResponseTime(true, responseTime);
      }

      return {
        dataOrigin: 'cache',
        executionTime: responseTime,
        data: cachedData,
      };
    }

    if (!isPrewarm)
      logCacheEvent('🎯 Cache miss', cacheKey, `fetching fresh data from sheet '${sheetName}'`);

    const sheetData = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, sheetData.data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    recordStaticSheetUpdate(cacheKey); // Track cache update

    const responseTime = Date.now() - start_time;
    if (!isPrewarm) logCacheEvent('🎯 New static cache entry', cacheKey);

    // Only record metrics after successful response (not for prewarm)
    if (!isPrewarm) {
      recordCacheMiss(cacheKey, isPrewarm);
      recordResponseTime(false, responseTime);
    }

    return {
      dataOrigin: 'googleAPI',
      executionTime: responseTime,
      data: sheetData.data,
    };
  } catch (err) {
    return handleCacheError(cacheKey, err);
  }
}
