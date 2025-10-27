export const ALLOWED_DYNAMIC_HEADERS = [
  'UK',
  'PL',
  'DE',
  'AT',
  'CH',
  'NL',
  'FR',
  'CHFR',
  'ES',
  'PT',
  'IT',
  'DK',
  'NO',
  'FI',
  'SE',
  'CZ',
  'SK',
  'HU',
  'BEFR',
  'BENL',
  'RO',
  'CHIT',
];

export const HEADER_TRANSFORMATIONS: Record<string, string> = {
  CH: 'CHDE',
  // Add more transformations here if needed in the future
  // 'OLD_NAME': 'NEW_NAME',
};

// Exported `keyToSheetMap` for reuse
export const keyToSheetMap: Record<string, string> = {
  header_all: 'HEADER',
  footer_all: 'FOOTER',
  templates_all: 'TEMPLATES',
  category_links_all: 'CATEGORY_LINKS',
  category_titles_all: 'CATEGORY_TITLES',
};
