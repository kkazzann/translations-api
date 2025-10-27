import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { logCacheEvent } from '../cache';
import { cacheRefreshTimes } from '../metrics';

/**
 * Force refresh the static cache for a given sheet.
 * @param sheetName - The name of the sheet to refresh.
 * @param cacheKey - The cache key associated with the sheet.
 * @returns A message indicating the refresh status.
 */
export async function forceRefreshStaticCache(sheetName: string, cacheKey: string) {
  try {
    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    logCacheEvent('🎯 Static cache refreshed', cacheKey);

    return {
      message: `Cache refreshed for '${cacheKey}'`,
      data,
    };
  } catch (error) {
    logCacheEvent('🚒 Failed to refresh static cache', cacheKey, String(error));
    throw new Error(`Failed to refresh cache for '${cacheKey}': ${error}`);
  }
}

export async function forceRefreshDynamicCache(sheet_tab: string) {
  try {
    const data = await fetchSheetData('DYNAMIC', sheet_tab);
    await cache.set(sheet_tab, data);
    cacheRefreshTimes.set(sheet_tab, Date.now());

    logCacheEvent('🎯 Dynamic cache refreshed', sheet_tab);

    return {
      message: `Dynamic cache refreshed for '${sheet_tab}'`,
      data,
    };
  } catch (error) {
    logCacheEvent('🚒 Failed to refresh dynamic cache', sheet_tab, String(error));
    throw new Error(`Failed to refresh cache for '${sheet_tab}': ${error}`);
  }
}

export { fetchSheetData } from './fetchSheetData';
export { getTabNameById } from './getTabNameById';
