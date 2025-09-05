import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import credentials from "../google-credentials.json";

const xlsxAccount = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const STATIC_TRANSLATIONS = new GoogleSpreadsheet(
  "1Y9blxN4paEV05s6AvdWmH5fBELTUvDz3ax5skmgVrsQ",
  xlsxAccount,
);

const DYNAMIC_TRANSLATIONS = new GoogleSpreadsheet(
  "1djnjfhsFX4-Fghv5cQU_UNYaEhVL9Ban4VUqIfHsWdc",
  xlsxAccount,
);

export async function getStaticTranslations() {
  await STATIC_TRANSLATIONS.loadInfo();
  return STATIC_TRANSLATIONS;
}

export async function getDynamicTranslations() {
  await DYNAMIC_TRANSLATIONS.loadInfo();
  return DYNAMIC_TRANSLATIONS;
}
