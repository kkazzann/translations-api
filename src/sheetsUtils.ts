import { PREWARM_DONE } from '.';
import cache, { checkIfPrewarmIsDone, setPrewarmDone } from './cacheService';
import { getStaticTranslations, getDynamicTranslations } from './googleAuth';
import { formatTime } from './timeUtils';

export async function fetchSheetData(spreadsheet: string, sheetName: string) {
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

export async function getDataFromStaticSheet(sheetName: string, cacheKey: string) {
  let start_time = Date.now();

  try {
    // Check if we have cached data
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
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
        executionTime: `${Date.now() - start_time}ms`,
        data: cachedData,
      };
    }

    // Cache miss - fetch data synchronously
    console.log(
      `[${formatTime(
        new Date()
      )}] 🎯 | Cache miss: fetching fresh data for '${cacheKey}' from sheet '${sheetName}'`
    );

    const data = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${Date.now() - start_time}ms`,
      data: data,
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
  checkIfPrewarmIsDone();

  // Use cache.wrap to respect refreshThreshold - this will refresh in background when stale
  let cacheEntry: Record<string, any[]>;

  try {
    cacheEntry = await cache.wrap(cacheKey, async () => {
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
    // Check if we have cached data
    const cachedData = await cache.get<Record<string, any[]>>(cacheKey);

    if (cachedData) {
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
        executionTime: `${Date.now() - start_time}ms`,
        data: filterToAllowedHeaders(cachedData),
      };
    }

    // Cache miss - fetch data synchronously
    console.log(
      `[${formatTime(
        new Date()
      )}] 🎯 | Cache miss: fetching fresh data for '${cacheKey}' from sheet '${sheetTab}'`
    );

    const data = await fetchSheetData('DYNAMIC', sheetTab);
    await cache.set(cacheKey, data);
    cacheRefreshTimes.set(cacheKey, Date.now());

    console.log(`[${formatTime(new Date())}] 🎯 | New dynamic cache entry: '${cacheKey}'`);

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${Date.now() - start_time}ms`,
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
    console.log(`[${formatTime(new Date())}] 🎯 | Background refresh completed for '${cacheKey}'`);
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Background refresh failed for '${cacheKey}':`,
      err
    );
  }
}

export async function getDynamicTranslationsBySlug(sheetTab: string, languageSlug: string) {
  checkIfPrewarmIsDone();

  const envelope = await getDynamicSheetCached(sheetTab);
  const sheet = (envelope as any).data ?? envelope;

  const slugArray = Array.isArray((sheet as any).slug) ? (sheet as any).slug : [];
  const idx = slugArray.findIndex((s: any) => s === languageSlug);

  if (idx === -1) {
    return {
      message: `No translations for ${languageSlug}`,
      data: null,
    };
  }

  const values: Record<string, any> = {};
  const entriesWithoutSlug = Object.entries(sheet).slice(1);

  for (const [propertyKeys, translationsArray] of entriesWithoutSlug) {
    if (Array.isArray(translationsArray)) {
      values[propertyKeys] = translationsArray[idx] ?? null;
    } else {
      return {
        message: `Error! No array found!`,
      };
    }
  }

  return {
    message: `Translations for ${languageSlug}`,
    data: values,
  };
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

  await getDataFromStaticSheet('HEADER', 'header_all');
  await getDataFromStaticSheet('FOOTER', 'footer_all');
  await getDataFromStaticSheet('TEMPLATES', 'templates_all');
  await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
  await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');

  setPrewarmDone(true);

  console.log('Prewarming static endpoints complete. API is ready to serve requests!');
}
