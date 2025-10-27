import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { filterToAllowedHeaders } from '../data';
import {
  cacheRefreshTimes,
  REFRESH_THRESHOLD_MS,
  recordCacheHit,
  recordCacheMiss,
  recordDynamicSheetAccess,
  recordDynamicSheetUpdate,
  recordRequest,
  recordResponseTime,
} from '../metrics';
import { ALLOWED_DYNAMIC_HEADERS, HEADER_TRANSFORMATIONS } from '../../constants';
import { logCacheEvent } from '../cache';

export async function getDynamicSheetCached(sheetTab: string) {
  const cacheKey = `dynamic_${sheetTab}`;
  const start_time = Date.now();

  try {
    recordRequest(); // Track request for RPM
    recordDynamicSheetAccess(sheetTab); // Track dynamic sheet access

    // Check if we have cached data
    const cachedData = await cache.get<Record<string, any[]>>(cacheKey);

    if (cachedData) {
      recordCacheHit(cacheKey);
      const responseTime = Date.now() - start_time;
      recordResponseTime(true, responseTime);

      const lastRefreshTime = cacheRefreshTimes.get(cacheKey) || 0;
      const timeSinceRefresh = Date.now() - lastRefreshTime;

      if (timeSinceRefresh > REFRESH_THRESHOLD_MS) {
        logCacheEvent(
          '🔄 Triggering background refresh',
          cacheKey,
          `(${Math.round(timeSinceRefresh / 1000)}s old)`
        );
      }

      logCacheEvent('⚡ Cache hit', cacheKey, `(age: ${Math.round(timeSinceRefresh / 1000)}s)`);

      const filteredData = filterToAllowedHeaders(
        cachedData,
        ALLOWED_DYNAMIC_HEADERS,
        HEADER_TRANSFORMATIONS
      );

      return {
        message: `Cache hit - '${cacheKey}'`,
        dataOrigin: 'cache',
        executionTime: `${responseTime}ms`,
        data: filteredData,
      };
    }

    recordCacheMiss(cacheKey);
    logCacheEvent('🎯 Cache miss', cacheKey, `fetching fresh data from sheet '${sheetTab}'`);

    const data = await fetchSheetData('DYNAMIC', sheetTab);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    recordDynamicSheetUpdate(sheetTab);

    const responseTime = Date.now() - start_time;
    recordResponseTime(false, responseTime);

    logCacheEvent('🎯 New dynamic cache entry', cacheKey);

    const filteredData = filterToAllowedHeaders(
      data as Record<string, any[]>,
      ALLOWED_DYNAMIC_HEADERS,
      HEADER_TRANSFORMATIONS
    );

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${responseTime}ms`,
      data: filteredData,
    };
  } catch (err) {
    logCacheEvent('🚒 Failed to populate dynamic cache', cacheKey, String(err));
    throw err;
  }
}
