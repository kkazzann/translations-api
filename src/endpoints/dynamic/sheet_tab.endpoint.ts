import cache, { checkIfPrewarmIsDone } from '../../services/cache';
import { getDataFromStaticSheet } from '../../utils/sheets/getDataFromStaticSheet';
import { getStaticTranslationsBySlug } from '../../utils/sheets/getStaticTranslationsBySlug';
import { Result } from '../../utils/cache';
import { forceRefreshDynamicCache, forceRefreshStaticCache } from '../../utils/sheets';
import { t } from 'elysia';
import { getDynamicSheetCached } from '../../utils/sheets/getDynamicSheetCached';

export function registerDynamic(parent: any) {
  parent.group('/:sheet_tab', (_sheet_tab: any) =>
    _sheet_tab
      .get(
        '/',
        async ({ params: { sheet_tab } }: any): Promise<Result<any>> => {
          const envelope = await getDynamicSheetCached(sheet_tab);

          return {
            code: 200,
            message: "Fetching dynamic translations from tab '" + sheet_tab + "'",
            dataOrigin: envelope.dataOrigin as 'cache' | 'googleAPI',
            executionTime: envelope.executionTime,
            data: envelope.data,
          };
        },
        {
          tags: ['Dynamic'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.String(),
              data: t.Any(),
              dataOrigin: t.String({ enum: ['cache', 'googleAPI'] }),
              executionTime: t.String(),
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

      .get(
        '/force-refresh',
        async ({ params: { sheet_tab } }: any): Promise<Result<null>> => {
          await forceRefreshDynamicCache(sheet_tab);

          return {
            code: 200,
            message: `Cache refreshed for dynamic sheet '${sheet_tab}'`,
          };
        },
        {
          tags: ['Dynamic'],
          response: {
            200: t.Object({
              code: t.Number({ enum: [200] }),
              message: t.String(),
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
        '/:range',
        async ({ params: { sheet_tab, range } }: any): Promise<Result<any>> => {
          const envelope = await getDynamicSheetCached(sheet_tab);
          const sheet = (envelope as any).data ?? envelope;

          const isRangeValid = /^\d+:\d+$|^\d+$/.test(range);
          if (!isRangeValid) {
            return {
              code: 400,
              message: `Error! Invalid range format! Use "start:end" or "index" format.`,
              data: null,
            };
          }

          const [startStr, endStr] = range.split(':');
          const start = parseInt(startStr, 10) - 2;
          const end = endStr ? parseInt(endStr, 10) - 2 : start;

          const result: Record<string, any[]> = {};

          for (const [header, values] of Object.entries(sheet)) {
            if (header === 'slug') continue;
            if (!Array.isArray(values)) continue;

            result[header] = values.slice(start, end + 1).map((v) => (v === undefined ? null : v));
          }

          return {
            code: 200,
            message: `Fetching dynamic translations from tab '${sheet_tab}'`,
            data: result,
          };
        },
        {
          tags: ['Dynamic'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.String(),
              data: t.Any(),
            }),
            400: t.Object({
              code: t.Literal(400),
              message: t.Literal('Error! Invalid range format! Use "start:end" or "index" format.'),
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
        }
      )
  );
  return parent;
}
