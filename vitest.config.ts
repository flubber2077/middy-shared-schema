import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["src"],
      thresholds: {
        branches: 25,
        functions: 25,
        lines: 41.81,
        statements: 41.81,
        autoUpdate: true,
      },
    },
  },
});
