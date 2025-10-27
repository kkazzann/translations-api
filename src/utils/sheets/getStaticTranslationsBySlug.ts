import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { keyToSheetMap } from '../../constants';
import { getOrRefreshCache, logCacheEvent, Result } from '../cache';

export async function getStaticTranslationsBySlug(
  cacheKey: string,
  languageSlug: string
): Promise<Result<Record<string, any>>> {
  const start_time = Date.now();
  checkIfPrewarmIsDone();

  const cachedData = await cache.get(cacheKey);
  const isCacheHit = cachedData !== undefined;

  const cacheEntry = await getOrRefreshCache(
    cacheKey,
    async () => {
      const sheetName = keyToSheetMap[cacheKey];
      if (!sheetName) {
        throw new Error(`No sheet mapping for cache key: ${cacheKey}`);
      }
      return await fetchSheetData('STATIC', sheetName);
    },
    isCacheHit
  );

  const slugArray = Array.isArray(cacheEntry!.slug) ? cacheEntry!.slug : [];
  const idx = slugArray.findIndex((s: string) => s === languageSlug);

  if (idx === -1) {
    return {
      code: 404,
      message: `No translations for ${languageSlug}`,
    };
  }

  const values: Record<string, any> = {};
  const entriesWithoutSlug = Object.entries(cacheEntry!).slice(1);

  for (const [propertyKeys, translationsArray] of entriesWithoutSlug) {
    if (Array.isArray(translationsArray)) {
      values[propertyKeys] = translationsArray[idx] ?? null;
    } else {
      return {
        code: 500,
        message: `Error! No array found!`,
      };
    }
  }

  const responseTime = Date.now() - start_time;
  logCacheEvent('🎯 Translations fetched', cacheKey, `Execution time: ${responseTime}ms`);

  return {
    code: 200,
    message: `Translations for ${languageSlug}`,
    data: values,
  };
}
