import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug } from '../../sheetsUtils';

export function registerFooterGroup(parent: any) {
  parent.group('/footer', (_footer: any) =>
    _footer
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('FOOTER', 'footer_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            const cacheEntry = await cache.get<{ slug: string[] }>('footer_all');

            return {
              message: 'Available language slugs',
              data: cacheEntry?.slug ?? 'none',
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
