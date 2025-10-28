import { getStaticTranslations, getDynamicTranslations } from '../../googleAuth';
import { Result } from '../cache';

export async function fetchSheetData(
  spreadsheet: string,
  sheetName: string
): Promise<Result<Record<string, any>>> {
  let document;

  switch (spreadsheet) {
    case 'STATIC':
      document = await getStaticTranslations();
      break;
    case 'DYNAMIC':
      document = await getDynamicTranslations();
      break;
    default:
      return {
        code: 500,
        message: 'Error 500! Unexpected error occurred.',
      };
  }

  const sheet = document.sheetsByTitle[sheetName];

  if (!sheet) {
    return {
      code: 404,
      message: 'No translations found!',
    };
  }

  await sheet.loadHeaderRow();

  const headers = sheet.headerValues;
  const rows = await sheet.getRows();
  const result: { [key: string]: any } = {};

  for (const header of headers)
    result[header] = rows.map((row) => row.get(header)?.replaceAll('\n', '<br />').trim());

  return {
    code: 200,
    data: result,
  };
}
