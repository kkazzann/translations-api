import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { sanitize } from "./helpers";

const tmpDir = path.resolve(process.cwd(), "tmp", "cache");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

type Entry = { value: any; meta: { savedAt: number; ttl: number } };

const mem = new Map<string, Entry>();

function filePathFor(key: string) {
  return path.join(tmpDir, `${sanitize(key)}.json`);
}

async function readFromDisk(key: string): Promise<Entry | null> {
  const fp = filePathFor(key);
  try {
    const txt = await fsp.readFile(fp, "utf8");
    const parsed = JSON.parse(txt) as Entry;
    return parsed;
  } catch (e) {
    return null;
  }
}

async function writeToDisk(key: string, entry: Entry) {
  const fp = filePathFor(key);
  try {
    await fsp.writeFile(fp, JSON.stringify(entry), "utf8");
  } catch (e) {
    // ignore
  }
}

export async function get(key: string) {
  const e = mem.get(key);
  if (e) {
    if (e.meta.ttl > 0 && Date.now() - e.meta.savedAt > e.meta.ttl) {
      mem.delete(key);
      try {
        await fsp.unlink(filePathFor(key));
      } catch (e) {}
      return null;
    }
    return e.value;
  }

  const disk = await readFromDisk(key);
  if (!disk) return null;
  if (disk.meta.ttl > 0 && Date.now() - disk.meta.savedAt > disk.meta.ttl) {
    try {
      await fsp.unlink(filePathFor(key));
    } catch (e) {}
    return null;
  }
  mem.set(key, disk);
  return disk.value;
}

export async function set(key: string, value: any, ttlMs = 0) {
  const entry: Entry = { value, meta: { savedAt: Date.now(), ttl: ttlMs } };
  mem.set(key, entry);
  await writeToDisk(key, entry);
}

export async function del(key: string) {
  mem.delete(key);
  try {
    await fsp.unlink(filePathFor(key));
  } catch (e) {}
}

export async function has(key: string) {
  const v = await get(key);
  return v !== null && v !== undefined;
}
