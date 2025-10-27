import { cacheRefreshTimes } from './metrics';
import { fetchSheetData } from './sheets/';
import { formatTime } from './time';
import cache from '../services/cache';

// Background refresh function
export async function refreshCacheInBackground(sheetName: string, cacheKey: string) {
  try {
    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    console.log(`[${formatTime(new Date())}] 🎯 | Background refresh completed for '${cacheKey}'`);
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Background refresh failed for '${cacheKey}':`,
      err
    );
  }
}
