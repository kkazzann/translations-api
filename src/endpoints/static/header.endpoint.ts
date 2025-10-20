import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug, forceRefreshStaticCache } from '../../sheetsUtils';

export function registerHeaderGroup(parent: any) {
  parent.group('/header', (_header: any) =>
    _header
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('HEADER', 'header_all');
      })

      .get('/force-refresh', async () => {
        return await forceRefreshStaticCache('HEADER', 'header_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            // Use cache.wrap to respect refreshThreshold, not direct cache.get
            const cacheEntry = await cache.wrap('header_all', async () => {
              // This should not normally execute since getDataFromStaticSheet already populated it
              // But if cache expired, we need to refetch
              const { getDataFromStaticSheet } = await import('../../sheetsUtils');
              const result = await getDataFromStaticSheet('HEADER', 'header_all');
              return result.data;
            });

            return {
              message: 'Available language slugs',
              data: (cacheEntry as any)?.slug ?? 'none',
            };
          })

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get('/', async ({ params: { language_slug } }: any) => {
              return await getStaticTranslationsBySlug('header_all', language_slug);
            })
          )
      )
  );

  return parent;
}
