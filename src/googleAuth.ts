import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import credentials from '../google-credentials.json';

const xlsxAccount = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const STATIC_TRANSLATIONS = new GoogleSpreadsheet(
  '1Y9blxN4paEV05s6AvdWmH5fBELTUvDz3ax5skmgVrsQ',
  xlsxAccount
);

// Dynamic spreadsheets per year
const DYNAMIC_SHEETS: Record<string, GoogleSpreadsheet> = {
  '2025': new GoogleSpreadsheet('1djnjfhsFX4-Fghv5cQU_UNYaEhVL9Ban4VUqIfHsWdc', xlsxAccount),
  '2026': new GoogleSpreadsheet('1RcsQspit0B3b3xX1NwZ9RWnUzZrkoVDULu2cnPMZ04U', xlsxAccount),
};

export async function getStaticTranslations() {
  await STATIC_TRANSLATIONS.loadInfo();
  return STATIC_TRANSLATIONS;
}

/**
 * Return a GoogleSpreadsheet instance for the requested dynamic year.
 * Defaults to '2025' when year is not provided or unknown.
 */
export async function getDynamicTranslations(year?: string) {
  const y = year && DYNAMIC_SHEETS[year] ? year : '2025';
  const doc = DYNAMIC_SHEETS[y];
  await doc.loadInfo();
  return doc;
}
