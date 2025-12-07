import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Load test-specific env first, then fall back to .env when present
dotenv.config({ path: ".env.test", override: false });
dotenv.config({ path: ".env", override: false });

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    include: ["../tests/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
