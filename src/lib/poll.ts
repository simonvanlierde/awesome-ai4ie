// Candidate IE verification norms for the on-site poll, shared by the Worker
// (worker/poll.ts) and the Astro component (src/components/NormsPoll.astro).

export interface PollOption {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
}

export const POLL_OPTIONS = [
  {
    id: "golden-test",
    label: "Known-answer test on a unit or method",
    summary: "Known-answer checks on calculations, unit conversions, and mass or energy balances.",
  },
  {
    id: "held-out-test",
    label: "Checks the AI cannot edit",
    summary:
      "Tests kept where an AI coding assistant cannot change them, so it cannot pass by editing the test.",
  },
  {
    id: "claim-ledger",
    label: "Claim ledger linking citations to read passages",
    summary: "Each cited claim tied to a passage the author or tool actually read.",
  },
  {
    id: "compute-receipt",
    label: "Log of model, use and energy",
    summary:
      "Which model ran, how much text it processed, runtime, or energy used for AI-assisted analysis.",
  },
  {
    id: "lci-human-review",
    label: "Human review of LCI and ecoinvent mappings",
    summary:
      "A researcher checks every process match, proxy, and allocation choice before running the model.",
  },
  {
    id: "ai-methods-disclosure",
    label: "Disclosed AI use in methods",
    summary:
      "Short note in the paper or repository naming which tools were used and for which steps.",
  },
] as const satisfies readonly PollOption[];

export type PollOptionId = (typeof POLL_OPTIONS)[number]["id"];

export const POLL_OPTION_IDS: readonly PollOptionId[] = POLL_OPTIONS.map((o) => o.id);

export type PollCounts = Record<PollOptionId, number>;

export interface PollResponse {
  counts: PollCounts;
  voters: number;
  turnstileRequired: boolean;
}
