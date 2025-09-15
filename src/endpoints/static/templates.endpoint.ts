import cache, { checkIfPrewarmIsDone } from '../../cacheService';
import { getDataFromStaticSheet, getStaticTranslationsBySlug } from '../../sheetsUtils';

export function registerTemplatesGroup(parent: any) {
  parent.group('/templates', (_templates: any) =>
    _templates
      .get('/', async () => {
        checkIfPrewarmIsDone();
        return await getDataFromStaticSheet('TEMPLATES', 'templates_all');
      })

      .group('/lang', (_lang: any) =>
        _lang
          .get('/', async () => {
            const cacheEntry = await cache.get<{ slug: string[] }>('templates_all');

            return {
              message: 'Available language slugs',
              data: cacheEntry?.slug ?? 'none',
            };
          })

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get('/', async ({ params: { language_slug } }: any) => {
              return await getStaticTranslationsBySlug('templates_all', language_slug);
            })
          )
      )
  );

  return parent;
}
