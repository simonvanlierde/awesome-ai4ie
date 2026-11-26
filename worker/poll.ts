import { POLL_OPTION_IDS, type PollCounts, type PollOptionId } from "../src/lib/poll.ts";
import { verifyTurnstile, withinContributeLimit } from "./contribute.ts";
import type { Env } from "./search.ts";

const COUNTS_KEY = "counts";
const VALID_IDS = new Set<string>(POLL_OPTION_IDS);
const MAX_TOKEN = 2048;
const NO_STORE = { "cache-control": "no-store" };

type Totals = { counts: PollCounts; voters: number };
type PollTransaction = {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
};
type PollStorage = Pick<PollTransaction, "get"> & {
  transaction<T>(callback: (transaction: PollTransaction) => Promise<T>): Promise<T>;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

async function readTotals(storage: Pick<PollTransaction, "get">): Promise<Totals> {
  return (
    (await storage.get<Totals>(COUNTS_KEY)) ?? {
      counts: Object.fromEntries(POLL_OPTION_IDS.map((id) => [id, 0])) as PollCounts,
      voters: 0,
    }
  );
}

// One object stores totals for this poll. A ballot changes the option counts and voter count
// in the same transaction, and the object receives only choices the Worker has validated.
export class Poll {
  constructor(private readonly state: { storage: PollStorage }) {}

  async fetch(request: Request): Promise<Response> {
    const storage = this.state.storage;
    let totals: Totals;
    if (request.method === "GET") {
      totals = await readTotals(storage);
    } else {
      const choices = (await request.json()) as PollOptionId[];
      totals = await storage.transaction(async (transaction) => {
        const next = await readTotals(transaction);
        for (const id of choices) next.counts[id] += 1;
        next.voters += 1;
        await transaction.put(COUNTS_KEY, next);
        return next;
      });
    }
    return Response.json({ ...totals, turnstileRequired: true }, { headers: NO_STORE });
  }
}

async function pollRequest(namespace: NonNullable<Env["POLL"]>, init?: RequestInit) {
  const result = await namespace
    .getByName("verification-norms")
    .fetch(new Request("https://poll.internal", init));
  if (!result.ok) throw new Error(`Poll storage: HTTP ${result.status}`);
  return result;
}

export async function handlePoll(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST" && request.method !== "GET")
    return new Response("Use GET or POST", { status: 405, headers: { allow: "GET, POST" } });

  if (
    request.method === "POST" &&
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return new Response("Send application/json", { status: 415 });

  if (!env.POLL || !env.TURNSTILE_SECRET_KEY)
    return jsonError("Poll is currently unavailable.", 503);

  if (request.method === "GET") {
    try {
      return await pollRequest(env.POLL);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep the storage failure cause
      console.error("poll read error", err);
      return jsonError("Poll is currently unavailable.", 503);
    }
  }

  const allowed = await withinContributeLimit(env, request);
  if (allowed === null) return jsonError("Poll is currently unavailable.", 503);
  if (!allowed) return jsonError("Too many requests. Wait a minute and try again.", 429);

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return jsonError("Send a JSON object.", 400);

  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.choices) || body.choices.length === 0)
    return jsonError("Choose at least one check.", 400);

  const unique: PollOptionId[] = [];
  const seen = new Set<string>();
  for (const item of body.choices) {
    if (typeof item !== "string" || !VALID_IDS.has(item))
      return jsonError("Unknown poll choice.", 400);
    if (!seen.has(item)) {
      seen.add(item);
      unique.push(item as PollOptionId);
    }
  }

  if (typeof body.token !== "string" || !body.token.trim() || body.token.length > MAX_TOKEN)
    return jsonError("Complete the verification check before voting.", 400);
  const verified = await verifyTurnstile(
    env.TURNSTILE_SECRET_KEY,
    body.token.trim(),
    request.headers.get("cf-connecting-ip"),
  );
  if (verified === null)
    return jsonError("Verification service is unavailable. Please try again later.", 503);
  if (!verified) return jsonError("Verification failed. Reload the check and try again.", 403);

  try {
    return await pollRequest(env.POLL, { method: "POST", body: JSON.stringify(unique) });
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep the storage failure cause
    console.error("poll write error", err);
    return jsonError("Could not record your vote right now.", 503);
  }
}
