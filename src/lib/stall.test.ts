import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StalledError, withStall } from "./stall";

describe("withStall", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lets a task that keeps reporting progress run past the limit", async () => {
    let alive: () => boolean = () => false;
    let done: (v: string) => void = () => undefined;
    const result = withStall(
      (a) =>
        new Promise<string>((resolve) => {
          alive = a;
          done = resolve;
        }),
      1000,
    );
    for (let i = 0; i < 5; i++) {
      // biome-ignore lint/performance/noAwaitInLoops: each step must see the timer state the previous one left
      await vi.advanceTimersByTimeAsync(900);
      alive();
    }
    done("model");
    await expect(result).resolves.toBe("model");
  });

  it("rejects with StalledError after the limit without progress", async () => {
    const result = withStall(() => new Promise<never>(() => undefined), 1000);
    const caught = result.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await caught).toBeInstanceOf(StalledError);
  });

  it("ignores progress that arrives after a stall", async () => {
    let alive: () => boolean = () => true;
    const result = withStall((a) => {
      alive = a;
      return new Promise<never>(() => undefined);
    }, 1000);
    const caught = result.catch(() => "stalled");
    await vi.advanceTimersByTimeAsync(1000);
    expect(await caught).toBe("stalled");
    expect(alive()).toBe(false);
  });

  it("passes a task's own failure through", async () => {
    await expect(withStall(() => Promise.reject(new Error("offline")), 1000)).rejects.toThrow(
      "offline",
    );
  });
});
