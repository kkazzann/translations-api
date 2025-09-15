import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import cache, { checkIfPrewarmIsDone, prewarmStaticEndpoints } from './cacheService';
import { getStaticTranslations } from './googleAuth';
import {
  fetchSheetData,
  getDataFromStaticSheet,
  getStaticTranslationsBySlug,
  getDynamicSheetCached,
} from './sheetsUtils';
import { getLocalLanIp } from './networkUtils';

export const API_PREFIX = '/translations-api/v1';
export let PREWARM_DONE = false;

const localIp = getLocalLanIp();

export const app = new Elysia({
  prefix: API_PREFIX,
  normalize: true,
})
  // automatic scalar documentation
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Beliani Translations API',
          version: '1.0.0',
        },
      },
    })
  )

  .get('/', () => {
    return {
      message: 'Translations API',
      docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
    };
  })

  .group('/static', (_static) =>
    _static
      .get('/', () => {
        return {
          message: 'Root endpoint for static content',
          docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
        };
      })

      .group('/header', (_header) =>
        _header

          .get('/', async () => {
            checkIfPrewarmIsDone();
            return await getDataFromStaticSheet('HEADER', 'header_all');
          })

          .group('/lang', (_lang) =>
            _lang
              .get('/', async () => {
                const cacheEntry = await cache.get<{ slug: string[] }>('header_all');

                return {
                  message: 'Available language slugs',
                  data: cacheEntry?.slug ?? 'none',
                };
              })

              .group('/:language_slug', (_langSlug) =>
                _langSlug.get('/', async ({ params: { language_slug } }) => {
                  return await getStaticTranslationsBySlug('header_all', language_slug);
                })
              )
          )
      )

      .group('/footer', (_footer) =>
        _footer

          .get('/', async () => {
            checkIfPrewarmIsDone();
            return await getDataFromStaticSheet('FOOTER', 'footer_all');
          })

          .group('/lang', (_lang) =>
            _lang
              .get('/', async () => {
                const cacheEntry = await cache.get<{ slug: string[] }>('footer_all');

                return {
                  message: 'Available language slugs',
                  data: cacheEntry?.slug ?? 'none',
                };
              })

              .group('/:language_slug', (_langSlug) =>
                _langSlug.get('/', async ({ params: { language_slug } }) => {
                  return await getStaticTranslationsBySlug('footer_all', language_slug);
                })
              )
          )
      )

      .group('/templates', (_templates) =>
        _templates

          .get('/', async () => {
            checkIfPrewarmIsDone();
            return await getDataFromStaticSheet('TEMPLATES', 'templates_all');
          })

          .group('/lang', (_lang) =>
            _lang
              .get('/', async () => {
                const cacheEntry = await cache.get<{ slug: string[] }>('templates_all');

                return {
                  message: 'Available language slugs',
                  data: cacheEntry?.slug ?? 'none',
                };
              })

              .group('/:language_slug', (_langSlug) =>
                _langSlug.get('/', async ({ params: { language_slug } }) => {
                  return await getStaticTranslationsBySlug('templates_all', language_slug);
                })
              )
          )
      )

      .group('/category_titles', (_category_titles) =>
        _category_titles

          .get('/', async () => {
            checkIfPrewarmIsDone();
            return await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');
          })

          .group('/lang', (_lang) =>
            _lang
              .get('/', async () => {
                const cacheEntry = await cache.get<{ slug: string[] }>('category_titles_all');

                return {
                  message: 'Available language slugs',
                  data: cacheEntry?.slug ?? 'none',
                };
              })

              .group('/:language_slug', (_langSlug) =>
                _langSlug.get('/', async ({ params: { language_slug } }) => {
                  return await getStaticTranslationsBySlug('category_titles_all', language_slug);
                })
              )
          )
      )

      .group('/category_links', (_category_links) =>
        _category_links

          .get('/', async () => {
            checkIfPrewarmIsDone();
            return await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
          })

          .group('/lang', (_lang) =>
            _lang
              .get('/', async () => {
                const cacheEntry = await cache.get<{ slug: string[] }>('category_links_all');

                return {
                  message: 'Available language slugs',
                  data: cacheEntry?.slug ?? 'none',
                };
              })

              .group('/:language_slug', (_langSlug) =>
                _langSlug.get('/', async ({ params: { language_slug } }) => {
                  return await getStaticTranslationsBySlug('category_links_all', language_slug);
                })
              )
          )
      )
  )

  .group('/dynamic', (_dynamic) =>
    _dynamic
      .get('/', () => {
        return {
          message: 'Root endpoint for dynamic content',
          docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
        };
      })

      // /dynamic/:sheet_tab -> returns filtered headers & full sheet (cached)
      .group('/:sheet_tab', (_sheet_tab) =>
        _sheet_tab
          .get('/', async ({ params: { sheet_tab } }) => {
            const envelope = await getDynamicSheetCached(sheet_tab);

            return {
              message:
                (envelope as any).message ??
                `Fetching dynamic translations from tab '${sheet_tab}'`,
              data: (envelope as any).data ?? envelope,
              dataOrigin: (envelope as any).dataOrigin,
              executionTime: (envelope as any).executionTime,
            };
          })

          // /dynamic/:sheet_tab/:range -> returns filtered headers for given range
          .get('/:range', async ({ params: { sheet_tab, range } }) => {
            // range operates on ROWS (1-based). Return mapping: HEADER -> [values...]
            const envelope = await getDynamicSheetCached(sheet_tab);
            const sheet = (envelope as any).data ?? envelope;

            const isRangeValid = /^\d+:\d+$|^\d+$/.test(range);
            if (!isRangeValid) {
              return {
                message: `Error! Invalid range format! Use "start:end" or "index" format.`,
              };
            }

            const [startStr, endStr] = range.split(':');
            const start = parseInt(startStr, 10) - 2;
            const end = endStr ? parseInt(endStr, 10) - 2 : start;

            const result: Record<string, any[]> = {};

            // For each header (except slug), slice its values array by row range
            for (const [header, values] of Object.entries(sheet)) {
              if (header === 'slug') continue;
              if (!Array.isArray(values)) continue;

              // slice safely even if end is out of bounds
              result[header] = values
                .slice(start, end + 1)
                .map((v) => (v === undefined ? null : v));
            }

            return {
              message: `Fetching dynamic translations from tab '${sheet_tab}'`,
              data: result,
            };
          })
      )
  );

await prewarmStaticEndpoints();

// Bind to all interfaces so the server is reachable from the LAN.
// Elysia's listen accepts an options object where we can set hostname to 0.0.0.0
// which means "listen on all network interfaces".
app.listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`\n🔥 API is running at http://${localIp}:${app.server?.port}${API_PREFIX}\n`);
