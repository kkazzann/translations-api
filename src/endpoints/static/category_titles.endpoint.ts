import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { getDataFromStaticSheet } from '../../utils/sheets/getDataFromStaticSheet';
import { getStaticTranslationsBySlug } from '../../utils/sheets/getStaticTranslationsBySlug';
import { Result } from '../../utils/cache';
import { forceRefreshStaticCache } from '../../utils/sheets';
import { t } from 'elysia';

export function registerCategoryTitlesGroup(parent: any) {
  parent.group('/category_titles', (_category_titles: any) =>
    _category_titles
      .get(
        '/',
        {
          tags: ['Static', 'Category Titles'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Category titles fetched successfully'),
              data: t.Any(),
            }),
            404: t.Object({
              code: t.Literal(404),
              message: t.Literal('No translations for category_titles'),
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
          const data = await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');
          return {
            code: 200,
            message: 'Category titles fetched successfully',
            data,
          };
        }
      )

      .get(
        '/force-refresh',
        async (): Promise<Result<null>> => {
          await forceRefreshStaticCache('CATEGORY_TITLES', 'category_titles_all');
          return {
            code: 200,
            message: `Cache refreshed for 'CATEGORY_TITLES'`,
          };
        },
        {
          tags: ['Static', 'Category Titles'],
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
  );

  return parent;
}
