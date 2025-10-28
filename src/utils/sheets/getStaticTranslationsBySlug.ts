import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { keyToSheetMap } from '../../constants';
import { getOrRefreshCache, logCacheEvent } from '../cache';
import { Result } from '../../types/cache/Result';
import {
  recordKeyRequest,
  recordLanguageRequest,
  recordCacheHit,
  recordCacheMiss,
  recordResponseTime,
  recordRequest,
} from '../metrics';

export async function getStaticTranslationsBySlug(
  cacheKey: string,
  languageSlug: string
): Promise<Result<Record<string, any>>> {
  const start_time = Date.now();
  checkIfPrewarmIsDone();

  // Record metrics: track which keys are being requested
  recordRequest(); // Track request for RPM
  recordKeyRequest(cacheKey);

  const cachedData = await cache.get(cacheKey);
  const isCacheHit = cachedData !== undefined;

  const cacheEntry = await getOrRefreshCache(
    cacheKey,
    async () => {
      const sheetName = keyToSheetMap[cacheKey];
      if (!sheetName) {
        throw new Error(`No sheet mapping for cache key: ${cacheKey}`);
      }
      const result = await fetchSheetData('STATIC', sheetName);

      // Handle error responses from fetchSheetData
      if (result.code === 404 || result.code === 500) {
        throw new Error(result.message);
      }

      return result.data!;
    },
    isCacheHit
  );

  const slugArray = Array.isArray(cacheEntry.slug) ? cacheEntry.slug : [];
  const idx = slugArray.findIndex((s: string) => s === languageSlug);

  if (idx === -1) {
    const responseTime = Number((Date.now() - start_time).toFixed(2));
    recordResponseTime(isCacheHit, responseTime); // Record even for 404
    // Don't record language request - invalid language

    return {
      code: 404,
      message: `No translations found!`,
    };
  }

  // Language is valid, record it now
  recordLanguageRequest(languageSlug);

  const values: Record<string, any> = {};
  const entriesWithoutSlug = Object.entries(cacheEntry).slice(1);

  for (const [propertyKeys, translationsArray] of entriesWithoutSlug) {
    if (Array.isArray(translationsArray)) {
      values[propertyKeys] = translationsArray[idx] ?? null;
    } else {
      const responseTime = Number((Date.now() - start_time).toFixed(2));
      recordResponseTime(isCacheHit, responseTime); // Record even for 500

      return {
        code: 500,
        message: `Error! No array found!`,
      };
    }
  }

  const responseTime = Number((Date.now() - start_time).toFixed(2));

  // Record cache hit/miss
  if (isCacheHit) {
    recordCacheHit(cacheKey);
  } else {
    recordCacheMiss(cacheKey);
  }

  // Record response time
  recordResponseTime(isCacheHit, responseTime);

  logCacheEvent('🎯 Translations fetched', cacheKey, `Execution time: ${responseTime}ms`);

  return {
    executionTime: responseTime,
    data: values,
  };
}
