import { getTabNameById } from '../utils/sheets';

export function registerMiscGroup(parent: any) {
  parent.group('/misc', (_misc: any) =>
    _misc.get('/resolveTabName', async ({ query }: any) => {
      const { id } = query || {};

      if (!id) {
        return { status: 400, message: 'id is required' };
      }

      const tab = await getTabNameById(id);

      if (!tab) {
        return { status: 404, message: 'tab not found' };
      }

      return { message: 'ok', tab };
    })
  );

  return parent;
}
