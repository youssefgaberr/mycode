/** npm run sync — re-sync prices and stock from CJ (same as the admin button). */
import "./_env";
import { syncCatalog } from "@/lib/cj/catalog";
import { db } from "@/lib/db";

async function main() {
  const log = await db.syncLog.create({ data: { kind: "sync" } });
  const r = await syncCatalog();
  const summary = `updated ${r.updated}, hidden ${r.hidden}, failed ${r.failed}\n${r.priceChanges.join("\n")}`;
  await db.syncLog.update({ where: { id: log.id }, data: { ok: r.failed === 0, summary, finishedAt: new Date() } });
  console.log(summary);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
