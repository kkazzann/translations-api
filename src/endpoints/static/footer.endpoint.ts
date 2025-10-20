import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug, forceRefreshStaticCache } from '../../sheetsUtils';

export function registerFooterGroup(parent: any) {
  parent.group('/footer', (_footer: any) =>
    _footer
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('FOOTER', 'footer_all');
      })

      .get('/force-refresh', async () => {
        return await forceRefreshStaticCache('FOOTER', 'footer_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            // Use cache.wrap to respect refreshThreshold, not direct cache.get
            const cacheEntry = await cache.wrap('footer_all', async () => {
              const { getDataFromStaticSheet } = await import('../../sheetsUtils');
              const result = await getDataFromStaticSheet('FOOTER', 'footer_all');
              return result.data;
            });

            return {
              message: 'Available language slugs',
              data: (cacheEntry as any)?.slug ?? 'none',
            };
          })

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get('/', async ({ params: { language_slug } }: any) => {
              return await getStaticTranslationsBySlug('footer_all', language_slug);
            })
          )
      )
  );

  return parent;
}
