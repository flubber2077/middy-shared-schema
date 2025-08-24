import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["src"],
      thresholds: {
        branches: 88,
        functions: 100,
        lines: 100,
        statements: 100,
        autoUpdate: true,
      },
    },
  },
});