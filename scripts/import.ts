/**
 * npm run import            — import every product in src/content/products.ts
 * npm run import -- milk-frother herb-scissors   — import only these keys
 *
 * Uses the official CJdropshipping API only. Read-only on CJ's side: it
 * searches and reads product data; it never places orders or spends money.
 */
import "./_env";
import { productContent } from "@/content/products";
import { fetchVideos, findBestMatch, saveProduct } from "@/lib/cj/catalog";
import { db } from "@/lib/db";
import { formatGBP } from "@/lib/pricing";
import { warehouseLabels } from "@/config/store";

async function main() {
  if (!process.env.CJ_API_KEY) {
    console.error("CJ_API_KEY is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }
  const only = process.argv.slice(2);
  const targets = only.length ? productContent.filter((c) => only.includes(c.key)) : productContent;
  if (targets.length === 0) {
    console.error(`No content entries match: ${only.join(", ")}`);
    process.exit(1);
  }

  const log = await db.syncLog.create({ data: { kind: "import" } });
  const lines: string[] = [];
  let ok = 0;

  for (const content of targets) {
    console.log(`\n▶ ${content.key}`);
    try {
      const match = await findBestMatch(content);
      if (!match) {
        console.log(`  ✗ no suitable product found (in stock, ships to the UK)`);
        lines.push(`${content.key}: not found`);
        continue;
      }
      const videos = await fetchVideos(match.detail.pid);
      const product = await saveProduct({ content, detail: match.detail, offer: match.offer, videos });
      const main = match.offer.variants[0];
      console.log(
        `  ✓ ${product.title} — ${formatGBP(product.pricePence)}` +
          ` (cost ${formatGBP(main.priced.supplierCostPence)} + ship ${formatGBP(main.priced.shippingCostPence)},` +
          ` est. profit ${formatGBP(main.priced.estProfitPence)})` +
          `${product.isAddOn ? " [ADD-ON ONLY]" : ""}`,
      );
      console.log(
        `    ${warehouseLabels[match.offer.warehouseCountry]}, ${main.logisticName}, ` +
          `${main.deliveryMinDays ?? "?"}–${main.deliveryMaxDays ?? "?"} days, ` +
          `${match.offer.variants.length} variant(s), ${videos.length} video(s)`,
      );
      console.log(`    CJ listing: "${match.detail.productNameEn}" (${match.detail.pid})`);
      lines.push(`${content.key}: ${match.detail.pid} ${formatGBP(product.pricePence)}${product.isAddOn ? " add-on" : ""}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ failed: ${(err as Error).message}`);
      lines.push(`${content.key}: error ${(err as Error).message}`);
    }
  }

  // Real products replace the demo catalogue.
  if (ok > 0) {
    const removed = await db.product.deleteMany({ where: { isDemo: true } });
    if (removed.count) console.log(`\nRemoved ${removed.count} demo product(s).`);
  }

  await db.syncLog.update({
    where: { id: log.id },
    data: { ok: ok === targets.length, summary: lines.join("\n"), finishedAt: new Date() },
  });
  console.log(`\nImported ${ok}/${targets.length}. Review each product in /admin before going live.`);
  console.log("If the site is already running elsewhere, press 'Re-sync from CJ' in /admin to refresh its cache.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
