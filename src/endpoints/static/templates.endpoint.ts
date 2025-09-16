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
            // Use cache.wrap to respect refreshThreshold, not direct cache.get
            const cacheEntry = await cache.wrap('templates_all', async () => {
              const { getDataFromStaticSheet } = await import('../../sheetsUtils');
              const result = await getDataFromStaticSheet('TEMPLATES', 'templates_all');
              return result.data;
            });

            return {
              message: 'Available language slugs',
              data: (cacheEntry as any)?.slug ?? 'none',
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
