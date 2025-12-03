// This file contains utility functions and variables related to metrics tracking.

// Track when cache entries were last refreshed
export const cacheRefreshTimes = new Map<string, number>();
export const REFRESH_THRESHOLD_MS = 60 * 1000; // 1 minute

// Track cache hits and misses for statistics
export const cacheHits = new Map<string, number>();
export const cacheMisses = new Map<string, number>();

// Track response times
export const cacheHitResponseTimes: number[] = [];
export const cacheMissResponseTimes: number[] = [];
const MAX_RESPONSE_TIME_SAMPLES = 100; // Keep last 100 samples

// Track requests per minute
export const requestTimestamps: number[] = [];
const RPM_WINDOW_MS = 60 * 1000; // 1 minute window
// Long-term request history for stats (used to build RPM history and recentQueries)
export const requestHistory: Array<{ name?: string; time: number }> = [];
const MAX_REQUEST_HISTORY = 10000; // cap to avoid unbounded growth

// Track top requested keys and languages (for static endpoints)
export const keyRequestCounts = new Map<string, number>();
export const languageRequestCounts = new Map<string, number>();

// Track recently accessed and updated sheets
const dynamicSheetAccesses = new Map<string, number>(); // sheetTab -> lastAccessTime
const dynamicSheetUpdates = new Map<string, number>(); // sheetTab -> lastUpdateTime
const staticSheetAccesses = new Map<string, number>(); // cacheKey -> lastAccessTime
const staticSheetUpdates = new Map<string, number>(); // cacheKey -> lastUpdateTime

export function recordCacheHit(key: string) {
  cacheHits.set(key, (cacheHits.get(key) || 0) + 1);
}

export function recordCacheMiss(key: string, isPrewarm: boolean = false) {
  // Only count as miss if it's not a prewarm operation
  if (!isPrewarm) {
    cacheMisses.set(key, (cacheMisses.get(key) || 0) + 1);
  }
}

export function recordResponseTime(isCacheHit: boolean, timeMs: number) {
  if (isCacheHit) {
    cacheHitResponseTimes.push(timeMs);
    if (cacheHitResponseTimes.length > MAX_RESPONSE_TIME_SAMPLES) {
      cacheHitResponseTimes.shift();
    }
  } else {
    cacheMissResponseTimes.push(timeMs);
    if (cacheMissResponseTimes.length > MAX_RESPONSE_TIME_SAMPLES) {
      cacheMissResponseTimes.shift();
    }
  }
}

export function recordRequest() {
  const now = Date.now();
  requestTimestamps.push(now);

  // Clean up old timestamps outside the RPM window
  const cutoff = now - RPM_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

export function recordDynamicSheetAccess(sheetTab: string) {
  dynamicSheetAccesses.set(sheetTab, Date.now());
}

export function recordDynamicSheetUpdate(sheetTab: string) {
  dynamicSheetUpdates.set(sheetTab, Date.now());
}

/**
 * Record access to a static sheet endpoint
 */
export function recordStaticSheetAccess(cacheKey: string) {
  staticSheetAccesses.set(cacheKey, Date.now());
}

/**
 * Record update (cache set) for a static sheet
 */
export function recordStaticSheetUpdate(cacheKey: string) {
  staticSheetUpdates.set(cacheKey, Date.now());
}

/**
 * Record a request to a specific cache key (for top requested keys stats)
 */
import { insertRequest } from './db';

export function recordKeyRequest(key: string) {
  keyRequestCounts.set(key, (keyRequestCounts.get(key) || 0) + 1);
  const now = Date.now();
  // add to long-term request history (in-memory)
  requestHistory.push({ name: key, time: now });
  if (requestHistory.length > MAX_REQUEST_HISTORY) requestHistory.shift();

  // persist to sqlite if available (non-blocking)
  try {
    insertRequest(key, now);
  } catch (err) {
    // ignore DB errors
  }
}

/**
 * Record a request for a specific language (for top requested languages stats)
 */
export function recordLanguageRequest(language: string) {
  languageRequestCounts.set(language, (languageRequestCounts.get(language) || 0) + 1);
}

/**
 * Get recently accessed static sheets (for admin stats)
 */
export function getStaticSheetAccesses(): Map<string, number> {
  return new Map(staticSheetAccesses);
}

/**
 * Get recently updated static sheets (for admin stats)
 */
export function getStaticSheetUpdates(): Map<string, number> {
  return new Map(staticSheetUpdates);
}

/**
 * Get recently accessed dynamic sheets (for admin stats)
 */
export function getDynamicSheetAccesses(): Map<string, number> {
  return new Map(dynamicSheetAccesses);
}

/**
 * Get recently updated dynamic sheets (for admin stats)
 */
export function getDynamicSheetUpdates(): Map<string, number> {
  return new Map(dynamicSheetUpdates);
}
