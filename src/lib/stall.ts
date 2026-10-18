export class StalledError extends Error {}

/**
 * Runs `start` and rejects with StalledError when it reports no progress for
 * `ms`. `start` gets an `alive` function to call on every sign of progress;
 * the clock restarts each time, so a slow but steady task still finishes.
 * Once the result is settled (done, failed or stalled), `alive` returns false,
 * so the caller can ignore late progress from work that cannot be cancelled.
 */
export function withStall<T>(start: (alive: () => boolean) => Promise<T>, ms: number): Promise<T> {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const alive = () => {
      if (settled) return false;
      clearTimeout(timer);
      timer = setTimeout(() => finish(() => reject(new StalledError("stalled"))), ms);
      return true;
    };
    alive();
    start(alive).then(
      (value) => finish(() => resolve(value)),
      (err) => finish(() => reject(err)),
    );
  });
}
