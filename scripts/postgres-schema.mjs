// Generates prisma/postgres/schema.prisma from prisma/schema.prisma.
//
// prisma/schema.prisma (SQLite) is the one you edit. Production on Vercel runs
// Postgres, and Prisma needs the provider fixed in the file, so this script
// writes a Postgres copy. Run `npm run db:postgres` after every schema change
// (a unit test fails if you forget).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

export function toPostgres(sqliteSchema) {
  return (
    "// GENERATED from prisma/schema.prisma by `npm run db:postgres` — do not edit.\n" +
    sqliteSchema
      .replace('provider = "sqlite"', 'provider = "postgresql"')
      .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"')
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = readFileSync("prisma/schema.prisma", "utf8");
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync("prisma/postgres/schema.prisma", toPostgres(src));
  console.log("Wrote prisma/postgres/schema.prisma");
}
