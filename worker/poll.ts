// GET and POST /api/poll: reads and updates live vote counts for candidate IE verification
// norms in Cloudflare KV (POLL_KV).
// NOTE: KV increments are read-modify-write and eventually consistent; suitable for an informal
// community poll, not an exact ledger.
import { POLL_OPTION_IDS, type PollCounts, type PollOptionId } from "../src/lib/poll.ts";
import { verifyTurnstile, withinContributeLimit } from "./contribute.ts";
import type { Env, KVStore } from "./search.ts";

const KEY_PREFIX = "poll:v1:";
const VOTERS_KEY = `${KEY_PREFIX}voters`;
const VALID_IDS = new Set<string>(POLL_OPTION_IDS);
const MAX_TOKEN = 2048;
const NO_STORE = { "cache-control": "no-store" };

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

function parseCount(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function readPoll(kv: KVStore): Promise<{ counts: PollCounts; voters: number }> {
  const [votersRaw, ...optRaw] = await Promise.all([
    kv.get(VOTERS_KEY),
    ...POLL_OPTION_IDS.map((id) => kv.get(`${KEY_PREFIX}${id}`)),
  ]);
  const counts = Object.fromEntries(
    POLL_OPTION_IDS.map((id, i) => [id, parseCount(optRaw[i])]),
  ) as PollCounts;
  return { counts, voters: parseCount(votersRaw) };
}

export async function handlePoll(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    if (!env.POLL_KV) return jsonError("Poll is currently unavailable.", 503);
    try {
      const { counts, voters } = await readPoll(env.POLL_KV);
      return Response.json(
        { counts, voters, turnstileRequired: Boolean(env.TURNSTILE_SECRET_KEY) },
        { headers: NO_STORE },
      );
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep KV failure cause
      console.error("poll read error", err);
      return jsonError("Poll is currently unavailable.", 503);
    }
  }

  if (request.method !== "POST")
    return new Response("Use GET or POST", { status: 405, headers: { allow: "GET, POST" } });

  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return new Response("Send application/json", { status: 415 });

  const allowed = await withinContributeLimit(env, request);
  if (allowed === null) return jsonError("Poll is currently unavailable.", 503);
  if (!allowed) return jsonError("Too many requests. Wait a minute and try again.", 429);

  if (!env.POLL_KV) return jsonError("Poll is currently unavailable.", 503);

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

  if (env.TURNSTILE_SECRET_KEY) {
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
  }

  try {
    const state = await readPoll(env.POLL_KV);
    const nextCounts: PollCounts = { ...state.counts };
    for (const id of unique) nextCounts[id] += 1;
    const nextVoters = state.voters + 1;

    await Promise.all([
      env.POLL_KV.put(VOTERS_KEY, String(nextVoters)),
      ...unique.map((id) => env.POLL_KV?.put(`${KEY_PREFIX}${id}`, String(nextCounts[id]))),
    ]);

    return Response.json(
      {
        counts: nextCounts,
        voters: nextVoters,
        turnstileRequired: Boolean(env.TURNSTILE_SECRET_KEY),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep KV failure cause
    console.error("poll write error", err);
    return jsonError("Could not record your vote right now.", 503);
  }
}
