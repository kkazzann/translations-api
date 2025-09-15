import { getDynamicSheetCached } from '../../sheetsUtils';

export function registerSheetTabGroup(parent: any) {
  parent.group('/:sheet_tab', (_sheet_tab: any) =>
    _sheet_tab
      .get('/', async ({ params: { sheet_tab } }: any) => {
        const envelope = await getDynamicSheetCached(sheet_tab);

        return {
          message:
            (envelope as any).message ?? `Fetching dynamic translations from tab '${sheet_tab}'`,
          data: (envelope as any).data ?? envelope,
          dataOrigin: (envelope as any).dataOrigin,
          executionTime: (envelope as any).executionTime,
        };
      })

      // /dynamic/:sheet_tab/:range -> returns filtered headers for given range
      .get('/:range', async ({ params: { sheet_tab, range } }: any) => {
        // range operates on ROWS (1-based). Return mapping: HEADER -> [values...]
        const envelope = await getDynamicSheetCached(sheet_tab);
        const sheet = (envelope as any).data ?? envelope;

        const isRangeValid = /^\d+:\d+$|^\d+$/.test(range);
        if (!isRangeValid) {
          return {
            message: `Error! Invalid range format! Use "start:end" or "index" format.`,
          };
        }

        const [startStr, endStr] = range.split(':');
        const start = parseInt(startStr, 10) - 2;
        const end = endStr ? parseInt(endStr, 10) - 2 : start;

        const result: Record<string, any[]> = {};

        // For each header (except slug), slice its values array by row range
        for (const [header, values] of Object.entries(sheet)) {
          if (header === 'slug') continue;
          if (!Array.isArray(values)) continue;

          // slice safely even if end is out of bounds
          result[header] = values.slice(start, end + 1).map((v) => (v === undefined ? null : v));
        }

        return {
          message: `Fetching dynamic translations from tab '${sheet_tab}'`,
          data: result,
        };
      })
  );

  return parent;
}
