import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toPostgres } from "../scripts/postgres-schema.mjs";

describe("Postgres schema", () => {
  it("is in sync with prisma/schema.prisma (run `npm run db:postgres` if this fails)", () => {
    const expected = toPostgres(readFileSync("prisma/schema.prisma", "utf8"));
    expect(readFileSync("prisma/postgres/schema.prisma", "utf8")).toBe(expected);
  });
  it("targets postgresql", () => {
    expect(readFileSync("prisma/postgres/schema.prisma", "utf8")).toContain('provider = "postgresql"');
  });
});
