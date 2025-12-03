import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { filterToAllowedHeaders } from '../filterToAllowedHeaders';
import {
  cacheRefreshTimes,
  REFRESH_THRESHOLD_MS,
  recordCacheHit,
  recordCacheMiss,
  recordDynamicSheetAccess,
  recordDynamicSheetUpdate,
  recordRequest,
  recordResponseTime,
  recordKeyRequest,
} from '../metrics';
import { ALLOWED_DYNAMIC_HEADERS, HEADER_TRANSFORMATIONS } from '../../constants';
import { logCacheEvent } from '../cache';

interface DynamicSheetResponse {
  dataOrigin: 'cache' | 'googleAPI';
  executionTime: number;
  data: Record<string, any[]>;
}

export async function getDynamicSheetCached(sheetTab: string): Promise<DynamicSheetResponse> {
  const cacheKey = `dynamic_${sheetTab}`;
  const start_time = Date.now();

  try {
  recordRequest(); // Track request for RPM
  recordDynamicSheetAccess(sheetTab); // Track dynamic sheet access

    // Check if we have cached data
    const cachedData = await cache.get<Record<string, any[]>>(cacheKey);

    if (cachedData) {
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

      const responseTime = Date.now() - start_time;

  // Only record metrics after successful response
  // Record as successful query for top/recent metrics
  recordKeyRequest(cacheKey);
  recordCacheHit(cacheKey);
  recordResponseTime(true, responseTime);

      return {
        dataOrigin: 'cache',
        executionTime: responseTime,
        data: filteredData,
      };
    }

    // No cache, fetch fresh data
    const result = await fetchSheetData('DYNAMIC', sheetTab);

    // Handle error responses from fetchSheetData
    if (result.code === 404) {
      const error: any = new Error('No translations found!');
      error.code = 404;
      error.message = 'No translations found!';
      throw error;
    }

    if (result.code === 500 || !result.data) {
      const error: any = new Error('Error 500! Unexpected error occurred.');
      error.code = 500;
      error.message = 'Error 500! Unexpected error occurred.';
      throw error;
    }

    // Only log cache miss after successful fetch
    logCacheEvent('🎯 Cache miss', cacheKey, `fetched fresh data from sheet '${sheetTab}'`);

    await cache.set(cacheKey, result.data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    recordDynamicSheetUpdate(sheetTab);

    logCacheEvent('🎯 New dynamic cache entry', cacheKey);

    const filteredData = filterToAllowedHeaders(
      result.data,
      ALLOWED_DYNAMIC_HEADERS,
      HEADER_TRANSFORMATIONS
    );

    const responseTime = Date.now() - start_time;

  // Only record metrics after successful response
  // Record as successful query for top/recent metrics
  recordKeyRequest(cacheKey);
  recordCacheMiss(cacheKey);
  recordResponseTime(false, responseTime);

    return {
      dataOrigin: 'googleAPI',
      executionTime: responseTime,
      data: filteredData,
    };
  } catch (err) {
    logCacheEvent('🚒 Failed to fetch dynamic sheet', cacheKey, String(err));
    throw err;
  }
}
