import fs from "fs";
import fsp from "fs/promises";
import path from "path";

// using adapter for memory+disk caching
import * as adapter from "./cache/adapter";
import scheduler from "./cache/scheduler";
import {
  sanitize,
  changelogPath,
  readChangelogFile,
  writeChangelogFile,
  normalizeChangelogArray,
  diffValues,
} from "./cache/helpers";
import * as metrics from "./cache/metrics";
import logger from "./cache/logger";

type Loader = () => Promise<any>;

export type CacheOptions = {
  ttl?: number;
  refreshInterval?: number;
  persist?: boolean;
};

class CacheService {
  private memCache: any;
  private disk: any;
  private refreshTimers = new Set<string>();
  private changelogs = new Map<string, Array<any>>();
  private loaders = new Map<string, Loader>();
  // metrics moved to metrics.ts
  private tmpDir: string;
  private changelogDir: string;
  private knownKeys = new Set<string>();

  constructor() {
    this.tmpDir = path.resolve(process.cwd(), "tmp", "cache");
    this.changelogDir = path.resolve(process.cwd(), "tmp", "changelogs");
    if (!fs.existsSync(this.tmpDir))
      fs.mkdirSync(this.tmpDir, { recursive: true });
    if (!fs.existsSync(this.changelogDir))
      fs.mkdirSync(this.changelogDir, { recursive: true });
    // adapter handles memory and disk stores
    this.memCache = null;
    this.disk = null;
  }

  private sanitize(key: string) {
    return sanitize(key);
  }

  private changelogPath(key: string) {
    return changelogPath(this.changelogDir, key);
  }

  private async readChangelogFile(key: string) {
    return await readChangelogFile(this.changelogDir, key);
  }

  private normalizeChangelogArray(raw: any[]): Array<any> {
    return normalizeChangelogArray(raw);
  }

  private async writeChangelogFile(key: string, arr: any[]) {
    return await writeChangelogFile(this.changelogDir, key, arr);
  }

  private diffValues(oldVal: any, newVal: any) {
    return diffValues(oldVal, newVal);
  }

  async listKeys() {
    try {
    } catch (e) {}
    return Array.from(this.knownKeys).sort();
  }

  async getChangelog(key: string) {
    const mem = this.changelogs.get(key);
    if (mem) {
      const normalized = this.normalizeChangelogArray(mem);

      this.changelogs.set(key, normalized);

      await this.writeChangelogFile(key, normalized);
      return normalized;
    }
    const arr = await this.readChangelogFile(key);

    this.changelogs.set(key, arr);
    return arr;
  }

  async status() {
    return {
      keys: Array.from(this.knownKeys).sort(),
      keysCount: this.knownKeys.size,
      changelogsCount: this.changelogs.size,
      refreshCount: this.refreshTimers.size,
      lastUpdated: metrics.getLastUpdatedObj(),
      nextRefresh: metrics.getNextRefreshObj(),
      hits: metrics.getHitsObj(),
      misses: metrics.getMissesObj(),
      cacheDir: this.tmpDir,
    };
  }

  async has(key: string) {
    return await adapter.has(key);
  }

  async get(key: string) {
    try {
      const v = await adapter.get(key);
      if (v !== undefined && v !== null) {
        metrics.incHit(key);
        this.knownKeys.add(key);
        return v;
      }
      metrics.incMiss(key);
      return null;
    } catch (e) {
      metrics.incMiss(key);
      return null;
    }
  }

  private async recordChange(key: string, oldVal: any, newVal: any) {
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return;
    const diffs = this.diffValues(oldVal, newVal);
    if (!diffs || diffs.length === 0) return;
    const entry = {
      at: new Date().toISOString(),
      changes: diffs,
    };
    const arr = this.changelogs.get(key) ?? (await this.readChangelogFile(key));
    arr.unshift(entry);

    this.changelogs.set(key, arr.slice(0, 500));
    await this.writeChangelogFile(key, this.changelogs.get(key)!);
  }

  async refreshKey(key: string, loader?: Loader, opts?: CacheOptions) {
    const _loader = loader ?? this.loaders.get(key);
    if (!_loader)
      return { ok: false, reason: "no loader registered or provided" };
    try {
      const fresh = await _loader();
      await this.set(key, fresh, opts);

      try {
        const count =
          fresh && typeof fresh === "object" ? Object.keys(fresh).length : 0;
        const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
        const hitRate = 0;
        const apiLabel = key.includes("templates")
          ? "sheets/TEMPLATES"
          : key.replace(/:/g, "/");
        console.log(
          `🎯 | cache refresh ${time} - ${count} translations | API: ${apiLabel} | Hit rate: ${hitRate.toFixed(
            1,
          )}%`,
        );
      } catch (e) {}
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  }

  async clearKey(key: string) {
    try {
      await adapter.del(key).catch?.(() => {});
    } catch (e) {}

    this.changelogs.delete(key);
    try {
      await fsp.unlink(this.changelogPath(key)).catch(() => {});
    } catch (e) {}
    this.knownKeys.delete(key);
    this.loaders.delete(key);
    if (this.refreshTimers.has(key)) scheduler.cancel(key);
    this.refreshTimers.delete(key);
    metrics.deleteKeyMetrics(key);
    return { ok: true };
  }

  async getProgress() {
    return {
      entries: metrics.getProgressEntries(this.knownKeys, this.refreshTimers),
    };
  }

  async set(key: string, value: any, opts?: CacheOptions) {
    const ttlMs = opts?.ttl ?? 0;
    const ttlSec = ttlMs ? Math.ceil(ttlMs / 1000) : 0;
    const prev = await this.get(key);
    await this.recordChange(key, prev, value);
    await adapter.set(key, value, ttlMs).catch(() => {});
    this.knownKeys.add(key);
    metrics.setLastUpdated(key, Date.now());
  }

  async getOrLoad(key: string, loader: Loader, opts?: CacheOptions) {
    this.loaders.set(key, loader);
    const existing = await this.get(key);
    if (existing !== null) {
      if (opts?.refreshInterval)
        this.scheduleRefresh(key, loader, opts.refreshInterval, opts);
      return existing;
    }

    const fresh = await loader();
    await this.set(key, fresh, opts);
    if (opts?.refreshInterval)
      this.scheduleRefresh(key, loader, opts.refreshInterval, opts);
    return fresh;
  }

  private scheduleRefresh(
    key: string,
    loader: Loader,
    intervalMs: number,
    opts?: CacheOptions,
  ) {
    if (this.refreshTimers.has(key)) return;
    scheduler.schedule(key, intervalMs, async () => {
      try {
        const fresh = await loader();
        await this.set(key, fresh, opts);
      } catch (e) {}
    });
    this.refreshTimers.add(key);
    metrics.setNextRefresh(key, Date.now() + intervalMs);
  }
}

const cache = new CacheService();
export default cache;
