// The index's vectors as raw float32 rows, so a cold Worker reads them as array views
// instead of parsing and decoding base64. literature-index.json names each entry's row.
import { getCollection } from "astro:content";
import { entryText } from "../lib/semantic";
import { vectorRows } from "../lib/vectors";

export async function GET() {
  const literature = await getCollection("literature");
  const { bytes } = vectorRows(literature.map(({ id, data }) => ({ id, text: entryText(data) })));
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "application/octet-stream" },
  });
}
