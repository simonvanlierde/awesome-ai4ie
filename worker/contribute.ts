// POST /api/contribute: validates an on-site contribution, checks rate limits and
// Cloudflare Turnstile, and opens a moderated GitHub issue. No email field is accepted.
import { owner, repo } from "../src/site.ts";
import { type Env, limitKey } from "./search.ts";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const UPSTREAM_TIMEOUT_MS = 8000;
const CONTROL_CHARS = /\p{Cc}+/gu;

export const CONTRIBUTION_TYPES = {
  resource: {
    label: "entry",
    heading: "Paper, tool, or dataset",
    prefix: "Resource",
  },
  "golden-question": {
    label: "golden-question",
    heading: "Golden question (candidate)",
    prefix: "Golden question",
  },
  "ai-mistake": {
    label: "ai-mistake",
    heading: "AI mistake in IE work",
    prefix: "AI mistake",
  },
  other: {
    label: "community-comment",
    heading: "Other or comment on an open question",
    prefix: "Comment",
  },
} as const;

export type ContributionType = keyof typeof CONTRIBUTION_TYPES;

const MAX_TITLE = 140;
const MIN_TITLE = 3;
const MAX_DETAILS = 4000;
const MIN_DETAILS = 10;
const MAX_URL = 500;
const MAX_ATTRIBUTION = 120;
const MAX_TOKEN = 2048;

const NO_STORE = { "cache-control": "no-store" };

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

function cleanLine(value: string): string {
  return value.replace(CONTROL_CHARS, " ").trim();
}

/** Shared rate limiter for /api/contribute and /api/poll. Returns null when a binding is missing
 * or fails, so callers fail closed with 503 instead of allowing unmetered writes. */
export async function withinContributeLimit(env: Env, request: Request): Promise<boolean | null> {
  if (!env.CONTRIBUTE_LIMIT || !env.CONTRIBUTE_LIMIT_GLOBAL) return null;
  const key = limitKey(request.headers.get("cf-connecting-ip") ?? "unknown");
  try {
    if (!(await env.CONTRIBUTE_LIMIT.limit({ key })).success) return false;
    const ok = (await env.CONTRIBUTE_LIMIT_GLOBAL.limit({ key: "all" })).success;
    // biome-ignore lint/suspicious/noConsole: Workers Logs show when the shared cap trips
    if (!ok) console.warn("contribute: CONTRIBUTE_LIMIT_GLOBAL reached");
    return ok;
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep the cause
    console.error(err);
    return null;
  }
}

/** Verifies a Cloudflare Turnstile token. Returns null on upstream failure. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
): Promise<boolean | null> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs keep upstream status without secrets
      console.error(`turnstile siteverify failed: HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { success?: unknown };
    return data?.success === true;
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep upstream failure cause
    console.error("turnstile siteverify error", err);
    return null;
  }
}

function parseUrl(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: "Link must be a URL string." };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: "" };
  if (trimmed.length > MAX_URL)
    return { ok: false, error: `Link must be at most ${MAX_URL} characters.` };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return { ok: false, error: "Link must start with http:// or https://." };
    return { ok: true, value: parsed.href };
  } catch {
    return { ok: false, error: "Link must be a valid http:// or https:// URL." };
  }
}

function buildIssueBody(input: {
  type: ContributionType;
  details: string;
  url: string;
  attribution: string;
}): string {
  const meta = CONTRIBUTION_TYPES[input.type];
  const lines = [
    `**Type:** ${meta.heading}`,
    `**Attribution:** ${input.attribution || "Anonymous"}`,
  ];
  if (input.url) lines.push(`**Link:** ${input.url}`);
  lines.push("", "### Details", "", input.details);
  if (input.type === "golden-question") {
    lines.push(
      "",
      "_Note: Collected as a candidate benchmark question for community review, not published as a benchmark._",
    );
  }
  lines.push(
    "",
    "---",
    "_Submitted via the on-site form at ai4ie.org/contribute/. Moderated before inclusion._",
  );
  return lines.join("\n");
}

export async function handleContribute(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST")
    return new Response("Use POST", { status: 405, headers: { allow: "POST" } });

  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return new Response("Send application/json", { status: 415 });

  if (!env.TURNSTILE_SECRET_KEY || !env.GITHUB_ISSUES_TOKEN)
    return jsonError("On-site submissions are not configured right now.", 503);

  const allowed = await withinContributeLimit(env, request);
  if (allowed === null) return jsonError("Submissions are currently unavailable.", 503);
  if (!allowed) return jsonError("Too many submissions. Wait a minute and try again.", 429);

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return jsonError("Send a JSON object.", 400);

  const body = raw as Record<string, unknown>;
  if ("email" in body) return jsonError("Do not include an email address.", 400);

  if (typeof body.type !== "string" || !Object.hasOwn(CONTRIBUTION_TYPES, body.type))
    return jsonError("Choose a valid contribution type.", 400);
  const type = body.type as ContributionType;

  if (typeof body.title !== "string") return jsonError("Provide a short title.", 400);
  const title = cleanLine(body.title);
  if (title.length < MIN_TITLE || title.length > MAX_TITLE)
    return jsonError(`Title must be ${MIN_TITLE} to ${MAX_TITLE} characters.`, 400);

  if (typeof body.details !== "string")
    return jsonError("Provide details for your submission.", 400);
  const details = body.details.trim();
  if (details.length < MIN_DETAILS || details.length > MAX_DETAILS)
    return jsonError(`Details must be ${MIN_DETAILS} to ${MAX_DETAILS} characters.`, 400);

  const urlCheck = parseUrl(body.url);
  if (!urlCheck.ok) return jsonError(urlCheck.error, 400);

  let attribution = "";
  if (body.attribution !== undefined && body.attribution !== null) {
    if (typeof body.attribution !== "string")
      return jsonError("Attribution must be plain text.", 400);
    attribution = cleanLine(body.attribution);
    if (attribution.length > MAX_ATTRIBUTION)
      return jsonError(`Attribution must be at most ${MAX_ATTRIBUTION} characters.`, 400);
  }

  if (typeof body.token !== "string" || !body.token.trim() || body.token.length > MAX_TOKEN)
    return jsonError("Complete the verification check before submitting.", 400);

  const ip = request.headers.get("cf-connecting-ip");
  const verified = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body.token.trim(), ip);
  if (verified === null)
    return jsonError("Verification service is unavailable. Please try again later.", 503);
  if (!verified) return jsonError("Verification failed. Reload the check and try again.", 403);

  const meta = CONTRIBUTION_TYPES[type];
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_ISSUES_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": `${repo}-worker`,
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({
        title: `[${meta.prefix}] ${title}`,
        body: buildIssueBody({ type, details, url: urlCheck.value, attribution }),
        labels: ["community-submission", meta.label],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!ghRes.ok) {
      // biome-ignore lint/suspicious/noConsole: Workers Logs record status without leaking token
      console.error(`github issue create failed: HTTP ${ghRes.status}`);
      return jsonError(
        "Could not create a GitHub issue right now. You can submit directly on GitHub.",
        502,
      );
    }
    const created = (await ghRes.json()) as { number?: number; html_url?: string };
    return Response.json(
      { ok: true, issueNumber: created.number ?? null, issueUrl: created.html_url ?? null },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Workers Logs keep cause without exposing it to clients
    console.error("github issue create error", err);
    return jsonError("Could not reach GitHub right now. You can submit directly on GitHub.", 502);
  }
}
