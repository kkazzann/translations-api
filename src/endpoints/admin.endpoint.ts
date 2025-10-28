import { t } from 'elysia';
import { getCacheStats } from '../utils/stats/getCacheStats';

// token store
const tokens = new Map<string, { createdAt: number; username: string }>();

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function validateAuthHeader(authHeader: string | undefined) {
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) return false;

  return tokens.has(token);
}

export function registerAdminGroup(parent: any) {
  parent.group('/admin', (_admin: any) =>
    _admin
      .post(
        '/login',
        async ({ body, set }: any) => {
          const { username, password } = body || {};

          if (!username || !password) {
            set.status = 400;
            return { code: 400, message: 'Bad request. Username and password are required.' };
          }

          if (username === ADMIN_USER && password === ADMIN_PASS) {
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

            tokens.set(token, { createdAt: Date.now(), username });

            return { code: 200, message: 'Authentication successful.', token };
          }

          set.status = 401;
          return { code: 401, message: 'Authentication failed.' };
        },
        {
          tags: ['Admin'],
          body: t.Optional(
            t.Object({
              username: t.String(),
              password: t.String(),
            })
          ),
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Authentication successful.'),
              token: t.String(),
            }),

            401: t.Object({
              code: t.Literal(401),
              message: t.Literal('Authentication failed.'),
            }),

            400: t.Object({
              code: t.Literal(400),
              message: t.Literal('Bad request. Username and password are required.'),
            }),
          },
        }
      )

      .post(
        '/logout',
        async ({ headers, set }: any) => {
          const auth = headers['authorization'] || headers['Authorization'];

          if (!validateAuthHeader(auth)) {
            set.status = 401;
            return { code: 401, message: 'Invalid or missing token.' };
          }

          const token = auth.split(' ')[1];

          tokens.delete(token);

          return { code: 200, message: 'Logout successful.' };
        },
        {
          tags: ['Admin'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.Literal('Logout successful.'),
            }),

            401: t.Object({
              code: t.Literal(401),
              message: t.Literal('Invalid or missing token.'),
            }),
          },
        }
      )

      .get(
        '/cache-stats',
        async ({ headers, set }: any) => {
          const auth = headers['authorization'] || headers['Authorization'];

          if (!validateAuthHeader(auth)) {
            set.status = 401;
            return { code: 401, message: 'Authorization failed.' };
          }

          const stats = await getCacheStats();
          return stats;
        },
        {
          tags: ['Admin'],
          response: {
            200: t.Object({
              code: t.Literal(200),
              message: t.String(),
              summary: t.Object({
                sheetTabs: t.Number(),
                totalSize: t.Number(),
                avgAgeMs: t.Number(),
                totalHits: t.Optional(t.Number()),
                totalMisses: t.Optional(t.Number()),
                overallHitRatio: t.Optional(t.Number()),
              }),
              performance: t.Object({
                avgCacheHitResponseTime: t.Optional(t.Number()),
                avgCacheMissResponseTime: t.Optional(t.Number()),
                avgOverallResponseTime: t.Optional(t.Number()),
                requestsPerMinute: t.Optional(t.Number()),
              }),
              topKeys: t.Optional(
                t.Array(
                  t.Object({
                    key: t.String(),
                    count: t.Number(),
                  })
                )
              ),
              topLanguages: t.Optional(
                t.Array(
                  t.Object({
                    language: t.String(),
                    count: t.Number(),
                  })
                )
              ),
              keys: t.Array(
                t.Object({
                  key: t.String(),
                  lastRefresh: t.Number(),
                  ageMs: t.Number(),
                  size: t.Optional(t.Number()),
                  hits: t.Optional(t.Number()),
                  misses: t.Optional(t.Number()),
                  hitRatio: t.Optional(t.Number()),
                  error: t.Optional(t.String()),
                })
              ),
            }),

            401: t.Object({
              code: t.Literal(401),
              message: t.Literal('No token provided.'),
            }),
          },
        }
      )
  );

  return parent;
}
