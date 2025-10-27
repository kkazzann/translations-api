import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { getDataFromStaticSheet } from '../../utils/sheets/getDataFromStaticSheet';
import { getStaticTranslationsBySlug } from '../../utils/sheets/getStaticTranslationsBySlug';
import { Result } from '../../utils/cache';
import { forceRefreshStaticCache } from '../../utils/sheets';
import { t } from 'elysia';

export function registerHeaderGroup(parent: any) {
  parent.group('/header', (_header: any) =>
    _header
      .get(
        '/',
        async (): Promise<Result<any>> => {
          checkIfPrewarmIsDone();
          const data = await getDataFromStaticSheet('HEADER', 'header_all');
          return {
            code: 200,
            message: 'Header data fetched successfully',
            data,
          };
        },
        {
          tags: ['Static', 'Header'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Header data fetched successfully'),
              data: t.Any(),
            }),
            404: t.Object({
              code: t.Literal(404),
              message: t.Literal('No translations for header'),
              data: t.Null(),
            }),
            500: t.Object({
              code: t.Literal(500),
              message: t.Literal('Error! No array found!'),
              data: t.Null(),
            }),
          },
        }
      )

      .get(
        '/force-refresh',
        async (): Promise<Result<null>> => {
          await forceRefreshStaticCache('HEADER', 'header_all');
          return {
            code: 200,
            message: `Cache refreshed for 'HEADER'`,
          };
        },
        {
          tags: ['Static', 'Header'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Cache refreshed for HEADER'),
              data: t.Null(),
            }),
            404: t.Object({
              code: t.Literal(404),
              message: t.Literal('No translations for header'),
              data: t.Null(),
            }),
            500: t.Object({
              code: t.Literal(500),
              message: t.Literal('Error! No array found!'),
              data: t.Null(),
            }),
          },
        }
      )

      .group('/lang', (_lang: any) =>
        _lang
          .get(
            '/',
            async (): Promise<Result<any>> => {
              const cacheEntry = await cache.wrap('header_all', async () => {
                const result = await getDataFromStaticSheet('HEADER', 'header_all');
                return result.data;
              });

              return {
                code: 200,
                message: 'Available language slugs',
                data: (cacheEntry as any)?.slug ?? 'none',
              };
            },
            {
              tags: ['Static', 'Header'],
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

          .group('/:language_slug', (_langSlug: any) =>
            _langSlug.get(
              '/',
              async ({ params: { language_slug } }: any): Promise<Result<any>> => {
                const data = await getStaticTranslationsBySlug('header_all', language_slug);

                if (data.code === 200) {
                  return {
                    code: data.code,
                    message: data.message,
                    data: data.data,
                  };
                }

                return {
                  code: data.code,
                  message: data.message,
                };
              },
              {
                tags: ['Static', 'Header'],
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
