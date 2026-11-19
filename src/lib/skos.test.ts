import { beforeAll, describe, expect, it } from "vitest";
import { readVocabulary } from "../data/vocabulary";
import { skosExpanded, skosTurtle } from "./skos";

const SKOS = "http://www.w3.org/2004/02/skos/core#";
const concepts = readVocabulary();

describe("skosExpanded", () => {
  let nodes: Record<string, unknown>[] = [];
  beforeAll(async () => {
    nodes = (await skosExpanded(concepts)) as Record<string, unknown>[];
  });
  const node = (id: string) =>
    nodes.find((n) => n["@id"] === `https://ai4ie.org/vocabulary/#${id}`);

  it("gives each concept a hash IRI and a language-tagged label", () => {
    expect(node("lca")?.["@type"]).toEqual([`${SKOS}Concept`]);
    expect(node("lca")?.[`${SKOS}prefLabel`]).toEqual([
      { "@value": "Life cycle assessment", "@language": "en" },
    ]);
  });
  it("links concepts, schemes and replacements by IRI", () => {
    expect(node("segmentation")?.[`${SKOS}broader`]).toEqual([
      { "@id": "https://ai4ie.org/vocabulary/#cv" },
    ]);
    expect(node("mfa")?.["http://purl.org/dc/terms/isReplacedBy"]).toEqual([
      { "@id": "https://ai4ie.org/vocabulary/#sem" },
    ]);
    expect(node("lca")?.[`${SKOS}inScheme`]).toEqual([
      { "@id": "https://ai4ie.org/vocabulary/#field" },
    ]);
  });
  it("marks retired concepts, and carries definitions and exact matches", () => {
    expect(node("mfa")?.["http://www.w3.org/2002/07/owl#deprecated"]).toBeTruthy();
    expect(node("lca")?.[`${SKOS}definition`]).toBeDefined();
    expect(node("lca")?.[`${SKOS}exactMatch`]).toBeDefined();
    const field = node("field")?.[`${SKOS}hasTopConcept`] as { "@id": string }[] | undefined;
    expect((field ?? []).map((t) => t["@id"])).not.toContain("https://ai4ie.org/vocabulary/#mfa");
  });
  it("adds one concept scheme per scheme, with its top concepts", () => {
    const schemes = nodes.filter((n) => (n["@type"] as string[]).includes(`${SKOS}ConceptScheme`));
    expect(schemes.map((s) => s["@id"])).toEqual(
      ["field", "topic", "technique", "type"].map((s) => `https://ai4ie.org/vocabulary/#${s}`),
    );
    const top = node("technique")?.[`${SKOS}hasTopConcept`] as { "@id": string }[] | undefined;
    const tops = (top ?? []).map((t) => t["@id"]);
    expect(tops).toContain("https://ai4ie.org/vocabulary/#cv");
    expect(tops).not.toContain("https://ai4ie.org/vocabulary/#segmentation");
  });
  it("leaves out the site-only reserved flag", async () => {
    const reserved = concepts.map((c) => ({ ...c, reserved: true as const }));
    const out = JSON.stringify(await skosExpanded(reserved));
    expect(out).not.toContain("reserved");
  });
});

describe("skosTurtle", () => {
  it("writes prefixed Turtle", async () => {
    const ttl = await skosTurtle(concepts);
    expect(ttl).toContain("@prefix skos: <http://www.w3.org/2004/02/skos/core#>.");
    expect(ttl).toContain("ai4ie:lca");
  });
});
