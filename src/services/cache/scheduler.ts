const loops = new Map<string, { cancelled: boolean }>();

function schedule(key: string, intervalMs: number, fn: () => Promise<void>) {
  if (loops.has(key)) return;
  const controller = { cancelled: false };
  loops.set(key, controller);

  (async function runLoop() {
    while (!controller.cancelled) {
      try {
        await fn();
      } catch (e) {
        // swallow errors from job
      }
      // wait interval or until cancelled
      await new Promise((resolve) => {
        let waited = 0;
        const step = 500;
        const tick = () => {
          if (controller.cancelled) return resolve(null);
          waited += step;
          if (waited >= intervalMs) return resolve(null);
          setTimeout(tick, step);
        };
        setTimeout(tick, step);
      });
    }
  })();
}

function cancel(key: string) {
  const c = loops.get(key);
  if (c) c.cancelled = true;
  loops.delete(key);
}

function has(key: string) {
  return loops.has(key);
}

export default { schedule, cancel, has };
