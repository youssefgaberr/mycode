/**
 * Turning CJ data into shop products: match scoring, warehouse choice,
 * shipping quotes, pricing and saving to the database.
 *
 * Shared by `npm run import`, `npm run sync`, the admin "Re-sync" button and
 * the daily sync cron.
 */
import { store, warehouseLabels } from "@/config/store";
import type { ProductContent } from "@/content/products";
import { db } from "@/lib/db";
import { priceVariant } from "@/lib/pricing";
import * as cj from "./client";
import type { CjFreightOption, CjInventoryByPid, CjListProduct, CjProductDetail, CjVariant } from "./types";

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const norm = (s: string | undefined | null) => (s ?? "").toLowerCase().replace(/\s+/g, " ");

// ── matching ────────────────────────────────────────────────────────────────

export function matchesContent(name: string, content: ProductContent): boolean {
  const n = norm(name);
  if (!n) return false;
  if (content.match.none?.some((bad) => n.includes(bad))) return false;
  return content.match.all.every((group) => group.some((phrase) => n.includes(phrase)));
}

export function scoreCandidate(p: CjListProduct, content: ProductContent, searchedCountry?: string): number {
  const n = norm(p.nameEn);
  let score = 0;
  if (searchedCountry === "GB") score += 100;
  else if (searchedCountry === "DE") score += 60;
  score += (content.match.prefer ?? []).filter((w) => n.includes(w)).length * 4;
  score += Math.log10(num(p.listedNum) + 1) * 6; // popularity with other sellers
  score += Math.min(Math.log10(num(p.warehouseInventoryNum) + 1), 4) * 2;
  if (num(p.isVideo) === 1) score += 3;
  return score;
}

// ── offers (warehouse + shipping + price per variant) ───────────────────────

export interface VariantOffer {
  cjVariantId: string;
  cjSku?: string;
  name: string;
  supplierCostUsd: number;
  shippingCostUsd: number;
  stock: number;
  logisticName: string;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  imageUrl: string | null;
  priced: ReturnType<typeof priceVariant>;
}

export interface ProductOffer {
  warehouseCountry: string;
  variants: VariantOffer[];
}

export type QuoteFn = (from: string, vid: string) => Promise<CjFreightOption[]>;

export function parseAging(aging: string | undefined): { min: number | null; max: number | null } {
  const nums = (aging ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** Cheapest option; ties go to the faster one. */
/** A price CJ actually stated (0 is valid: UK-warehouse delivery is often free). */
function hasPrice(o: CjFreightOption) {
  const v = o.logisticPrice ?? o.totalPostageFee;
  if (v === undefined || v === null || v === "") return false;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0;
}

export function pickFreight(options: CjFreightOption[]): CjFreightOption | null {
  const valid = options.filter((o) => o.logisticName && hasPrice(o));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => {
    const diff = num(a.logisticPrice ?? a.totalPostageFee) - num(b.logisticPrice ?? b.totalPostageFee);
    if (Math.abs(diff) > 0.001) return diff;
    return (parseAging(a.logisticAging).max ?? 99) - (parseAging(b.logisticAging).max ?? 99);
  })[0];
}

/** Stock per country for each variant, merging the inventory endpoint with detail data. */
export function stockByVariant(detail: CjProductDetail, inventory: CjInventoryByPid | null) {
  const map = new Map<string, Map<string, number>>();
  const add = (vid: string, country: string, qty: number) => {
    if (!map.has(vid)) map.set(vid, new Map());
    const m = map.get(vid)!;
    m.set(country, Math.max(m.get(country) ?? 0, qty));
  };
  for (const v of detail.variants ?? []) {
    for (const inv of v.inventories ?? []) add(v.vid, inv.countryCode, num(inv.totalInventory));
  }
  for (const v of inventory?.variantInventories ?? []) {
    for (const inv of v.inventory ?? []) add(v.vid, inv.countryCode, num(inv.totalInventory));
  }
  return map;
}

const HAS_CJK = /[　-鿿＀-￯]/;

export function variantLabel(v: CjVariant, index: number): string {
  const key = (v.variantKey ?? "").trim();
  if (key && !HAS_CJK.test(key)) return key.split("-").map((s) => s.trim()).filter(Boolean).join(" / ");
  return `Option ${index + 1}`;
}

const MAX_VARIANTS = 12;

export async function buildOffer(
  detail: CjProductDetail,
  inventory: CjInventoryByPid | null,
  quote: QuoteFn,
  usdToGbp?: number,
  diag?: (s: string) => void,
): Promise<ProductOffer | null> {
  const variants = (detail.variants ?? []).filter((v) => v.vid && num(v.variantSellPrice) > 0);
  const stock = stockByVariant(detail, inventory);
  if (diag) {
    const totals = new Map<string, number>();
    for (const m of stock.values()) for (const [c, q] of m) totals.set(c, (totals.get(c) ?? 0) + q);
    diag(`    stock by warehouse: ${[...totals].map(([c, q]) => `${c}=${q}`).join(", ") || "none reported"} (${variants.length} priced variants)`);
  }

  for (const country of store.warehousePreference) {
    const inStock = variants
      .map((v, i) => ({ v, i, qty: stock.get(v.vid)?.get(country) ?? 0 }))
      .filter((x) => x.qty >= store.minimumWarehouseStock)
      .slice(0, MAX_VARIANTS);
    if (inStock.length === 0) continue;

    // Variants of similar weight ship for the same price; quote once per 50 g band.
    const quoteCache = new Map<number, CjFreightOption | null>();
    const offers: VariantOffer[] = [];
    for (const { v, i, qty } of inStock) {
      const band = Math.round(num(v.variantWeight) / 50);
      if (!quoteCache.has(band)) {
        let best: CjFreightOption | null = null;
        try {
          const options = await quote(country, v.vid);
          best = pickFreight(options);
          if (!best) diag?.(`    no usable UK shipping from ${country} (${options.length} option(s) returned)`);
        } catch (err) {
          console.warn(`  freight quote failed for ${v.vid} from ${country}: ${(err as Error).message}`);
          diag?.(`    shipping quote from ${country} failed: ${(err as Error).message}`);
        }
        quoteCache.set(band, best);
      }
      const freight = quoteCache.get(band);
      if (!freight) continue;
      const supplierCostUsd = num(v.variantSellPrice);
      const shippingCostUsd = num(freight.logisticPrice ?? freight.totalPostageFee);
      const aging = parseAging(freight.logisticAging);
      offers.push({
        cjVariantId: v.vid,
        cjSku: v.variantSku,
        name: variantLabel(v, i),
        supplierCostUsd,
        shippingCostUsd,
        stock: qty,
        logisticName: freight.logisticName!,
        deliveryMinDays: aging.min,
        deliveryMaxDays: aging.max,
        imageUrl: v.variantImage || null,
        priced: priceVariant(supplierCostUsd, shippingCostUsd, usdToGbp),
      });
    }
    if (offers.length > 0) {
      offers.sort((a, b) => a.priced.pricePence - b.priced.pricePence);
      return { warehouseCountry: country, variants: offers };
    }
  }
  return null;
}

// ── specs from CJ structured data (facts only, no supplier prose) ───────────

function parseJsonList(s: string | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [String(v)];
  } catch {
    return [s];
  }
}

export function buildSpecs(detail: CjProductDetail, offer: ProductOffer) {
  const specs: { label: string; value: string }[] = [];
  const materials = (detail.materialNameEnSet?.length ? detail.materialNameEnSet : parseJsonList(detail.materialNameEn))
    .map((m) => m.trim())
    .filter((m) => m && !HAS_CJK.test(m));
  if (materials.length) specs.push({ label: "Material", value: [...new Set(materials)].join(", ") });

  const first = detail.variants?.find((v) => v.vid === offer.variants[0]?.cjVariantId);
  const [l, w, h] = [first?.variantLength, first?.variantWidth, first?.variantHeight].map(num);
  if (l > 0 && w > 0 && h > 0) {
    const cm = (mm: number) => (mm / 10).toFixed(1).replace(/\.0$/, "");
    specs.push({ label: "Package size (approx.)", value: `${cm(l)} × ${cm(w)} × ${cm(h)} cm` });
  }
  const weight = num(first?.variantWeight) || num(detail.productWeight);
  if (weight > 0) specs.push({ label: "Weight with packaging (approx.)", value: `${Math.round(weight)} g` });

  if (offer.variants.length > 1) {
    specs.push({ label: "Options", value: offer.variants.map((v) => v.name).join(", ") });
  }
  specs.push({ label: "Ships from", value: warehouseLabels[offer.warehouseCountry] ?? offer.warehouseCountry });
  if (detail.productSku) specs.push({ label: "Supplier reference", value: detail.productSku });
  return specs;
}

export function collectImages(detail: CjProductDetail, offer: ProductOffer): string[] {
  const urls = [
    detail.bigImage,
    ...(detail.productImageSet ?? parseJsonList(detail.productImage)),
    ...offer.variants.map((v) => v.imageUrl),
  ].filter((u): u is string => !!u && /^https?:\/\//.test(u));
  return [...new Set(urls)].slice(0, 12);
}

// ── saving ──────────────────────────────────────────────────────────────────

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveProduct(args: {
  content: ProductContent;
  detail: CjProductDetail;
  offer: ProductOffer;
  videos: { cjVideoId?: string; url: string }[];
}) {
  const { content, detail, offer, videos } = args;
  const main = offer.variants[0];
  const images = collectImages(detail, offer);
  const productData = {
    cjProductId: detail.pid,
    cjSku: detail.productSku ?? null,
    cjName: detail.productNameEn ?? null,
    title: content.title,
    summary: content.summary,
    description: content.description,
    bullets: content.bullets.join("\n"),
    specs: JSON.stringify(buildSpecs(detail, offer)),
    category: content.category,
    pricePence: main.priced.pricePence,
    supplierCostPence: main.priced.supplierCostPence,
    shippingCostPence: main.priced.shippingCostPence,
    estProfitPence: main.priced.estProfitPence,
    isAddOn: main.priced.isAddOn,
    warehouseCountry: offer.warehouseCountry,
    logisticName: main.logisticName,
    deliveryMinDays: main.deliveryMinDays,
    deliveryMaxDays: main.deliveryMaxDays,
    inStock: true,
    isDemo: false,
    lastSyncedAt: new Date(),
  };

  return db.$transaction(async (tx) => {
    // A different CJ product may already hold this pid under another content key.
    await tx.product.deleteMany({ where: { cjProductId: detail.pid, NOT: { contentKey: content.key } } });
    const product = await tx.product.upsert({
      where: { contentKey: content.key },
      create: { ...productData, contentKey: content.key, slug: slugify(content.title) },
      update: productData,
    });
    // Upsert by CJ variant id so our variant ids (used in baskets) stay stable.
    const keep = offer.variants.map((v) => v.cjVariantId);
    await tx.variant.updateMany({
      where: { productId: product.id, cjVariantId: { notIn: keep } },
      data: { active: false, stock: 0 },
    });
    for (const [i, v] of offer.variants.entries()) {
      const row = variantRow(product.id, offer, v, i);
      await tx.variant.upsert({ where: { cjVariantId: v.cjVariantId }, create: row, update: row });
    }
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productImage.createMany({ data: images.map((url, position) => ({ productId: product.id, url, position })) });
    await tx.productVideo.deleteMany({ where: { productId: product.id } });
    await tx.productVideo.createMany({
      data: videos.map((v, position) => ({ productId: product.id, cjVideoId: v.cjVideoId ?? null, url: v.url, position })),
    });
    return product;
  });
}

function variantRow(productId: string, offer: ProductOffer, v: VariantOffer, position: number) {
  return {
    productId,
    cjVariantId: v.cjVariantId,
    cjSku: v.cjSku ?? null,
    name: v.name,
    supplierCostUsd: v.supplierCostUsd,
    shippingCostUsd: v.shippingCostUsd,
    supplierCostPence: v.priced.supplierCostPence,
    shippingCostPence: v.priced.shippingCostPence,
    pricePence: v.priced.pricePence,
    estProfitPence: v.priced.estProfitPence,
    warehouseCountry: offer.warehouseCountry,
    logisticName: v.logisticName,
    deliveryMinDays: v.deliveryMinDays,
    deliveryMaxDays: v.deliveryMaxDays,
    stock: v.stock,
    imageUrl: v.imageUrl,
    active: true,
    position,
  };
}

// ── CJ-backed helpers ───────────────────────────────────────────────────────

export const cjQuote: QuoteFn = (from, vid) => cj.freightCalculate(from, "GB", [{ vid, quantity: 1 }]);

export async function fetchVideos(pid: string) {
  try {
    const videos = await cj.getProductVideos(pid);
    return videos
      .filter((v) => v.videoUrl && (!v.videoState || v.videoState === "ON_STATE"))
      .map((v) => ({ cjVideoId: v.videoId ?? v.id, url: v.videoUrl! }))
      .slice(0, 3);
  } catch (err) {
    console.warn(`  could not fetch videos for ${pid}: ${(err as Error).message}`);
    return [];
  }
}

export async function fetchOffer(pid: string, diag?: (s: string) => void) {
  const detail = await cj.getProductDetail(pid);
  let inventory: CjInventoryByPid | null = null;
  try {
    inventory = await cj.getInventoryByPid(pid);
  } catch (err) {
    console.warn(`  inventory lookup failed for ${pid}: ${(err as Error).message}`);
    diag?.(`    inventory lookup failed: ${(err as Error).message}`);
  }
  const offer = await buildOffer(detail, inventory, cjQuote, undefined, diag);
  return { detail, offer };
}

/** Search CJ for the best product for one content entry. */
export async function findBestMatch(content: ProductContent, log: (s: string) => void = console.log) {
  if (content.cjProductId) {
    const { detail, offer } = await fetchOffer(content.cjProductId);
    return offer ? { detail, offer } : null;
  }

  const seen = new Map<string, { p: CjListProduct; score: number }>();
  for (const country of [...store.warehousePreference.filter((c) => c !== "CN"), undefined]) {
    for (const term of content.searchTerms) {
      let results: CjListProduct[] = [];
      try {
        results = await cj.searchProducts({ keyWord: term, countryCode: country, size: 30 });
      } catch (err) {
        log(`  search "${term}" (${country ?? "any"}) failed: ${(err as Error).message}`);
        continue;
      }
      for (const p of results) {
        if (!p.id || !matchesContent(p.nameEn ?? "", content)) continue;
        const score = scoreCandidate(p, content, country);
        const prev = seen.get(p.id);
        if (!prev || prev.score < score) seen.set(p.id, { p, score });
      }
    }
    // Good UK/EU matches found — no need to fall back further.
    if ([...seen.values()].filter((c) => c.score >= 60).length >= 3) break;
  }

  const ranked = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 4);
  log(`  ${seen.size} matching listings; checking top ${ranked.length}`);
  for (const { p, score } of ranked) {
    log(`  → ${p.nameEn} (score ${score.toFixed(1)})`);
    try {
      const { detail, offer } = await fetchOffer(p.id, log);
      if (offer) return { detail, offer };
      log(`    no in-stock variant with UK shipping; trying next`);
    } catch (err) {
      log(`    failed: ${(err as Error).message}`);
    }
  }
  return null;
}

/**
 * Re-sync prices and stock for every non-demo product from CJ.
 * Products with no in-stock variant are hidden (inStock=false) and come
 * back automatically when stock returns.
 */
export async function syncCatalog(log: (s: string) => void = console.log) {
  const products = await db.product.findMany({ where: { isDemo: false }, include: { variants: true } });
  const result = { updated: 0, hidden: 0, failed: 0, priceChanges: [] as string[] };
  for (const product of products) {
    try {
      const { detail, offer } = await fetchOffer(product.cjProductId);
      if (!offer || detail.status === "0") {
        await db.product.update({ where: { id: product.id }, data: { inStock: false, lastSyncedAt: new Date() } });
        await db.variant.updateMany({ where: { productId: product.id }, data: { active: false, stock: 0 } });
        result.hidden++;
        log(`  ${product.title}: out of stock — hidden`);
        continue;
      }
      const main = offer.variants[0];
      if (main.priced.pricePence !== product.pricePence) {
        result.priceChanges.push(`${product.title}: ${product.pricePence} → ${main.priced.pricePence}`);
      }
      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: {
            pricePence: main.priced.pricePence,
            supplierCostPence: main.priced.supplierCostPence,
            shippingCostPence: main.priced.shippingCostPence,
            estProfitPence: main.priced.estProfitPence,
            isAddOn: main.priced.isAddOn,
            warehouseCountry: offer.warehouseCountry,
            logisticName: main.logisticName,
            deliveryMinDays: main.deliveryMinDays,
            deliveryMaxDays: main.deliveryMaxDays,
            specs: JSON.stringify(buildSpecs(detail, offer)),
            inStock: true,
            lastSyncedAt: new Date(),
          },
        });
        const keep = offer.variants.map((v) => v.cjVariantId);
        await tx.variant.updateMany({
          where: { productId: product.id, cjVariantId: { notIn: keep } },
          data: { active: false, stock: 0 },
        });
        for (const [i, v] of offer.variants.entries()) {
          const row = variantRow(product.id, offer, v, i);
          await tx.variant.upsert({ where: { cjVariantId: v.cjVariantId }, create: row, update: row });
        }
      });
      result.updated++;
      log(`  ${product.title}: ${offer.variants.length} variant(s) in stock from ${offer.warehouseCountry}`);
    } catch (err) {
      result.failed++;
      log(`  ${product.title}: sync failed — ${(err as Error).message}`);
    }
  }
  return result;
}
