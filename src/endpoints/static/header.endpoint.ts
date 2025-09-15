import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug } from '../../sheetsUtils';

export function registerHeaderGroup(parent: any) {
  parent.group('/header', (_header: any) =>
    _header
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('HEADER', 'header_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            const cacheEntry = await cache.get<{ slug: string[] }>('header_all');

            return {
              message: 'Available language slugs',
              data: cacheEntry?.slug ?? 'none',
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
