# Vocabulary conventions

The rules this tag vocabulary shares with
[r9lab-vocabulary](https://github.com/simonvanlierde/r9lab-vocabulary), so that a person or
a script that knows one knows the other. Each repository keeps its own tooling: this one
builds with TypeScript, r9lab-vocabulary with Python and rdflib. [CONTRIBUTING.md](../CONTRIBUTING.md)
("The tag vocabulary") has the steps for this repository.

## Shared

- **YAML is the source.** People edit YAML; the build writes the SKOS (Turtle and JSON-LD)
  and adds the links that follow from it, such as `hasTopConcept`. Nobody edits the RDF by
  hand.
- **SKOS core only.** `prefLabel` and a one-line `definition` in English, `broader` and
  `related` inside the vocabulary, one `skos:ConceptScheme` per scheme. No SKOS-XL.
- **Ids are permanent.** An id is never reused, not even in another scheme. A concept that
  goes away is marked deprecated, points at its replacement where one exists, and stays in
  the file.
- **Mappings say how close they are.** `exactMatch` only for the same concept, `closeMatch`
  for one near enough to swap in some uses, `broadMatch` and `narrowMatch` for a wider or a
  narrower one, `relatedMatch` for the rest. An `exactMatch` never sits beside a broader or
  narrower match to the same target. An OpenAlex topic is always a `closeMatch`.
- **Every outside id is checked.** Nobody types an id from memory: look it up in the
  source. Wikidata and OpenAlex links are checked against the live services once a week,
  and a dead or merged one fails that run. Code lists without a live API are pinned by
  checksum.
- **One vocabulary maps to the other** with `broadMatch`, `narrowMatch` or `relatedMatch`,
  never `exactMatch`: their concepts are cut at different grains. Add such a link only when
  something reads it.
- **IRIs live under w3id.org** (`https://w3id.org/<project>/vocabulary/`), so they outlive
  a domain or host. r9lab-vocabulary has applied for its redirect; this vocabulary still
  uses `https://ai4ie.org/vocabulary/#<id>`.

## Different on purpose

| | This vocabulary | r9lab-vocabulary |
|---|---|---|
| Ids | Readable kebab-case (`lca`), since they appear in page URLs and filters | Opaque (`m0001`), since class names change as the study refines them |
| YAML | One list, each concept with a `scheme` | One file per scheme, concepts keyed by id |
| Mapping keys | `exactMatch`, `closeMatch` | `mappings: {exact, close, broad, narrow, related}` |
| Validation | SHACL (SkoHub shapes) on the built graph, plus tests | Rule checks in the build, plus tests |
| Licence | CC BY 4.0 | CC0 1.0 |
