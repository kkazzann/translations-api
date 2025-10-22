import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { registerHeaderGroup } from './endpoints/static/header.endpoint';
import { registerFooterGroup } from './endpoints/static/footer.endpoint';
import { registerTemplatesGroup } from './endpoints/static/templates.endpoint';
import { registerCategoryTitlesGroup } from './endpoints/static/category_titles.endpoint';
import { registerCategoryLinksGroup } from './endpoints/static/category_links.endpoint';
import { getLocalLanIp } from './networkUtils';
import { registerSheetTabGroup } from './endpoints/dynamic/sheet_tab.endpoint';
import { prewarmStaticEndpoints } from './sheetsUtils';
import cors from '@elysiajs/cors';
import { registerAdminGroup } from './endpoints/admin.endpoint';
import { staticPlugin } from '@elysiajs/static';
import { file } from 'bun';

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
  .use(
    staticPlugin({
      assets: 'public',
      prefix: '',
    })
  )

  .get('/', () => file('./public/index.html'))

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

registerAdminGroup(app);

// Prewarm caches on startup so first requests don't hit Google Sheets
await prewarmStaticEndpoints();

// Bind to all interfaces so the server is reachable from the LAN.
app.listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`\n🔥 API is running at http://${getLocalLanIp()}:${app.server?.port}${API_PREFIX}\n`);
