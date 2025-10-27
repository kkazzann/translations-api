import { getStaticTranslations, getDynamicTranslations } from '../../googleAuth';

export async function fetchSheetData(spreadsheet: string, sheetName: string) {
  let document;

  switch (spreadsheet) {
    case 'STATIC':
      document = await getStaticTranslations();
      break;
    case 'DYNAMIC':
      document = await getDynamicTranslations();
      break;
    default:
      throw new Error(`Unknown spreadsheet type: ${spreadsheet}`);
  }

  const sheet = document.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(
      JSON.stringify({
        status: 500,
        message: `Sheet '${sheetName}' not found in ${spreadsheet} translations document.`,
      })
    );
  }

  await sheet.loadHeaderRow();

  const headers = sheet.headerValues;
  const rows = await sheet.getRows();
  const result: { [key: string]: any } = {};

  for (const header of headers)
    result[header] = rows.map((row) => row.get(header)?.replaceAll('\n', '<br />').trim());

  return result;
}
