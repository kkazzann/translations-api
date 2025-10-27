import { getCacheStats } from '../utils/cache';

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
      .post('/login', async ({ body }: any) => {
        const { username, password } = body || {};

        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

          tokens.set(token, { createdAt: Date.now(), username });

          return { message: 'ok', token };
        }

        return { message: 'unauthorized' };
      })

      .post('/logout', async ({ headers }: any) => {
        const auth = headers['authorization'] || headers['Authorization'];

        if (!auth) return { message: 'no token provided' };

        const token = (auth as string).split(' ')[1];

        tokens.delete(token);

        return { message: 'logged out' };
      })

      .get('/cache-stats', async ({ headers }: any) => {
        const auth = headers['authorization'] || headers['Authorization'];

        if (!validateAuthHeader(auth)) {
          return { status: 401, message: 'unauthorized' };
        }

        const stats = await getCacheStats();

        return stats;
      })
  );

  return parent;
}
