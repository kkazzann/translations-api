import { Database } from 'bun:sqlite';

// Bun-native sqlite implementation (synchronous) - always create/open DB and use it.
const DB_PATH = './data/metrics.sqlite';

// Ensure data directory exists (best-effort)
try {
  if ((globalThis as any).Bun && (globalThis as any).Bun.mkdirSync) {
    (globalThis as any).Bun.mkdirSync('./data', { recursive: true });
  }
} catch (e) {
  // ignore
}

let db: any;
try {
  db = new Database(DB_PATH, { create: true });
  // enable WAL for better performance
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (e) {
    // ignore
  }

  // create table and indexes
  db.run(
    `CREATE TABLE IF NOT EXISTS requests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			time INTEGER
		);`
  );
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_time ON requests(time);');
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_name ON requests(name);');
} catch (err) {
  console.warn('bun:sqlite init error', err);
  db = undefined;
}

/** Insert a request (name may be undefined). timeMs defaults to Date.now() */
export function insertRequest(name: string | undefined, timeMs?: number) {
  try {
    if (!db) return;
    const t = timeMs ?? Date.now();
    const stmt = db.prepare('INSERT INTO requests (name, time) VALUES ($name, $time)');
    stmt.run({ $name: name ?? null, $time: t });
  } catch (err) {
    console.warn('insertRequest error', err);
  }
}

/** Prune requests older than `days` days (inclusive). Default: 31 days. */
export function pruneOldRequests(days = 31) {
  try {
    if (!db) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const stmt = db.prepare('DELETE FROM requests WHERE time < $cutoff');
    stmt.run({ $cutoff: cutoff });
  } catch (err) {
    console.warn('pruneOldRequests error', err);
  }
}

/** Top queries in last 30 days. */
export function getTopQueriesLast30Days(limit = 10) {
  try {
    if (!db) return [] as { name: string; count: number }[];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const q = db.query(
      'SELECT name, COUNT(*) as cnt FROM requests WHERE time >= $cutoff AND name IS NOT NULL GROUP BY name ORDER BY cnt DESC LIMIT $limit'
    );
    const rows = q.all({ $cutoff: cutoff, $limit: limit }) as any[];
    return rows.map((r: any) => ({ name: r.name, count: r.cnt }));
  } catch (err) {
    console.warn('getTopQueriesLast30Days error', err);
    return [];
  }
}

/** Recent queries (most recent first) */
export function getRecentQueries(limit = 50) {
  try {
    if (!db) return [] as { name?: string; time: number }[];
    const q = db.query('SELECT name, time FROM requests ORDER BY time DESC LIMIT $limit');
    const rows = q.all({ $limit: limit }) as any[];
    return rows.map((r: any) => ({ name: r.name, time: r.time }));
  } catch (err) {
    console.warn('getRecentQueries error', err);
    return [];
  }
}

/** Count queries in last 30 days */
export function getQueriesCountLast30Days() {
  try {
    if (!db) return 0;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const q = db.query('SELECT COUNT(*) as cnt FROM requests WHERE time >= $cutoff');
    const row = q.get({ $cutoff: cutoff }) as any;
    return row?.cnt ?? 0;
  } catch (err) {
    console.warn('getQueriesCountLast30Days error', err);
    return 0;
  }
}

/** Return per-minute counts for the last `minutes` minutes (oldest -> newest) */
export function getRpmHistoryMinutes(minutes = 60) {
  try {
    if (!db) return new Array(minutes).fill(0);
    const now = Date.now();
    const oneMin = 60 * 1000;
    const cutoff = now - minutes * oneMin;

    // Aggregate by minute bucket (integer division)
    const q = db.query(
      'SELECT (time / 60000) as minute, COUNT(*) as cnt FROM requests WHERE time >= $cutoff GROUP BY (time / 60000) ORDER BY minute'
    );
    const rows = q.all({ $cutoff: cutoff }) as any[];

    const map = new Map<number, number>();
    for (const r of rows) {
      const minute = Number(r.minute);
      map.set(minute, Number(r.cnt));
    }

    const results: number[] = [];
    const startMinute = Math.floor(cutoff / oneMin);
    for (let i = 0; i < minutes; i++) {
      const m = startMinute + i;
      results.push(map.get(m) ?? 0);
    }
    return results;
  } catch (err) {
    console.warn('getRpmHistoryMinutes error', err);
    return new Array(minutes).fill(0);
  }
}

/**
 * Initialize DB (no-op). The Bun Database is opened on module import so callers can
 * await this function to ensure the module was loaded and any file creation side-
 * effects have happened.
 */
export async function initDb(): Promise<void> {
  return;
}
