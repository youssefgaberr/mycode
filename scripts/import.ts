/**
 * npm run import            — import every product in src/content/products.ts
 * npm run import -- milk-frother herb-scissors   — import only these keys
 *
 * Uses the official CJdropshipping API only. Read-only on CJ's side: it
 * searches and reads product data; it never places orders or spends money.
 * (Also available as a button in /admin/products.)
 */
import "./_env";
import { productContent } from "@/content/products";
import { importProducts } from "@/lib/cj/import";
import { db } from "@/lib/db";

async function main() {
  if (!process.env.CJ_API_KEY && !process.env.CJ_ACCESS_TOKEN) {
    console.error("CJ_API_KEY is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }
  const keys = process.argv.slice(2);
  const unknown = keys.filter((k) => !productContent.some((c) => c.key === k));
  if (unknown.length) {
    console.error(`No content entries match: ${unknown.join(", ")}`);
    process.exit(1);
  }
  const r = await importProducts({ keys });
  if (r.removedDemo) console.log(`\nRemoved ${r.removedDemo} demo product(s).`);
  console.log(`\nImported ${r.imported}/${r.total}. Review each product in /admin before going live.`);
  console.log("If the site is already running elsewhere, press 'Re-sync from CJ' in /admin to refresh its cache.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
