import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/setup-db.ts"],
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      STORE_MODE: "test",
      RESEND_API_KEY: "",
    },
    fileParallelism: false,
  },
});
