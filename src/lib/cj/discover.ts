/**
 * Product discovery: finds trending, in-stock home & kitchen products on
 * CJdropshipping (official API) and stores them — with every photo and video
 * CJ returns, real supplier cost, UK shipping quote, warehouse and delivery
 * time — in the SourcingCandidate table for you to review in /admin/sourcing.
 */
import { db } from "@/lib/db";
import * as cj from "./client";
import type { CjListProduct } from "./types";
import { collectImages, fetchOffer, fetchVideos, num } from "./catalog";

/** Searches we run against CJ's catalogue. Edit freely. */
export const DISCOVERY_KEYWORDS = [
  "kitchen gadget",
  "kitchen tools",
  "kitchen storage organizer",
  "air fryer accessories",
  "vegetable cutter",
  "coffee accessories",
  "baking tools",
  "silicone kitchen",
  "fridge organizer",
  "spice rack",
  "drawer organizer kitchen",
  "kitchen cleaning brush",
  "food storage container",
  "oil sprayer",
  "garlic press",
  "egg tools",
];

/** Must look like a home/kitchen product… */
const KITCHEN_WORDS = [
  "kitchen", "cook", "bak", "fryer", "coffee", "tea", "milk", "food", "fruit", "vegetable", "veggie",
  "fridge", "refrigerator", "spice", "oil", "garlic", "egg", "pan", "pot", "lunch", "storage",
  "organizer", "organiser", "drawer", "dish", "sink", "cutting", "peeler", "grater", "slicer",
  "whisk", "spatula", "silicone", "jar", "container", "bottle", "cup", "mug", "kettle", "chopper",
];

/**
 * …and must not be something we shouldn't sell or ship easily in the UK:
 * knives/blades (age verification rules), lighters, loose lithium batteries,
 * vapes, medical or baby/child products (extra safety rules), weapons.
 */
const EXCLUDED_WORDS = [
  "knife", "knives", "cleaver", "machete", "dagger", "blade set", "lighter", "butane", "gas torch",
  "vape", "e-cigarette", "cigarette", "medical", "baby", "infant", "toddler", "kids", "children",
  "toy", "weapon", "self defense", "adult", "sexy", "cbd", "pesticide",
];

export function isEligible(name: string): boolean {
  const n = name.toLowerCase();
  if (EXCLUDED_WORDS.some((w) => n.includes(w))) return false;
  return KITCHEN_WORDS.some((w) => n.includes(w));
}

interface Found {
  p: CjListProduct;
  score: number;
  source: string;
  keyword: string;
}

export async function discoverProducts(opts: { limit?: number; log?: (s: string) => void } = {}) {
  const limit = opts.limit ?? 25;
  const log = opts.log ?? console.log;
  const known = new Set([
    ...(await db.product.findMany({ select: { cjProductId: true } })).map((r) => r.cjProductId),
    ...(await db.sourcingCandidate.findMany({ where: { status: "REJECTED" }, select: { cjProductId: true } })).map(
      (r) => r.cjProductId,
    ),
  ]);

  const found = new Map<string, Found>();
  const consider = (p: CjListProduct, source: string, keyword: string, bonus: number) => {
    if (!p.id || known.has(p.id) || !isEligible(p.nameEn ?? "")) return;
    const score = bonus + Math.log10(num(p.listedNum) + 1) * 10 + Math.min(Math.log10(num(p.warehouseInventoryNum) + 1), 4) * 2 + (num(p.isVideo) ? 5 : 0);
    const prev = found.get(p.id);
    if (!prev || prev.score < score) found.set(p.id, { p, score, source, keyword });
  };

  for (const keyword of DISCOVERY_KEYWORDS) {
    for (const country of ["GB", "DE"] as const) {
      const bonus = country === "GB" ? 30 : 15;
      try {
        // Trending products for this keyword, stocked in a UK/EU warehouse.
        const trending = await cj.searchProducts({ keyWord: keyword, countryCode: country, productFlag: 0, size: 20 });
        trending.forEach((p) => consider(p, "trending", keyword, bonus + 20));
        // Best sellers (most listed by other shops) for the same keyword.
        const popular = await cj.searchProducts({ keyWord: keyword, countryCode: country, orderBy: 1, sort: "desc", size: 20 });
        popular.forEach((p) => consider(p, `search:${keyword}`, keyword, bonus));
      } catch (err) {
        log(`  "${keyword}" (${country}) failed: ${(err as Error).message}`);
      }
    }
    log(`  searched "${keyword}" — ${found.size} candidates so far`);
  }

  const ranked = [...found.values()].sort((a, b) => b.score - a.score);
  log(`\n${ranked.length} eligible products found; fetching full details for the top ${limit}…`);

  let saved = 0;
  for (const { p, source, keyword } of ranked) {
    if (saved >= limit) break;
    try {
      const { detail, offer } = await fetchOffer(p.id);
      if (!offer) {
        log(`  skip ${p.nameEn}: no in-stock variant that ships to the UK`);
        continue;
      }
      const videos = await fetchVideos(p.id);
      const main = offer.variants[0];
      const data = {
        cjName: detail.productNameEn ?? p.nameEn ?? "",
        cjSku: detail.productSku ?? p.sku ?? null,
        cjCategory: p.threeCategoryName ?? null,
        supplierName: p.supplierName || null,
        source,
        matchedKeyword: keyword,
        listedNum: Math.round(num(p.listedNum)),
        supplierCostUsd: main.supplierCostUsd,
        shippingCostUsd: main.shippingCostUsd,
        warehouseCountry: offer.warehouseCountry,
        logisticName: main.logisticName,
        deliveryMinDays: main.deliveryMinDays,
        deliveryMaxDays: main.deliveryMaxDays,
        variantCount: offer.variants.length,
        stock: offer.variants.reduce((s, v) => s + v.stock, 0),
        estPricePence: main.priced.pricePence,
        estProfitPence: main.priced.estProfitPence,
        isAddOn: main.priced.isAddOn,
        images: JSON.stringify(collectImages(detail, offer)),
        videos: JSON.stringify(videos.map((v) => v.url)),
      };
      await db.sourcingCandidate.upsert({
        where: { cjProductId: p.id },
        create: { cjProductId: p.id, ...data },
        update: data,
      });
      saved++;
      log(
        `  ✓ ${data.cjName} — ${offer.warehouseCountry}, $${main.supplierCostUsd} + $${main.shippingCostUsd} ship, ` +
          `${main.deliveryMinDays ?? "?"}–${main.deliveryMaxDays ?? "?"} days, ${JSON.parse(data.images).length} photos, ${videos.length} videos`,
      );
    } catch (err) {
      log(`  ✗ ${p.nameEn}: ${(err as Error).message}`);
    }
  }
  return { searched: DISCOVERY_KEYWORDS.length, eligible: ranked.length, saved };
}
