import { getTabNameById } from '../utils/sheets';
import { resolveYearFromSpreadsheetId } from '../googleAuth';

export function registerMiscGroup(parent: any) {
  parent.group('/misc', (_misc: any) =>
    _misc

      // New route: resolve year from spreadsheetId and return tab name by gid
      .get('/resolveTabName/:spreadsheetId/:gid', async ({ params, set }: any) => {
        const { spreadsheetId, gid } = params || {};

        if (!spreadsheetId || !gid) {
          set.status = 400;
          return { code: 400, message: 'spreadsheetId and gid are required' };
        }

        const year = resolveYearFromSpreadsheetId(spreadsheetId);
        if (!year) {
          set.status = 404;
          return { code: 404, message: 'spreadsheetId not found' };
        }

        const gidNum = parseInt(gid, 10);
        if (Number.isNaN(gidNum)) {
          set.status = 400;
          return { code: 400, message: 'gid must be a number' };
        }

        const tab = await getTabNameById(gidNum, year);
        if (!tab) {
          set.status = 404;
          return { code: 404, message: 'tab not found' };
        }

        return { code: 200, message: 'ok', year, tab };
      })
  );

  return parent;
}
