import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug } from '../../sheetsUtils';

export function registerCategoryLinksGroup(parent: any) {
  parent.group('/category_links', (_category_links: any) =>
    _category_links
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            const cacheEntry = await cache.get<{ slug: string[] }>('category_links_all');

            return {
              message: 'Available language slugs',
              data: cacheEntry?.slug ?? 'none',
            };
          })

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get('/', async ({ params: { language_slug } }: any) => {
              return await getStaticTranslationsBySlug('category_links_all', language_slug);
            })
          )
      )
  );

  return parent;
}
