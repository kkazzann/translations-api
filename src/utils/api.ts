import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import credentials from "../../google-credentials.json";
import { SUPPORTED_LOCALES } from "./index";

const serviceAccountAuth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
type TranslationsArgs = {
  locale?: string;
  name?: string;
  sheetName?: string;
};

type TranslationsData = {
  [key: string]: string;
};

const GLOBAL_TRANSLATIONS_SPREADSHEET =
  "1Y9blxN4paEV05s6AvdWmH5fBELTUvDz3ax5skmgVrsQ";

const NEWSLETTER_TRANSLATIONS_SPREADSHEET =
  "1djnjfhsFX4-Fghv5cQU_UNYaEhVL9Ban4VUqIfHsWdc";

async function getSpreadsheet(spreadsheetId: string) {
  try {
    const document = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await document.loadInfo();

    return document;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      console.error(`🔴 | HTTP Error ${status}:`, error.response.statusText);
    } else if (error.code) {
      console.error("🔴 | Error code:", error.code, "-", error.message);
    } else {
      console.error("🔴 | Unexpected error:", error.message);
    }
    return null;
  }
}

async function getSheet(
  document: GoogleSpreadsheet | null,
  sheetName = "TEMPLATES",
) {
  if (!document) return null;

  try {
    let sheet = document.sheetsByTitle[sheetName];

    if (!sheet && Array.isArray((document as any).sheetsByIndex)) {
      const normalize = (s: string) =>
        (s || "")
          .toString()
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
      const desired = normalize(sheetName);
      const found = (document as any).sheetsByIndex.find(
        (s: any) => normalize(s.title) === desired,
      );
      if (found) sheet = found;
    }

    if (!sheet) {
      const available = Array.isArray((document as any).sheetsByIndex)
        ? (document as any).sheetsByIndex.map((s: any) => s.title)
        : Object.keys(document.sheetsByTitle || {});
      console.error(
        `🚒 | Sheet "${sheetName}" not found. Available sheets: ${available.join(
          ", ",
        )}`,
      );
      return null;
    }

    try {
      await sheet.loadHeaderRow(1);
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (
        msg.includes("Duplicate header") ||
        msg.includes("Duplicate header detected")
      ) {
        console.warn("⚠️ | loadHeaderRow warning (continuing):", msg);
      } else {
        console.error("🔴 | getSheet error while loading header row:", msg);
        return null;
      }
    }

    return sheet;
  } catch (error: any) {
    console.error("🔴 | getSheet error:", error?.message ?? error);
    return null;
  }
}

async function getHeaders(sheet: any) {
  if (!sheet) return [];

  try {
    return sheet.headerValues || [];
  } catch (error: any) {
    console.error("🔴 | getHeaders error:", error.message);
    return [];
  }
}

async function getRows(sheet: any) {
  if (!sheet) return [];

  try {
    const rows = await sheet.getRows();

    const cleanRows = rows.map((row: any) => row.toObject());
    return cleanRows;
  } catch (error: any) {
    console.error("🔴 | getRows error:", error.message);
    return [];
  }
}

function getKeys(rows: Array<Record<string, any>>) {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

async function getTranslations({
  locale = "uk",
  name,
  sheetName = "TEMPLATES",
}: TranslationsArgs & { sheetName?: string } = {}): Promise<TranslationsData> {
  try {
    const document = await getSpreadsheet(GLOBAL_TRANSLATIONS_SPREADSHEET);
    const sheet = await getSheet(document, sheetName);
    const rows = await getRows(sheet);
    const headers = await getHeaders(sheet);

    const translations: TranslationsData = {};

    const localeRow = rows.find((row: any) => row.slug === locale);

    if (!localeRow) {
      throw new Error(`Locale "${locale}" not found in spreadsheet`);
    }

    if (name && localeRow[name] !== undefined) {
      translations[name] = localeRow[name] || "";
      return translations;
    }

    if (name && localeRow[name] === undefined) {
      throw new Error(`Template "${name}" not found for locale "${locale}"`);
    }

    headers.forEach((header: any) => {
      if (header !== "slug" && localeRow[header] !== undefined) {
        translations[header] = localeRow[header] || "";
      }
    });

    return translations;
  } catch (error: any) {
    console.error("🔴 | getTranslations error:", error.message);
    throw error;
  }
}

export async function fetchTranslations(sheetName = "TEMPLATES") {
  try {
    const document = await getSpreadsheet(GLOBAL_TRANSLATIONS_SPREADSHEET);
    const sheet = await getSheet(document, sheetName);
    const rows = await getRows(sheet);
    const headers = await getHeaders(sheet);

    if (!document || !sheet || rows.length === 0 || headers.length === 0) {
      throw new Error("Failed to load spreadsheet data or no data available");
    }

    const templates: Record<string, Record<string, string>> = {};

    headers.forEach((header: any) => {
      if (header !== "slug") {
        templates[header] = {};
        rows.forEach((row: any) => {
          if (row.slug) {
            templates[header][row.slug] = row[header] || "";
          }
        });
      }
    });

    return templates;
  } catch (error: any) {
    console.error("🔴 | getTemplates error:", error.message);
    throw error;
  }
}

async function fetchTranslationsByName(name: string, sheetName = "TEMPLATES") {
  try {
    const document = await getSpreadsheet(GLOBAL_TRANSLATIONS_SPREADSHEET);
    const sheet = await getSheet(document, sheetName);
    const rows = await getRows(sheet);
    const headers = await getHeaders(sheet);

    if (!headers.includes(name)) {
      throw new Error(`Template "${name}" not found in headers`);
    }

    const template: Record<string, Record<string, string>> = {};
    template[name] = {};

    rows.forEach((row: any) => {
      if (row.slug) {
        template[name][row.slug] = row[name] || "";
      }
    });

    return template;
  } catch (error: any) {
    console.error("🔴 | getTemplatesByName error:", error.message);
    throw error;
  }
}

async function fetchTranslationsByLocale(
  locale: string,
  sheetName = "TEMPLATES",
) {
  const translations = await getTranslations({ locale: locale, sheetName });

  if (Object.keys(translations).length === 0) {
    throw new Error(`No templates found for locale "${locale}"`);
  }

  const templates: Record<string, Record<string, string>> = {};
  Object.keys(translations).forEach((templateName) => {
    templates[templateName] = {
      [locale]: translations[templateName],
    };
  });

  return templates;
}

async function fetchTranslationsByLocaleAndName(
  name: string,
  locale: string,
  sheetName = "TEMPLATES",
) {
  const translations = await getTranslations({
    locale: locale,
    name: name,
    sheetName,
  });
  const result = translations[name] || null;

  if (!result) {
    throw new Error(`Template "${name}" not found for locale "${locale}"`);
  }

  const template: Record<string, Record<string, string>> = {};
  template[name] = {
    [locale]: result,
  };

  return template;
}
