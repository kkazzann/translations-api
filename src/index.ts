import { Elysia, t } from 'elysia';
import cors from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';

import { file } from 'bun';

import { prewarmStaticEndpoints } from './services/cache';

import { getLocalLanIp } from './utils/network';
import { registerOther, registerStatic } from './utils/registerEndpoints';
import { registerDynamic } from './endpoints/dynamic/sheet_tab.endpoint';
import { Result } from './utils/cache';
import { forceRefreshDynamicCache } from './utils/sheets';
import { getDynamicSheetCached } from './utils/sheets/getDynamicSheetCached';
import openapi from '@elysiajs/openapi';

const localIp = getLocalLanIp();

export const app: Elysia = new Elysia({
  normalize: false,
})
  // automatic scalar documentation
  .use(
    openapi({
      path: 'docs',
    })
  )

  .use(
    cors({
      origin: '*',
    })
  )

  .get('/', () => file('./public/index.html'))
  .use(staticPlugin({
    prefix: '',
    assets: './public',
  }))

  .group('/dynamic', (_dynamic) => {
    _dynamic.get(
      '/',
      () => {
        return {
          message: 'Root endpoint for dynamic content',
        };
      },
      {
        schema: {
          tags: ['Dynamic'],
          response: {
            200: t.Object({
              message: t.String(),
            }),
          },
        },
      }
    );

    registerDynamic(_dynamic);

    return _dynamic;
  })

  .group('/static', (_static) => {
    _static.get(
      '/',
      () => {
        return {
          message: 'Root endpoint for static content',
        } as const;
      },
      {
        tags: ['Static'],
        response: {
          200: t.Object({
            message: t.Literal('Root endpoint for static content'),
          }),
        },
      }
    );

    registerStatic(_static);
    // register static groups from separate modules

    return _static;
  });

registerOther(app);

// Prewarm caches on startup so first requests don't hit Google Sheets
await prewarmStaticEndpoints();

// Bind to all interfaces so the server is reachable from the LAN.
app.listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`-> Visit API docs @ http://${localIp}:3000/docs`);
