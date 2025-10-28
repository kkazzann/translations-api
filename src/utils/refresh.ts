import { cacheRefreshTimes } from './metrics';
import { fetchSheetData } from './sheets/';
import { formatTime } from './time';
import cache from '../services/cache';

// Background refresh function
export async function refreshCacheInBackground(sheetName: string, cacheKey: string) {
  try {
    const result = await fetchSheetData('STATIC', sheetName);

    // Handle error responses from fetchSheetData
    if (result.code === 404 || result.code === 500 || !result.data) {
      console.error(
        `[${formatTime(new Date())}] 🚒 | Background refresh failed for '${cacheKey}': ${result.code} - ${result.message || 'Unknown error'}`
      );
      return;
    }

    // Only cache the data, not the Result wrapper
    await cache.set(cacheKey, result.data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    console.log(`[${formatTime(new Date())}] 🎯 | Background refresh completed for '${cacheKey}'`);
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Background refresh failed for '${cacheKey}':`,
      err
    );
  }
}
