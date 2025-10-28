import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { logCacheEvent } from '../cache';
import { cacheRefreshTimes } from '../metrics';

export async function forceRefreshStaticCache(sheetName: string, cacheKey: string) {
  let start_time = Date.now();

  try {
    const result = await fetchSheetData('STATIC', sheetName);
    
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

    // Only cache the data, not the Result wrapper
    await cache.set(cacheKey, result.data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    logCacheEvent('🎯 Static cache refreshed', cacheKey);
    const responseTime = Number((Date.now() - start_time).toFixed(2));

    return {
      executionTime: responseTime,
    };
  } catch (error) {
    logCacheEvent('🚒 Failed to refresh static cache', cacheKey, String(error));
    throw error;
  }
}

export async function forceRefreshDynamicCache(sheet_tab: string) {
  let start_time = Date.now();

  try {
    const result = await fetchSheetData('DYNAMIC', sheet_tab);
    
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

    // Only cache the data, not the Result wrapper
    await cache.set(`dynamic_${sheet_tab}`, result.data);
    cacheRefreshTimes.set(`dynamic_${sheet_tab}`, Date.now());

    logCacheEvent('🎯 Dynamic cache refreshed', sheet_tab);
    const responseTime = Number((Date.now() - start_time).toFixed(2));

    return {
      executionTime: responseTime,
    };
  } catch (error) {
    logCacheEvent('🚒 Failed to refresh dynamic cache', sheet_tab, String(error));
    throw error;
  }
}

export { fetchSheetData } from './fetchSheetData';
export { getTabNameById } from './getTabNameById';
