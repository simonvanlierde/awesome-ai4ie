#!/usr/bin/env node
/**
 * Validates src/data/vocabulary.yaml and writes src/data/vocabulary.gen.ts, the
 * module the site imports its tags from. Run it after each edit to the YAML:
 *
 *   pnpm run vocabulary
 *
 * vocabulary.test.ts fails while the two disagree.
 */
import { writeFileSync } from "node:fs";
import { GENERATED_FILE, readVocabulary, renderGenerated } from "../src/data/vocabulary.ts";

writeFileSync(GENERATED_FILE, renderGenerated(readVocabulary()));
console.log(`wrote ${GENERATED_FILE}`);
