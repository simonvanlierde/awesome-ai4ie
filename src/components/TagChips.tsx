import { TAG_DIMS, type TagDim, tagLabel } from "../data/tags";

/** One read-only chip per tag, in dimension order (IE, ML, type), coloured by
 * dimension; an IE-field chip also takes its field ink. Returns bare spans, so
 * the caller supplies the wrapping element. */
export default function TagChips(tags: Partial<Record<TagDim, readonly string[]>>) {
  return TAG_DIMS.flatMap((dim) =>
    (tags[dim] ?? []).map((t) => (
      <span
        key={`${dim}:${t}`}
        className={`lit-tag lit-tag-${dim}${dim === "ie" ? ` field-${t}` : ""}`}
      >
        {tagLabel(dim, t)}
      </span>
    )),
  );
}
