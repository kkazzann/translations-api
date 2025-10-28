import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { Result } from '../../types/cache/Result';
import { forceRefreshStaticCache } from '../../utils/sheets';
import { getDataFromStaticSheet } from '../../utils/sheets/getDataFromStaticSheet';
import { getStaticTranslationsBySlug } from '../../utils/sheets/getStaticTranslationsBySlug';
import { makeResponseSchema } from '../../types/api-response';

const messages = {
  success_refresh: `Cache refreshed!`,
  not_found: 'No translations found!',
  error: 'Error 500! Unexpected error occurred.',
  available_languages: 'Available language slugs fetched successfully',
};

interface EndpointSettings {
  tags: string[];
  endpoint: string;
  sheetName: string;
  cacheKey: string;
  messages: {
    success_fetch: string;
  };
}

function schema(endpoint: EndpointSettings) {
  return makeResponseSchema({
    tags: endpoint.tags,
    messages: {
      success_fetch: endpoint.messages.success_fetch,
      success_refresh: messages.success_refresh,
      not_found: messages.not_found,
      error: messages.error,
    },
  });
}

const endpoints: Record<string, EndpointSettings> = {
  category_links: {
    tags: ['Category Links'],
    endpoint: '/category_links',
    sheetName: 'CATEGORY_LINKS',
    cacheKey: 'category_links_all',
    messages: {
      success_fetch: 'Category links fetched successfully',
    },
  },
  category_titles: {
    tags: ['Category Titles'],
    endpoint: '/category_titles',
    sheetName: 'CATEGORY_TITLES',
    cacheKey: 'category_titles_all',
    messages: {
      success_fetch: 'Category titles fetched successfully',
    },
  },
  footer: {
    tags: ['Footer'],
    endpoint: '/footer',
    sheetName: 'FOOTER',
    cacheKey: 'footer_all',
    messages: {
      success_fetch: 'Footer fetched successfully',
    },
  },
  header: {
    tags: ['Header'],
    endpoint: '/header',
    sheetName: 'HEADER',
    cacheKey: 'header_all',
    messages: {
      success_fetch: 'Header fetched successfully',
    },
  },
  templates: {
    tags: ['Templates'],
    endpoint: '/templates',
    sheetName: 'TEMPLATES',
    cacheKey: 'templates_all',
    messages: {
      success_fetch: 'Templates fetched successfully',
    },
  },
};

export function registerAllAtOnce(parent: any) {
  Object.keys(endpoints).forEach((key: string) => {
    const endp = endpoints[key];

    console.log(`% Registering static endpoint: ${endp.endpoint}`);

    parent.group(endp.endpoint, (group: any) =>
      group
        // get all translations
        .get(
          '/',
          async (): Promise<Result<any>> => {
            checkIfPrewarmIsDone();

            const res = await getDataFromStaticSheet(endp.sheetName, endp.cacheKey);

            return {
              code: 200,
              message: endp.messages.success_fetch,
              executionTime: res.executionTime,
              dataOrigin: res.dataOrigin,
              data: res.data,
            };
          },
          schema(endp)
        )

        // force refresh
        .get(
          '/force-refresh',
          async (): Promise<Result<null>> => {
            const res = await forceRefreshStaticCache(endp.sheetName, endp.cacheKey);

            return {
              code: 200,
              message: messages.success_refresh,
              executionTime: res.executionTime,
            };
          },
          schema(endp)
        )

        .group('/lang', (_lang: any) =>
          _lang
            // list available slugs
            .get(
              '/',
              async (): Promise<Result<any>> => {
                let start_time = Date.now();
                const isCacheHit = (await cache.get(endp.cacheKey)) !== undefined;

                const cacheEntry = await cache.wrap(endp.cacheKey, async () => {
                  const result = await getDataFromStaticSheet(endp.sheetName, endp.cacheKey);
                  return result.data;
                });

                return {
                  code: 200,
                  message: messages.available_languages,
                  executionTime: Number((Date.now() - start_time).toFixed(2)),
                  dataOrigin: isCacheHit ? 'cache' : 'googleAPI',
                  data: cacheEntry.slug,
                };
              },
              schema(endp)
            )

            // get translations by slug
            .group('/:language_slug', (_langSlug: any) =>
              _langSlug.get(
                '/',
                async ({ params: { language_slug }, set }: any): Promise<Result<any>> => {
                  const data = await getStaticTranslationsBySlug(endp.cacheKey, language_slug);

                  // Handle error responses (404, 500)
                  if (data.code === 404 || data.code === 500) {
                    set.status = data.code;
                    return {
                      code: data.code,
                      message: data.code === 404 ? messages.not_found : messages.error,
                    };
                  }

                  // Success response
                  return {
                    code: 200,
                    message: endp.messages.success_fetch,
                    executionTime: data.executionTime,
                    dataOrigin: data.dataOrigin,
                    data: data.data,
                  };
                },
                schema(endp)
              )
            )
        )
    );

    console.log(`@ ${endp.endpoint} registered!`);

    return parent;
  });
}
