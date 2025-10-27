import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { refreshCacheInBackground } from '../refresh';
import { REFRESH_THRESHOLD_MS } from '../metrics';
import { cacheRefreshTimes } from '../metrics';
import { logCacheEvent, handleCacheError, Result } from '../cache';

export async function getDataFromStaticSheet(
  sheetName: string,
  cacheKey: string,
  isPrewarm: boolean = false
): Promise<Result<any>> {
  let start_time = Date.now();

  try {
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      const responseTime = Date.now() - start_time;
      const lastRefreshTime = cacheRefreshTimes.get(cacheKey) || 0;
      const timeSinceRefresh = Date.now() - lastRefreshTime;

      if (timeSinceRefresh > REFRESH_THRESHOLD_MS) {
        if (!isPrewarm) logCacheEvent(
          '🔄 Triggering background refresh',
          cacheKey,
          `(${Math.round(timeSinceRefresh / 1000)}s old)`
        );
        refreshCacheInBackground(sheetName, cacheKey);
      }

      if (!isPrewarm) logCacheEvent('⚡ Cache hit', cacheKey, `(age: ${Math.round(timeSinceRefresh / 1000)}s)`);

      return {
        code: 200,
        message: `Cache hit - '${cacheKey}'`,
        dataOrigin: 'cache',
        executionTime: `${responseTime}ms`,
        data: cachedData,
      };
    }

    if (!isPrewarm) logCacheEvent('🎯 Cache miss', cacheKey, `fetching fresh data from sheet '${sheetName}'`);

    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    const responseTime = Date.now() - start_time;
    if (!isPrewarm) logCacheEvent('🎯 New static cache entry', cacheKey);

    return {
      code: 200,
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${responseTime}ms`,
      data,
    };
  } catch (err) {
    return handleCacheError(cacheKey, err);
  }
}
