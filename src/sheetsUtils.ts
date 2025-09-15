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

  for (const header of headers) result[header] = rows.map((row) => row.get(header));

  return result;
}

export async function getDataFromStaticSheet(sheetName: string, cacheKey: string) {
  let start_time = Date.now();

  // 🎯 CACHE HIT ---------
  // If value exists, return it and go for a background refresh
  // If missing, await the wrap call to populate the cache before returning.
  const cached_values = await cache.get(cacheKey);

  if (cached_values) {
    console.debug('getdatafromstaticsheet - cached values exist');
    console.log(`[${formatTime(new Date())}] ⚡ | Cache hit: '${cacheKey}'`);

    // CACHE WRAP RUNS IN BACKGROUND ---------
    // cache.wrap will only run the fetch function in background when remaining TTL < refreshThreshold.
    cache
      .wrap(cacheKey, async () => {
        const data = await fetchSheetData('STATIC', sheetName);
        console.log(`[${formatTime(new Date())}] 🎯 | Refreshed cache entry: '${cacheKey}'`);
        return data;
      })
      .catch((err) =>
        console.error(`[${formatTime(new Date())}] Error refreshing cache '${cacheKey}':`, err)
      );

    return {
      message: `Cache hit - '${cacheKey}'`,
      dataOrigin: 'cache',
      executionTime: `${Date.now() - start_time}ms`,
      data: cached_values,
    };
  }

  // 💨 CACHE MISS ---------
  // Fetch data and populate cache (await wrap so first caller
  // gets the data synchronously).
  try {
    console.debug('getdatafromstaticsheet - cached values do NOT exist');

    const data = await cache.wrap(cacheKey, async () => {
      const result = await fetchSheetData('STATIC', sheetName);
      console.log(`[${formatTime(new Date())}] 🎯 | New cache entry: '${cacheKey}'`);
      return result;
    });

    return {
      message: `New cache entry: '${cacheKey}'`,
      dataOrigin: 'googleAPI',
      executionTime: `${Date.now() - start_time}ms`,
      data: data,
    };
  } catch (err) {
    console.error(
      `[${formatTime(new Date())}] 🚒 | Prewarm failed for: '${cacheKey}', error: ${String(err)}`
    );
    return {
      message: `Error fetching data.`,
      error: String(err),
    };
  }
}

export async function getStaticTranslationsBySlug(cacheKey: string, languageSlug: string) {
  checkIfPrewarmIsDone();

  // Try to read cache; if missing (TTL expired), refresh it synchronously
  let cacheEntry = await cache.get<Record<string, any[]>>(cacheKey);

  if (!cacheEntry) {
    // Map common cache keys to sheet names so we can fetch the sheet when missing
    const keyToSheetMap: Record<string, string> = {
      header_all: 'HEADER',
      footer_all: 'FOOTER',
      templates_all: 'TEMPLATES',
      category_links_all: 'CATEGORY_LINKS',
      category_titles_all: 'CATEGORY_TITLES',
    };

    const sheetName = keyToSheetMap[cacheKey];

    if (!sheetName) {
      return {
        message: `Cache miss for '${cacheKey}' and no sheet mapping available to refresh it.`,
        data: null,
      };
    }

    try {
      cacheEntry = await cache.wrap(cacheKey, async () => {
        const result = await fetchSheetData('STATIC', sheetName);
        console.log(
          `[${formatTime(
            new Date()
          )}] 🎯 | Refilled cache entry: '${cacheKey}' via sheet '${sheetName}'`
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

function filterToAllowedHeaders(data: Record<string, any[]>) {
  const out: Record<string, any[]> = {};
  // always preserve slug if present
  if ('slug' in data) {
    out['slug'] = data['slug'];
  }

  for (const header of ALLOWED_DYNAMIC_HEADERS) {
    if (header in data) out[header] = data[header];
  }

  return out;
}

export async function getDynamicSheetCached(sheetTab: string) {
  const cacheKey = `dynamic_${sheetTab}`;
  const start_time = Date.now();

  const cached = await cache.get<Record<string, any[]>>(cacheKey);
  if (cached) {
    console.log(`[${formatTime(new Date())}] ⚡ | Cache hit: '${cacheKey}'`);

    // trigger background refresh
    cache
      .wrap(cacheKey, async () => {
        const refreshed = await fetchSheetData('DYNAMIC', sheetTab);
        console.log(`[${formatTime(new Date())}] 🎯 | Refreshed dynamic cache: '${cacheKey}'`);
        return refreshed;
      })
      .catch((err) =>
        console.error(
          `[${formatTime(new Date())}] Error refreshing dynamic cache '${cacheKey}':`,
          err
        )
      );

    return {
      message: `Cache hit - '${cacheKey}'`,
      dataOrigin: 'cache',
      executionTime: `${Date.now() - start_time}ms`,
      data: filterToAllowedHeaders(cached),
    };
  }

  // cache miss: populate synchronously
  try {
    const data = await cache.wrap(cacheKey, async () => {
      const result = await fetchSheetData('DYNAMIC', sheetTab);
      console.log(`[${formatTime(new Date())}] 🎯 | New dynamic cache entry: '${cacheKey}'`);
      return result;
    });

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

// Concurrency guard to avoid overlapping refills
let staticRefillInProgress = false;

/**
 * Refill all static sheet caches by fetching fresh data and writing it into the cache.
 * This forces a refresh every time it's called (useful for scheduled jobs).
 */
export async function refillStaticSheets() {
  if (staticRefillInProgress) {
    console.log('refillStaticSheets: already running, skipping this cycle');
    return;
  }

  staticRefillInProgress = true;

  const mappings: Array<{ sheet: string; cacheKey: string }> = [
    { sheet: 'HEADER', cacheKey: 'header_all' },
    { sheet: 'FOOTER', cacheKey: 'footer_all' },
    { sheet: 'TEMPLATES', cacheKey: 'templates_all' },
    { sheet: 'CATEGORY_LINKS', cacheKey: 'category_links_all' },
    { sheet: 'CATEGORY_TITLES', cacheKey: 'category_titles_all' },
  ];

  console.log(
    `[${formatTime(new Date())}] 🔁 | Starting static refill for ${mappings.length} sheets`
  );

  for (const { sheet, cacheKey } of mappings) {
    try {
      // Use cache.wrap so cache-manager tracks TTL/refreshThreshold consistently
      await cache.wrap(cacheKey, async () => {
        const fresh = await fetchSheetData('STATIC', sheet);
        console.log(
          `[${formatTime(
            new Date()
          )}] 🎯 | Refilled cache entry: '${cacheKey}' from sheet '${sheet}'`
        );
        return fresh;
      });
    } catch (err) {
      console.error(
        `[${formatTime(
          new Date()
        )}] 🚒 | Failed to refill cache '${cacheKey}' from sheet '${sheet}':`,
        err
      );
    }
  }

  staticRefillInProgress = false;

  console.log(`[${formatTime(new Date())}] ✅ | Static refill complete`);
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
