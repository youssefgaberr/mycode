import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (your secrets), then .env as a fallback.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isPostgres = /^postgres(ql)?:\/\//.test(url);

/**
 * SQLite locally (prisma/schema.prisma), Postgres in production
 * (prisma/postgres/schema.prisma, generated). Picked from DATABASE_URL.
 * Migrations use the direct (unpooled) connection when one is provided,
 * e.g. by Vercel's Neon integration.
 */
export default defineConfig(
  isPostgres
    ? {
        schema: "prisma/postgres/schema.prisma",
        migrations: { path: "prisma/postgres/migrations" },
        datasource: { url: process.env.DATABASE_URL_UNPOOLED || url },
      }
    : {
        schema: "prisma/schema.prisma",
        migrations: { path: "prisma/migrations" },
        datasource: { url },
      },
);
