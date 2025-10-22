import { PREWARM_DONE } from '.';
import cache, { checkIfPrewarmIsDone, setPrewarmDone } from './cacheService';
import { getStaticTranslations, getDynamicTranslations } from './googleAuth';
import { formatTime } from './timeUtils';

async function fetchSheetData(spreadsheet: string, sheetName: string) {
  let document;

  switch (spreadsheet) {
    case 'STATIC':
      document = await getStaticTranslations();
      break;
    case 'DYNAMIC':
      document = await getDynamicTranslations();
      break;
    default:
      throw new Error(`Unknown spreadsheet type: ${spreadsheet}`);
  }

  const sheet = document.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(
      JSON.stringify({
        status: 500,
        message: `Sheet '${sheetName}' not found in ${spreadsheet} translations document.`,
      })
    );
  }

  await sheet.loadHeaderRow();

  const headers = sheet.headerValues;
  const rows = await sheet.getRows();
  const result: { [key: string]: any } = {};

  // replace newlines with <br /> and trim whitespace
  for (const header of headers)
    result[header] = rows.map((row) => row.get(header)?.replaceAll('\n', '<br />').trim());

  return result;
}

// Track when cache entries were last refreshed
const cacheRefreshTimes = new Map<string, number>();
const REFRESH_THRESHOLD_MS = 60 * 1000; // 1 minute

// Track cache hits and misses for statistics
const cacheHits = new Map<string, number>();
const cacheMisses = new Map<string, number>();

// Track response times
const cacheHitResponseTimes: number[] = [];
const cacheMissResponseTimes: number[] = [];
const MAX_RESPONSE_TIME_SAMPLES = 100; // Keep last 100 samples

// Track requests per minute
const requestTimestamps: number[] = [];
const RPM_WINDOW_MS = 60 * 1000; // 1 minute window

// Track top requested keys and languages (for static endpoints)
const keyRequestCounts = new Map<string, number>();
const languageRequestCounts = new Map<string, number>();

// Track recently accessed and updated dynamic sheets
const dynamicSheetAccesses = new Map<string, number>(); // sheetTab -> lastAccessTime
const dynamicSheetUpdates = new Map<string, number>(); // sheetTab -> lastUpdateTime

function recordCacheHit(key: string) {
  cacheHits.set(key, (cacheHits.get(key) || 0) + 1);
}

function recordCacheMiss(key: string, isPrewarm: boolean = false) {
  // Only count as miss if it's not a prewarm operation
  if (!isPrewarm) {
    cacheMisses.set(key, (cacheMisses.get(key) || 0) + 1);
  }
}

function recordResponseTime(isCacheHit: boolean, timeMs: number) {
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

function recordRequest() {
  const now = Date.now();
  requestTimestamps.push(now);

  // Clean up old timestamps outside the RPM window
  const cutoff = now - RPM_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

function recordKeyRequest(key: string) {
  keyRequestCounts.set(key, (keyRequestCounts.get(key) || 0) + 1);
}

function recordLanguageRequest(language: string) {
  languageRequestCounts.set(language, (languageRequestCounts.get(language) || 0) + 1);
}

function recordDynamicSheetAccess(sheetTab: string) {
  dynamicSheetAccesses.set(sheetTab, Date.now());
}

function recordDynamicSheetUpdate(sheetTab: string) {
  dynamicSheetUpdates.set(sheetTab, Date.now());
}

export async function getDataFromStaticSheet(
  sheetName: string,
  cacheKey: string,
  isPrewarm: boolean = false
) {
  let start_time = Date.now();

  try {
    recordRequest(); // Track request for RPM
    recordKeyRequest(cacheKey); // Track key popularity

    // Check if we have cached data
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      recordCacheHit(cacheKey);
      const responseTime = Date.now() - start_time;
      recordResponseTime(true, responseTime);

      const lastRefreshTime = cacheRefreshTimes.get(cacheKey) || 0;
      const timeSinceRefresh = Date.now() - lastRefreshTime;

      // If data is older than refresh threshold, trigger background refresh
      if (timeSinceRefresh > REFRESH_THRESHOLD_MS) {
        console.log(
          `[${formatTime(
            new Date()
          )}] 🔄 | Triggering background refresh for '${cacheKey}' (${Math.round(
            timeSinceRefresh / 1000
          )}s old)`
        );

        // Background refresh - don't await
        refreshCacheInBackground(sheetName, cacheKey);
      }

      console.log(
        `[${formatTime(new Date())}] ⚡ | Cache hit: '${cacheKey}' (age: ${Math.round(
          timeSinceRefresh / 1000
        )}s)`
      );

      return {
        message: `Cache hit - '${cacheKey}'`,
        dataOrigin: 'cache',
        executionTime: `${responseTime}ms`,
        data: cachedData,
      };
    }

    // Cache miss - fetch data synchronously
    recordCacheMiss(cacheKey, isPrewarm);
    console.log(
      `[${formatTime(
        new Date()
      )}] 🎯 | Cache miss: fetching fresh data for '${cacheKey}' from sheet '${sheetName}'`
    );

    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    const responseTime = Date.now() - start_time;
    recordResponseTime(false, responseTime);

    console.log(`[${formatTime(new Date())}] 🎯 | New static cache entry: '${cacheKey}'`);

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${responseTime}ms`,
      data,
    };
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Failed to get data for: '${cacheKey}', error: ${String(
        err
      )}`
    );
    return {
      message: `Error fetching data.`,
      error: String(err),
    };
  }
}

// Background refresh function
async function refreshCacheInBackground(sheetName: string, cacheKey: string) {
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

export async function getStaticTranslationsBySlug(cacheKey: string, languageSlug: string) {
  const start_time = Date.now();
  checkIfPrewarmIsDone();

  recordRequest(); // Track request for RPM
  recordLanguageRequest(languageSlug); // Track language popularity

  // Check if data is already in cache (cache hit)
  const cachedData = await cache.get(cacheKey);
  const isCacheHit = cachedData !== undefined;

  if (isCacheHit) {
    recordCacheHit(cacheKey);
  }

  // Use cache.wrap to respect refreshThreshold - this will refresh in background when stale
  let cacheEntry: Record<string, any[]>;

  try {
    cacheEntry = await cache.wrap(cacheKey, async () => {
      // This block only runs on cache miss
      if (!isCacheHit) {
        recordCacheMiss(cacheKey);
      }
      // Map common cache keys to sheet names so we can fetch the sheet when missing/stale
      const keyToSheetMap: Record<string, string> = {
        header_all: 'HEADER',
        footer_all: 'FOOTER',
        templates_all: 'TEMPLATES',
        category_links_all: 'CATEGORY_LINKS',
        category_titles_all: 'CATEGORY_TITLES',
      };

      const sheetName = keyToSheetMap[cacheKey];
      if (!sheetName) {
        throw new Error(`No sheet mapping for cache key: ${cacheKey}`);
      }

      const result = await fetchSheetData('STATIC', sheetName);
      console.log(
        `[${formatTime(
          new Date()
        )}] 🎯 | Refilled cache entry: '${cacheKey}' via sheet '${sheetName}' (background refresh)`
      );
      return result;
    });
  } catch (err) {
    console.error(`[${formatTime(new Date())}] 🚒 | Failed to refresh cache '${cacheKey}':`, err);
    return {
      message: `Error fetching data for '${cacheKey}'`,
      error: String(err),
    };
  }

  const slugArray = Array.isArray(cacheEntry!.slug) ? cacheEntry!.slug : [];

  const idx = slugArray.findIndex((s) => s === languageSlug);

  if (idx === -1) {
    return {
      message: `No translations for ${languageSlug}`,
      data: null,
    };
  }

  const values: Record<string, any> = {};

  // slice 1 = skip "slug" property
  const entriesWithoutSlug = Object.entries(cacheEntry!).slice(1);

  for (const [propertyKeys, translationsArray] of entriesWithoutSlug) {
    if (Array.isArray(translationsArray)) {
      values[propertyKeys] = translationsArray[idx] ?? null;
    } else {
      return {
        message: `Error! No array found!`,
      };
    }
  }

  // Record response time
  const responseTime = Date.now() - start_time;
  recordResponseTime(isCacheHit, responseTime);

  return {
    message: `Translations for ${languageSlug}`,
    data: values,
  };
}

const ALLOWED_DYNAMIC_HEADERS = [
  'UK',
  'PL',
  'DE',
  'AT',
  'CH',
  'NL',
  'FR',
  'CHFR',
  'ES',
  'PT',
  'IT',
  'DK',
  'NO',
  'FI',
  'SE',
  'CZ',
  'SK',
  'HU',
  'BEFR',
  'BENL',
  'RO',
  'CHIT',
];

// Header transformation mapping: spreadsheet_header -> api_output_header
const HEADER_TRANSFORMATIONS: Record<string, string> = {
  CH: 'CHDE',
  // Add more transformations here if needed in the future
  // 'OLD_NAME': 'NEW_NAME',
};

function filterToAllowedHeaders(data: Record<string, any[]>) {
  const filtered: Record<string, any[]> = {};

  for (const [header, values] of Object.entries(data)) {
    if (ALLOWED_DYNAMIC_HEADERS.includes(header)) {
      // Transform header name if mapping exists, otherwise use original
      const outputHeader = HEADER_TRANSFORMATIONS[header] || header;
      filtered[outputHeader] = values;
    }
  }

  return filtered;
}

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

      // If data is older than refresh threshold, trigger background refresh
      if (timeSinceRefresh > REFRESH_THRESHOLD_MS) {
        console.log(
          `[${formatTime(
            new Date()
          )}] 🔄 | Triggering background refresh for '${cacheKey}' (${Math.round(
            timeSinceRefresh / 1000
          )}s old)`
        );

        // Background refresh - don't await
        refreshDynamicCacheInBackground(sheetTab, cacheKey);
      }

      console.log(
        `[${formatTime(new Date())}] ⚡ | Cache hit: '${cacheKey}' (age: ${Math.round(
          timeSinceRefresh / 1000
        )}s)`
      );

      return {
        message: `Cache hit - '${cacheKey}'`,
        dataOrigin: 'cache',
        executionTime: `${responseTime}ms`,
        data: filterToAllowedHeaders(cachedData),
      };
    }

    // Cache miss - fetch data synchronously
    recordCacheMiss(cacheKey);
    console.log(
      `[${formatTime(
        new Date()
      )}] 🎯 | Cache miss: fetching fresh data for '${cacheKey}' from sheet '${sheetTab}'`
    );

    const data = await fetchSheetData('DYNAMIC', sheetTab);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    recordDynamicSheetUpdate(sheetTab);

    const responseTime = Date.now() - start_time;
    recordResponseTime(false, responseTime);

    console.log(`[${formatTime(new Date())}] 🎯 | New dynamic cache entry: '${cacheKey}'`);

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${responseTime}ms`,
      data: filterToAllowedHeaders(data as Record<string, any[]>),
    };
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Failed to populate dynamic cache '${cacheKey}':`,
      err
    );
    throw err;
  }
}

// Background refresh function for dynamic cache
async function refreshDynamicCacheInBackground(sheetTab: string, cacheKey: string) {
  try {
    const data = await fetchSheetData('DYNAMIC', sheetTab);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());
    recordDynamicSheetUpdate(sheetTab);
    console.log(`[${formatTime(new Date())}] 🎯 | Background refresh completed for '${cacheKey}'`);
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Background refresh failed for '${cacheKey}':`,
      err
    );
  }
}

export async function forceRefreshStaticCache(sheetName: string, cacheKey: string) {
  const start_time = Date.now();

  try {
    console.log(
      `[${formatTime(
        new Date()
      )}] 🔄 | Force refresh initiated for '${cacheKey}' from sheet '${sheetName}'`
    );

    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    console.log(
      `[${formatTime(new Date())}] ✅ | Force refresh completed for '${cacheKey}' in ${
        Date.now() - start_time
      }ms`
    );

    return {
      message: `Force refresh successful for '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${Date.now() - start_time}ms`,
      data: data,
    };
  } catch (err) {
    console.error(`[${formatTime(new Date())}] 🚒 | Force refresh failed for '${cacheKey}':`, err);
    return {
      message: `Error during force refresh of '${cacheKey}'`,
      error: String(err),
    };
  }
}

export async function forceRefreshDynamicCache(sheetTab: string) {
  const cacheKey = `dynamic_${sheetTab}`;
  const start_time = Date.now();

  try {
    console.log(
      `[${formatTime(
        new Date()
      )}] 🔄 | Force refresh initiated for '${cacheKey}' from sheet '${sheetTab}'`
    );

    const data = await fetchSheetData('DYNAMIC', sheetTab);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    console.log(
      `[${formatTime(new Date())}] ✅ | Force refresh completed for '${cacheKey}' in ${
        Date.now() - start_time
      }ms`
    );

    return {
      message: `Force refresh successful for '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${Date.now() - start_time}ms`,
      data: filterToAllowedHeaders(data as Record<string, any[]>),
    };
  } catch (err) {
    console.error(`[${formatTime(new Date())}] 🚒 | Force refresh failed for '${cacheKey}':`, err);
    return {
      message: `Error during force refresh of '${cacheKey}'`,
      error: String(err),
    };
  }
}

/**
 * Prewarm static endpoints on startup. This will populate the cache synchronously
 * so the API can start serving requests without hitting Google Sheets on first
 * user request.
 */
export async function prewarmStaticEndpoints() {
  console.log('Prewarming static endpoints...');

  await getDataFromStaticSheet('HEADER', 'header_all', true);
  await getDataFromStaticSheet('FOOTER', 'footer_all', true);
  await getDataFromStaticSheet('TEMPLATES', 'templates_all', true);
  await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all', true);
  await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all', true);

  setPrewarmDone(true);

  console.log('Prewarming static endpoints complete. API is ready to serve requests!');
}

/**
 * Return cache statistics for admin UI.
 * For each tracked cache key we return last refresh timestamp, age and a simple size metric.
 */
export async function getCacheStats() {
  const stats: Array<Record<string, any>> = [];
  let totalSize = 0;
  let totalAgeMs = 0;
  let totalHits = 0;
  let totalMisses = 0;

  for (const [key, ts] of cacheRefreshTimes.entries()) {
    try {
      const data = await cache.get(key as any);

      let size = 0;
      if (data == null) size = 0;
      else if (Array.isArray(data)) size = data.length;
      else if (typeof data === 'object') size = Object.keys(data).length;
      else size = 1;

      const ageMs = Date.now() - ts;
      const hits = cacheHits.get(key) || 0;
      const misses = cacheMisses.get(key) || 0;

      totalSize += size;
      totalAgeMs += ageMs;
      totalHits += hits;
      totalMisses += misses;

      stats.push({
        key,
        lastRefresh: ts,
        ageMs,
        size,
        hits,
        misses,
        hitRatio: hits + misses > 0 ? hits / (hits + misses) : 0,
      });
    } catch (err) {
      stats.push({
        key,
        lastRefresh: ts,
        ageMs: Date.now() - ts,
        size: -1,
        hits: 0,
        misses: 0,
        hitRatio: 0,
        error: String(err),
      });
    }
  }

  // Sort stats by size (descending) for topKeys
  const sortedBySize = [...stats].sort((a, b) => b.size - a.size);

  // Calculate average response times
  const avgCacheHitResponseTime =
    cacheHitResponseTimes.length > 0
      ? cacheHitResponseTimes.reduce((a, b) => a + b, 0) / cacheHitResponseTimes.length
      : 0;

  const avgCacheMissResponseTime =
    cacheMissResponseTimes.length > 0
      ? cacheMissResponseTimes.reduce((a, b) => a + b, 0) / cacheMissResponseTimes.length
      : 0;

  const avgOverallResponseTime =
    cacheHitResponseTimes.length + cacheMissResponseTimes.length > 0
      ? [...cacheHitResponseTimes, ...cacheMissResponseTimes].reduce((a, b) => a + b, 0) /
        (cacheHitResponseTimes.length + cacheMissResponseTimes.length)
      : 0;

  // Calculate RPM (requests in the last minute)
  const requestsPerMinute = requestTimestamps.length;

  // Get top requested keys
  const topRequestedKeys = Array.from(keyRequestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }));

  // Get top requested languages
  const topRequestedLanguages = Array.from(languageRequestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }));

  // Get recently accessed dynamic sheets (last 10)
  const recentDynamicSheetAccesses = Array.from(dynamicSheetAccesses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sheetTab, timestamp]) => ({ sheetTab, lastAccess: timestamp }));

  // Get recently updated dynamic sheets (last 10)
  const recentDynamicSheetUpdates = Array.from(dynamicSheetUpdates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sheetTab, timestamp]) => ({ sheetTab, lastUpdate: timestamp }));

  // Calculate cache memory usage estimate (rough estimate based on JSON stringification)
  let cacheMemoryBytes = 0;
  for (const [key, ts] of cacheRefreshTimes.entries()) {
    try {
      const data = await cache.get(key as any);
      if (data) {
        cacheMemoryBytes += JSON.stringify(data).length * 2; // rough estimate (UTF-16)
      }
    } catch (err) {
      // Skip if error
    }
  }

  return {
    generatedAt: Date.now(),
    count: stats.length,
    stats,
    summary: {
      totalCachedItems: totalSize,

      averageAgeMs: stats.length > 0 ? Math.round(totalAgeMs / stats.length) : 0,

      totalHits,
      totalMisses,
      overallHitRatio: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,

      topKeysBySize: sortedBySize.slice(0, 5).map((s) => ({ key: s.key, size: s.size })),

      requestsPerMinute,

      avgOverallResponseTime: Math.round(avgOverallResponseTime * 100) / 100,
      avgCacheHitResponseTime: Math.round(avgCacheHitResponseTime * 100) / 100,
      avgCacheMissResponseTime: Math.round(avgCacheMissResponseTime * 100) / 100,

      topRequestedKeys,
      topRequestedLanguages,

      recentDynamicSheetAccesses,
      recentDynamicSheetUpdates,

      cacheMemoryUsageBytes: cacheMemoryBytes,
      cacheMemoryUsageMB: Math.round((cacheMemoryBytes / 1024 / 1024) * 100) / 100,
    },
  };
}
