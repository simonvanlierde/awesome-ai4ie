import { defineConfig } from "vitest/config";

// lcov is what Codecov ingests; text prints a summary in CI logs. `include` lists
// files no test imports too (the React islands), so they count as uncovered.
export default defineConfig({
  test: {
    coverage: { include: ["src/**/*.{ts,tsx}"], reporter: ["text", "lcov"] },
  },
});
