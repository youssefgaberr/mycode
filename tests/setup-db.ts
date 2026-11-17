import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Creates a fresh, throwaway SQLite database (prisma/test.db) for the integration tests. */
export default function setup() {
  for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
  const env = { ...process.env, DATABASE_URL: "file:./prisma/test.db" };
  // The generated client is provider-specific; make sure it's the SQLite one.
  execSync("npx prisma generate", { env, stdio: "ignore" });
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
}
