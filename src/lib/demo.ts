/**
 * Demo catalogue: clearly-labelled DEMO products so the shop can be tried
 * before connecting CJ. Made-up costs and placeholder images; blocked from
 * live checkout; deleted automatically by a real import.
 */
import { productContent } from "@/content/products";
import { db } from "@/lib/db";
import { slugify } from "@/lib/cj/catalog";
import { priceVariant, formatGBP } from "@/lib/pricing";

/** Invented USD costs, chosen to show a mix of main products and add-ons. */
const demo: Record<string, { cost: number; ship: number; wh: string; days: [number, number]; variants?: string[] }> = {
  "air-fryer-liners": { cost: 4.2, ship: 2.6, wh: "GB", days: [2, 5], variants: ["Square", "Round"] },
  "usb-food-chopper": { cost: 13.5, ship: 4.1, wh: "GB", days: [2, 5] },
  "milk-frother": { cost: 11.8, ship: 3.4, wh: "DE", days: [4, 8], variants: ["Black", "White"] },
  "fridge-organiser-bins": { cost: 14.6, ship: 5.2, wh: "GB", days: [3, 6] },
  "oil-spray-bottle": { cost: 5.1, ship: 3.0, wh: "DE", days: [5, 9] },
  "herb-scissors": { cost: 2.4, ship: 2.1, wh: "CN", days: [8, 15] },
  "silicone-baking-mat": { cost: 3.6, ship: 2.4, wh: "GB", days: [2, 5] },
  "vegetable-spiralizer": { cost: 12.9, ship: 4.4, wh: "DE", days: [4, 8] },
};

export async function seedDemoProducts(opts: { force?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const real = await db.product.count({ where: { isDemo: false } });
  if (real > 0 && !opts.force) {
    log(`There are already ${real} real product(s); not adding demo data. Use --force to add anyway.`);
    return 0;
  }
  for (const content of productContent) {
    const d = demo[content.key];
    if (!d) continue;
    const priced = priceVariant(d.cost, d.ship);
    const variantNames = d.variants ?? ["Standard"];
    const data = {
      cjProductId: `DEMO-${content.key}`,
      cjSku: null,
      cjName: "Demo product (not from CJ)",
      title: content.title,
      summary: content.summary,
      description: content.description,
      bullets: content.bullets.join("\n"),
      specs: JSON.stringify([
        { label: "Note", value: "Demo product — specifications appear here after importing from CJ" },
      ]),
      category: content.category,
      pricePence: priced.pricePence,
      supplierCostPence: priced.supplierCostPence,
      shippingCostPence: priced.shippingCostPence,
      estProfitPence: priced.estProfitPence,
      isAddOn: priced.isAddOn,
      warehouseCountry: d.wh,
      logisticName: "Demo Post",
      deliveryMinDays: d.days[0],
      deliveryMaxDays: d.days[1],
      inStock: true,
      published: true,
      isDemo: true,
    };
    const product = await db.product.upsert({
      where: { contentKey: content.key },
      create: { ...data, contentKey: content.key, slug: slugify(content.title) },
      update: data,
    });
    await db.variant.deleteMany({ where: { productId: product.id } });
    await db.variant.createMany({
      data: variantNames.map((name, i) => ({
        productId: product.id,
        cjVariantId: `DEMO-${content.key}-${i}`,
        name,
        supplierCostUsd: d.cost,
        shippingCostUsd: d.ship,
        supplierCostPence: priced.supplierCostPence,
        shippingCostPence: priced.shippingCostPence,
        pricePence: priced.pricePence,
        estProfitPence: priced.estProfitPence,
        warehouseCountry: d.wh,
        logisticName: "Demo Post",
        deliveryMinDays: d.days[0],
        deliveryMaxDays: d.days[1],
        stock: 100,
        position: i,
      })),
    });
    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: [1, 2, 3].map((n, position) => ({ productId: product.id, url: `/demo/${content.key}-${n}.svg`, position })),
    });
    log(
      `${content.title}: ${formatGBP(priced.pricePence)} (est. profit ${formatGBP(priced.estProfitPence)})${priced.isAddOn ? " [add-on]" : ""}`,
    );
  }
  log("\nDemo catalogue ready. Run `npm run import` with a CJ key to replace it with real products.");
  return productContent.filter((c) => demo[c.key]).length;
}

