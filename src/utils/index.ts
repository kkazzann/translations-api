export const SUPPORTED_LOCALES = [
  "uk",
  "pl",
  "de",
  "at",
  "chde",
  "nl",
  "fr",
  "chfr",
  "es",
  "pt",
  "it",
  "dk",
  "no",
  "fi",
  "se",
  "cz",
  "sk",
  "hu",
  "befr",
  "benl",
  "ro",
  "chit",
];

export function isLocale(str: string): boolean {
  return SUPPORTED_LOCALES.includes(str.toLowerCase());
}

function isRange(str: string): boolean {
  return /^\d+(?::\d+)?$/.test(str);
}

export function localeToName(code: string): string {
  const map: Record<string, string> = {
    uk: "English",
    pl: "Polish",
    de: "German",
    at: "Austrian German",
    chde: "Swiss German",
    nl: "Dutch",
    fr: "French",
    chfr: "Swiss French",
    es: "Spanish",
    pt: "Portuguese",
    it: "Italian",
    dk: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    se: "Swedish",
    cz: "Czech",
    sk: "Slovak",
    hu: "Hungarian",
    befr: "Belgian French",
    benl: "Belgian Dutch",
    ro: "Romanian",
    chit: "Swiss Italian",
  };
  return map[code.toLowerCase()] ?? code;
}
