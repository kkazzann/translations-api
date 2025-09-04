const hits = new Map<string, number>();
const misses = new Map<string, number>();
const lastUpdated = new Map<string, number>();
const nextRefresh = new Map<string, number>();

export function incHit(key: string) {
  hits.set(key, (hits.get(key) ?? 0) + 1);
}

export function incMiss(key: string) {
  misses.set(key, (misses.get(key) ?? 0) + 1);
}

export function setLastUpdated(key: string, ts: number) {
  lastUpdated.set(key, ts);
}

export function setNextRefresh(key: string, ts: number) {
  nextRefresh.set(key, ts);
}

export function deleteKeyMetrics(key: string) {
  hits.delete(key);
  misses.delete(key);
  lastUpdated.delete(key);
  nextRefresh.delete(key);
}

export function getHitsObj() {
  return Object.fromEntries(hits);
}

export function getMissesObj() {
  return Object.fromEntries(misses);
}

export function getLastUpdatedObj() {
  return Object.fromEntries(lastUpdated);
}

export function getNextRefreshObj() {
  return Object.fromEntries(nextRefresh);
}

export function getProgressEntries(
  knownKeys: Set<string>,
  refreshTimers: Set<string>,
) {
  return Array.from(knownKeys).map((k) => ({
    key: k,
    lastUpdated: lastUpdated.get(k) ?? null,
    nextRefresh: nextRefresh.get(k) ?? null,
    hits: hits.get(k) ?? 0,
    misses: misses.get(k) ?? 0,
    hasRefreshTimer: refreshTimers.has(k),
  }));
}
