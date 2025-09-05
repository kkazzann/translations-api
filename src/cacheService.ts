import { createCache } from 'cache-manager';
import { getMilisFromMinutes, getMilisFromSeconds } from './timeUtils';
import { getDataFromStaticSheet } from './sheetsUtils';

const cache = createCache({
  ttl: getMilisFromMinutes(5),
  refreshThreshold: getMilisFromSeconds(1),
});

let PREWARM_DONE = false;

export function checkIfPrewarmIsDone() {
  if (!PREWARM_DONE) {
    throw new Error(
      JSON.stringify({
        status: 500,
        message: 'Static content is being prewarmed, please try again shortly.',
      })
    );
  }
}

export async function prewarmStaticEndpoints() {
  console.log('Prewarming static endpoints...');

  await getDataFromStaticSheet('HEADER', 'header_all');
  await getDataFromStaticSheet('FOOTER', 'footer_all');
  await getDataFromStaticSheet('TEMPLATES', 'templates_all');
  await getDataFromStaticSheet('CATEGORY_LINKS', 'category_links_all');
  await getDataFromStaticSheet('CATEGORY_TITLES', 'category_titles_all');

  PREWARM_DONE = true;

  console.log('Prewarming static endpoints complete. API is ready to serve requests!');
}

export function setPrewarmDone(boolean: boolean) {
  PREWARM_DONE = boolean;
}

export default cache;
