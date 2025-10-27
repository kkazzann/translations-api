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
export const MAX_RESPONSE_TIME_SAMPLES = 100; // Keep last 100 samples

// Track requests per minute
export const requestTimestamps: number[] = [];
export const RPM_WINDOW_MS = 60 * 1000; // 1 minute window

// Track top requested keys and languages (for static endpoints)
export const keyRequestCounts = new Map<string, number>();
export const languageRequestCounts = new Map<string, number>();

// Track recently accessed and updated dynamic sheets
export const dynamicSheetAccesses = new Map<string, number>(); // sheetTab -> lastAccessTime
export const dynamicSheetUpdates = new Map<string, number>(); // sheetTab -> lastUpdateTime

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

export function recordKeyRequest(key: string) {
  keyRequestCounts.set(key, (keyRequestCounts.get(key) || 0) + 1);
}

export function recordLanguageRequest(language: string) {
  languageRequestCounts.set(language, (languageRequestCounts.get(language) || 0) + 1);
}

export function recordDynamicSheetAccess(sheetTab: string) {
  dynamicSheetAccesses.set(sheetTab, Date.now());
}

export function recordDynamicSheetUpdate(sheetTab: string) {
  dynamicSheetUpdates.set(sheetTab, Date.now());
}
