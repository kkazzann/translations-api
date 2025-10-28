import { createCache } from 'cache-manager';
import { getMilisFromHours, formatTime } from '../utils/time';
import { getDataFromStaticSheet } from '../utils/sheets/getDataFromStaticSheet';

const cache = createCache({
  ttl: getMilisFromHours(3), // Keep data for 3 hours max (hard expiry)
});

let PREWARM_DONE = false;

function setPrewarmDone(boolean: boolean) {
  PREWARM_DONE = boolean;
}

export function checkIfPrewarmIsDone() {
  if (!PREWARM_DONE) {
    const error: any = new Error('Static content is being prewarmed, please try again shortly.');
    error.code = 503;
    error.message = 'Service temporarily unavailable. Please try again shortly.';
    throw error;
  }
}

export async function prewarmStaticEndpoints() {
  let prewarmedSheets = [];

  const sheets = [
    { name: 'HEADER', key: 'header_all' },
    { name: 'FOOTER', key: 'footer_all' },
    { name: 'TEMPLATES', key: 'templates_all' },
    { name: 'CATEGORY_LINKS', key: 'category_links_all' },
    { name: 'CATEGORY_TITLES', key: 'category_titles_all' },
  ];

  console.log(`Prewarming static sheets at ${formatTime(new Date())}...`);
  console.time('Prewarming completed.');

  for (const sheet of sheets) {
    await getDataFromStaticSheet(sheet.name, sheet.key, true);
    prewarmedSheets.push(sheet.key);
  }

  setPrewarmDone(true);
  console.timeEnd('Prewarming completed.');
  console.log(`-> Sheets prewarmed: ${prewarmedSheets.join(', ')}`);
}

export default cache;
