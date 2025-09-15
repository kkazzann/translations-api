import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { registerHeaderGroup } from './endpoints/static/header.endpoint';
import { registerFooterGroup } from './endpoints/static/footer.endpoint';
import { registerTemplatesGroup } from './endpoints/static/templates.endpoint';
import { registerCategoryTitlesGroup } from './endpoints/static/category_titles.endpoint';
import { registerCategoryLinksGroup } from './endpoints/static/category_links.endpoint';
import { getLocalLanIp } from './networkUtils';
import { registerSheetTabGroup } from './endpoints/dynamic/sheet_tab.endpoint';
import { prewarmStaticEndpoints, refillStaticSheets } from './sheetsUtils';
import { getMilisFromMinutes, getMilisFromSeconds } from './timeUtils';
import cors from '@elysiajs/cors';

export const API_PREFIX = '/translations-api/v1';
export let PREWARM_DONE = false;

const localIp = getLocalLanIp();

export const app: any = new Elysia({
  prefix: API_PREFIX,
  normalize: true,
})
  .use(
    cors({
      origin: '*',
    })
  )

  // automatic scalar documentation
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Beliani Translations API',
          version: '1.0.0',
        },
      },
    })
  )

  .get('/', () => {
    return {
      message: 'Translations API',
      docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
    };
  })

  .group('/static', (_static) => {
    _static.get('/', () => {
      return {
        message: 'Root endpoint for static content',
        docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
      };
    });

    // register static groups from separate modules
    registerHeaderGroup(_static);
    registerFooterGroup(_static);
    registerTemplatesGroup(_static);
    registerCategoryTitlesGroup(_static);
    registerCategoryLinksGroup(_static);

    return _static;
  })

  .group('/dynamic', (_dynamic) => {
    _dynamic.get('/', () => {
      return {
        message: 'Root endpoint for dynamic content',
        docs: `http://${localIp}:${app.server?.port}${API_PREFIX}/docs`,
      };
    });

    registerSheetTabGroup(_dynamic);

    return _dynamic;
  });

// Prewarm caches on startup so first requests don't hit Google Sheets
await prewarmStaticEndpoints();

// Bind to all interfaces so the server is reachable from the LAN.
app.listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`\n🔥 API is running at http://${getLocalLanIp()}:${app.server?.port}${API_PREFIX}\n`);

// Schedule periodic static sheet refill every 5 minutes.
const FIVE_MINUTES = getMilisFromMinutes(5);
const START_DELAY = getMilisFromSeconds(30);

setTimeout(() => {
  try {
    // run immediately once after start delay
    refillStaticSheets().catch((err) =>
      console.error('Error during scheduled static refill (initial):', err)
    );

    // schedule regular refills
    setInterval(() => {
      refillStaticSheets().catch((err) =>
        console.error('Error during scheduled static refill:', err)
      );
    }, FIVE_MINUTES);
    console.log(`Scheduled static sheet refills every ${FIVE_MINUTES / 1000 / 60} minutes`);
  } catch (err) {
    console.error('Failed to schedule static refills:', err);
  }
}, START_DELAY);
