import { Result } from '../../types/cache/Result';
import { forceRefreshDynamicCache } from '../../utils/sheets';
import { getDynamicSheetCached } from '../../utils/sheets/getDynamicSheetCached';
import { makeResponseSchema } from '../../types/api-response';

const settings = {
  tags: ['Dynamic'],
  messages: {
    success_fetch: 'Dynamic sheet fetched successfully',
    success_refresh: `Cache refreshed!`,
    not_found: 'No translations found!',
    error: 'Error 500! Unexpected error occurred.',
  },
};

export function registerDynamic(parent: any) {
  parent.group('/:sheet_tab', (_sheet_tab: any) =>
    _sheet_tab
      .get(
        '/',
        async ({ params: { sheet_tab, year }, set }: any): Promise<Result<any>> => {
          try {
            const res = await getDynamicSheetCached(sheet_tab, year);

            return {
              code: 200,
              message: settings.messages.success_fetch,
              dataOrigin: res.dataOrigin,
              executionTime: res.executionTime,
              data: res.data,
            };
          } catch (err: any) {
            if (err.code === 404) {
              set.status = 404;
              return {
                code: 404,
                message: settings.messages.not_found,
              };
            }

            set.status = 500;
            return {
              code: 500,
              message: settings.messages.error,
            };
          }
        },
        makeResponseSchema(settings)
      )

      .get(
        '/force-refresh',
        async ({ params: { sheet_tab, year } }: any): Promise<Result<null>> => {
          const res = await forceRefreshDynamicCache(sheet_tab, year);

          return {
            code: 200,
            message: settings.messages.success_refresh,
            executionTime: res?.executionTime,
          };
        },
        makeResponseSchema(settings)
      )

      .get(
        '/:range',
        async ({ params: { sheet_tab, range, year }, set }: any): Promise<Result<any>> => {
          try {
            const envelope = await getDynamicSheetCached(sheet_tab, year);
            const sheet = envelope.data;

            const isRangeValid = /^\d+:\d+$|^\d+$/.test(range);
            if (!isRangeValid) {
              set.status = 400;
              return {
                code: 400,
                message: `Error! Invalid range format! Use "start:end" or "index" format.`,
              };
            }

            const [startStr, endStr] = range.split(':');
            // Row 1 is header, so row 2 = index 0, row 3 = index 1, etc.
            const start = parseInt(startStr, 10) - 2; // Convert to 0-based index (accounting for header row)
            const end = endStr ? parseInt(endStr, 10) - 1 : start + 1; // End is exclusive in slice

            const result: Record<string, any[]> = {};

            for (const [header, values] of Object.entries(sheet)) {
              if (header === 'slug') continue;
              if (!Array.isArray(values)) continue;

              result[header] = values.slice(start, end).map((v) => (v === undefined ? null : v));
            }

            return {
              code: 200,
              message: settings.messages.success_fetch,
              executionTime: envelope.executionTime,
              dataOrigin: envelope.dataOrigin,
              data: result,
            };
          } catch (err: any) {
            if (err.code === 404) {
              set.status = 404;
              return {
                code: 404,
                message: settings.messages.not_found,
              };
            }

            set.status = 500;
            return {
              code: 500,
              message: settings.messages.error,
            };
          }
        },
        makeResponseSchema(settings)
      )
  );
  return parent;
}
