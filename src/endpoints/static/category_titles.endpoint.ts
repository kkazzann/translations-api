import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug } from '../../sheetsUtils';

export function registerCategoryTitlesGroup(parent: any) {
  parent.group('/category_titles', (_category_titles: any) =>
    _category_titles
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            // Use cache.wrap to respect refreshThreshold, not direct cache.get
            const cacheEntry = await cache.wrap('category_titles_all', async () => {
              const { getDataFromStaticSheet } = await import('../../sheetsUtils');
              const result = await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');
              return result.data;
            });

            return {
              message: 'Available language slugs',
              data: (cacheEntry as any)?.slug ?? 'none',
            };
          })

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get('/', async ({ params: { language_slug } }: any) => {
              return await getStaticTranslationsBySlug('category_titles_all', language_slug);
            })
          )
      )
  );

  return parent;
}
