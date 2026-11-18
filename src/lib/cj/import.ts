/**
 * Imports the products defined in src/content/products.ts from CJ.
 * Used by `npm run import` and the "Import products from CJ" admin button.
 * Read-only on CJ's side: searches and reads product data, never orders.
 */
import { productContent } from "@/content/products";
import { warehouseLabels } from "@/config/store";
import { db } from "@/lib/db";
import { formatGBP } from "@/lib/pricing";
import { fetchVideos, findBestMatch, saveProduct } from "./catalog";

export const PIN_PREFIX = "pin:";

export async function importProducts(opts: { keys?: string[]; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const targets = opts.keys?.length ? productContent.filter((c) => opts.keys!.includes(c.key)) : productContent;
  const syncLog = await db.syncLog.create({ data: { kind: "import" } });
  const lines: string[] = [];
  let ok = 0;

  // Products you picked by hand in /admin/sourcing ("Use for…") are pinned.
  const pins = new Map(
    (await db.setting.findMany({ where: { key: { startsWith: PIN_PREFIX } } })).map((row) => [
      row.key.slice(PIN_PREFIX.length),
      row.value,
    ]),
  );

  for (const base of targets) {
    const content = pins.has(base.key) ? { ...base, cjProductId: pins.get(base.key) } : base;
    log(`\n▶ ${content.key}${pins.has(base.key) ? " (pinned)" : ""}`);
    try {
      const match = await findBestMatch(content, log);
      if (!match) {
        log(`  ✗ no suitable product found (in stock, ships to the UK)`);
        lines.push(`${content.key}: not found`);
        continue;
      }
      const videos = await fetchVideos(match.detail.pid);
      const product = await saveProduct({ content, detail: match.detail, offer: match.offer, videos });
      const main = match.offer.variants[0];
      log(
        `  ✓ ${product.title} — ${formatGBP(product.pricePence)}` +
          ` (cost ${formatGBP(main.priced.supplierCostPence)} + ship ${formatGBP(main.priced.shippingCostPence)},` +
          ` est. profit ${formatGBP(main.priced.estProfitPence)})${product.isAddOn ? " [ADD-ON ONLY]" : ""}`,
      );
      log(
        `    ${warehouseLabels[match.offer.warehouseCountry]}, ${main.logisticName}, ` +
          `${main.deliveryMinDays ?? "?"}–${main.deliveryMaxDays ?? "?"} days, ` +
          `${match.offer.variants.length} variant(s), ${videos.length} video(s)`,
      );
      log(`    CJ listing: "${match.detail.productNameEn}" (${match.detail.pid})`);
      lines.push(`${content.key}: ${match.detail.pid} ${formatGBP(product.pricePence)}${product.isAddOn ? " add-on" : ""}`);
      ok++;
    } catch (err) {
      log(`  ✗ failed: ${(err as Error).message}`);
      lines.push(`${content.key}: error ${(err as Error).message}`);
    }
  }

  // Real products replace the demo catalogue.
  let removedDemo = 0;
  if (ok > 0) removedDemo = (await db.product.deleteMany({ where: { isDemo: true } })).count;

  await db.syncLog.update({
    where: { id: syncLog.id },
    data: { ok: ok === targets.length, summary: lines.join("\n"), finishedAt: new Date() },
  });
  return { imported: ok, total: targets.length, removedDemo, lines };
}
