import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

// Tests run against a throwaway PostgreSQL database (its name must contain "test").
const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5433/shelfie_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DB,
      DIRECT_URL: TEST_DB,
      UPLOAD_DIR: path.join(os.tmpdir(), "shelfie-test-uploads"),
      MAX_UPLOAD_MB: "8",
    },
  },
});
