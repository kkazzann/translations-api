import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { getDataFromStaticSheet } from '../../utils/sheets/getDataFromStaticSheet';
import { getStaticTranslationsBySlug } from '../../utils/sheets/getStaticTranslationsBySlug';
import { Result } from '../../utils/cache';
import { forceRefreshStaticCache } from '../../utils/sheets';
import { t } from 'elysia';

export function registerCategoryLinksGroup(parent: any) {
  parent.group('/category_links', (_category_links: any) =>
    _category_links
      .get(
        '/',
        {
          tags: ['Static', 'CategoryLinks'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Category links fetched successfully'),
              data: t.Any(),
            }),
            404: t.Object({
              code: t.Literal(404),
              message: t.Literal('No translations for category_links'),
              data: t.Null(),
            }),
            500: t.Object({
              code: t.Literal(500),
              message: t.Literal('Error! No array found!'),
              data: t.Null(),
            }),
          },
        },
        async (): Promise<Result<any>> => {
          checkIfPrewarmIsDone();
          const data = await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
          return {
            code: 200,
            message: 'Category links fetched successfully',
            data,
          };
        }
      )

      .get(
        '/force-refresh',
        {
          tags: ['Static', 'CategoryLinks'],
          response: {
            200: t.Object({
              code: t.Number(),
              message: t.String(),
              data: t.Null(),
            }),
            404: t.Object({
              code: t.Literal(404),
              message: t.String(),
              data: t.Null(),
            }),
            500: t.Object({
              code: t.Literal(500),
              message: t.String(),
              data: t.Null(),
            }),
          },
        },
        async (): Promise<Result<null>> => {
          await forceRefreshStaticCache('CATEGORY_LINKS', 'category_links_all');
          return {
            code: 200,
            message: `Cache refreshed for 'CATEGORY_LINKS'`
          };
        }
      )

      .group('/lang', (_lang: any) =>
        _lang
          .get(
            '/',
            {
              tags: ['Static', 'CategoryLinks'],
              response: {
                200: t.Object({
                  code: t.Number(),
                  message: t.String(),
                  data: t.Any(),
                }),
                404: t.Object({
                  code: t.Literal(404),
                  message: t.String(),
                  data: t.Null(),
                }),
                500: t.Object({
                  code: t.Literal(500),
                  message: t.String(),
                  data: t.Null(),
                }),
              },
            },
            async (): Promise<Result<any>> => {
              const cacheEntry = await cache.wrap('category_links_all', async () => {
                const result = await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
                return result.data;
              });

              return {
                code: 200,
                message: 'Available language slugs',
                data: (cacheEntry as any)?.slug ?? 'none',
              };
            }
          )

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get(
              '/',
              async ({ params: { language_slug } }: any): Promise<Result<any>> => {
                const data = await getStaticTranslationsBySlug('category_links_all', language_slug);
                return {
                  code: 200,
                  message: `Translations for language slug '${language_slug}'`,
                  data,
                };
              },
              {
                tags: ['Static', 'Category Links'],
                response: {
                  200: t.Object({
                    code: t.Number(),
                    message: t.String(),
                    data: t.Any(),
                  }),
                  404: t.Object({
                    code: t.Literal(404),
                    message: t.String(),
                    data: t.Null(),
                  }),
                  500: t.Object({
                    code: t.Literal(500),
                    message: t.String(),
                    data: t.Null(),
                  }),
                },
              }
            )
          )
      )
  );

  return parent;
}
