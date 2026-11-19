// Scores for scripts/search-eval.mjs, kept apart so a test can feed them made-up rankings.

/** Questions with an odd position are held out: the cut-off is tuned on the even ones only. */
export const isHeldOut = (i) => i % 2 === 1;

/** Held-out floors; the eval fails below them. Raise them when the model or cut-off improves. */
export const HIT1_MIN = 0.9;
export const MRR_MIN = 0.93;

/** hit@1 and MRR over in-list questions. Each row is `{ expect, shown }`: the right ids and
 * the ids the site would show, best first. A question that shows no right id scores 0. */
export function summarize(rows) {
  const inList = rows.filter((r) => r.expect.length);
  if (!inList.length) return { n: 0, hit1: 0, mrr: 0 };
  const rr = inList.map((r) => {
    const at = r.shown.findIndex((id) => r.expect.includes(id));
    return at < 0 ? 0 : 1 / (at + 1);
  });
  return {
    n: inList.length,
    hit1: rr.filter((x) => x === 1).length / inList.length,
    mrr: rr.reduce((a, b) => a + b, 0) / inList.length,
  };
}

export function formatScore({ n, hit1, mrr }) {
  return `hit@1 ${hit1.toFixed(3)}, MRR ${mrr.toFixed(3)} (${n} questions)`;
}
