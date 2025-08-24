import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["src"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
        autoUpdate: true,
      },
    },
  },
});