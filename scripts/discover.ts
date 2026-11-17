/**
 * npm run discover              — find up to 25 trending home & kitchen products on CJ
 * npm run discover -- 50        — find up to 50
 *
 * Saves real supplier data (photos, videos, cost, UK shipping, warehouse,
 * delivery time) into the sourcing database. Review and publish them in
 * /admin/sourcing. Read-only on CJ's side: never orders or spends anything.
 */
import "./_env";
import { discoverProducts } from "@/lib/cj/discover";
import { db } from "@/lib/db";

async function main() {
  if (!process.env.CJ_API_KEY && !process.env.CJ_ACCESS_TOKEN) {
    console.error("CJ_API_KEY is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }
  const limit = Number(process.argv[2]) || 25;
  const log = await db.syncLog.create({ data: { kind: "discover" } });
  const r = await discoverProducts({ limit });
  await db.syncLog.update({
    where: { id: log.id },
    data: { ok: true, summary: JSON.stringify(r), finishedAt: new Date() },
  });
  console.log(`\nSaved ${r.saved} product(s) to the sourcing database. Review them at /admin/sourcing.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
