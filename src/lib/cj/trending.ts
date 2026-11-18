/**
 * Trending importer: finds products on CJ's trending lists across every store
 * category, writes original copy for each with AI (which also screens out
 * restricted products), prices them for every market and publishes them —
 * marked HOT. Runs in batches so each run fits Vercel's time limit.
 */
import type { CategorySlug } from "@/config/store";
import { db } from "@/lib/db";
import { aiConfigured, writeProductCopy } from "@/lib/ai/copywriter";
import * as cj from "./client";
import type { CjListProduct } from "./types";
import { buildSpecs, fetchOffer, fetchVideos, num, saveProduct } from "./catalog";

/** What we search CJ's trending lists for, per category. Edit freely. */
export const TRENDING_SEARCHES: { keyword: string; category: CategorySlug }[] = [
  { keyword: "kitchen gadgets", category: "kitchen" },
  { keyword: "kitchen tools", category: "kitchen" },
  { keyword: "coffee accessories", category: "kitchen" },
  { keyword: "food storage", category: "kitchen" },
  { keyword: "home organizer", category: "home" },
  { keyword: "cleaning tools", category: "home" },
  { keyword: "bathroom accessories", category: "home" },
  { keyword: "desk organizer", category: "home" },
  { keyword: "fitness equipment", category: "fitness" },
  { keyword: "water bottle", category: "fitness" },
  { keyword: "travel accessories", category: "fitness" },
  { keyword: "camping gear", category: "fitness" },
  { keyword: "dog accessories", category: "pets" },
  { keyword: "cat supplies", category: "pets" },
  { keyword: "pet grooming", category: "pets" },
  { keyword: "car accessories", category: "car" },
  { keyword: "car organizer", category: "car" },
  { keyword: "car cleaning", category: "car" },
];

/**
 * Quick name-based pre-filter (the AI screen is the final check). Blades,
 * medical, cosmetics, children's products, clothing, mains electricals,
 * age-restricted items.
 */
const BLOCKED = [
  "knife", "knives", "blade", "razor", "cleaver", "dagger", "sword", "axe", "machete", "scimitar", "boning", "butcher",
  "weapon", "self defense", "self-defense", "pepper spray", "stun", "taser", "slingshot", "crossbow",
  "medical", "thermometer", "posture", "massager", "brace", "orthopedic", "supplement", "vitamin", "pill", "medicine",
  "cosmetic", "makeup", "lipstick", "skincare", "serum", "cream", "lotion", "shampoo", "hair dye", "nail polish", "tattoo",
  "toy", "kids", "children", "child", "baby", "infant", "toddler", "teether",
  "shirt", "dress", "pants", "jacket", "shoe", "sneaker", "sock", "underwear", "bra", "bikini", "jewelry", "jewellery",
  "necklace", "earring", "ring set", "watch",
  "uk plug", "eu plug", "us plug", "au plug", "220v", "110v", "240v", "power bank", "lithium battery",
  "vape", "e-cigarette", "cigarette", "hookah", "lighter", "butane", "adult", "sexy", "lingerie", "cbd", "alcohol",
];

export function trendingAllowed(name: string) {
  const n = ` ${name.toLowerCase()} `;
  return !BLOCKED.some((w) => n.includes(w));
}

const MAX_COST_USD = 60;

export async function importTrendingProducts(opts: { limit?: number; timeBudgetMs?: number; log?: (s: string) => void } = {}) {
  const limit = opts.limit ?? 12;
  const budget = opts.timeBudgetMs ?? 230_000;
  const log = opts.log ?? console.log;
  const started = Date.now();
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY is not set, so product descriptions can't be written.");

  // Skip anything we already sell or have already screened.
  const known = new Set([
    ...(await db.product.findMany({ select: { cjProductId: true } })).map((r) => r.cjProductId),
    ...(await db.sourcingCandidate.findMany({ where: { status: { in: ["REJECTED", "PUBLISHED"] } }, select: { cjProductId: true } })).map(
      (r) => r.cjProductId,
    ),
  ]);

  // Rotate through the searches so successive runs cover every category.
  const runNo = await db.syncLog.count({ where: { kind: "admin-trending" } });
  const searches = [...TRENDING_SEARCHES.slice(runNo % TRENDING_SEARCHES.length), ...TRENDING_SEARCHES.slice(0, runNo % TRENDING_SEARCHES.length)];

  const found = new Map<string, { p: CjListProduct; score: number; category: CategorySlug }>();
  for (const { keyword, category } of searches) {
    if (Date.now() - started > budget * 0.3) break; // keep most of the time for importing
    for (const country of ["GB", undefined] as const) {
      try {
        const results = await cj.searchProducts({ keyWord: keyword, countryCode: country, productFlag: 0, size: 20 });
        for (const p of results) {
          if (!p.id || known.has(p.id) || !trendingAllowed(p.nameEn ?? "") || num(p.sellPrice) > MAX_COST_USD) continue;
          const score = (country === "GB" ? 30 : 0) + Math.log10(num(p.listedNum) + 1) * 10 + (num(p.isVideo) ? 5 : 0);
          const prev = found.get(p.id);
          if (!prev || prev.score < score) found.set(p.id, { p, score, category });
        }
      } catch (err) {
        log(`  search "${keyword}" (${country ?? "any"}) failed: ${(err as Error).message}`);
      }
    }
  }
  // Interleave categories so a batch isn't all one kind of product.
  const byCat = new Map<string, { p: CjListProduct; score: number; category: CategorySlug }[]>();
  for (const f of [...found.values()].sort((a, b) => b.score - a.score)) {
    byCat.set(f.category, [...(byCat.get(f.category) ?? []), f]);
  }
  const queue: { p: CjListProduct; category: CategorySlug }[] = [];
  for (let i = 0; queue.length < found.size; i++) {
    for (const list of byCat.values()) if (list[i]) queue.push(list[i]);
    if (i > 200) break;
  }
  log(`${found.size} trending candidates found; importing up to ${limit}…`);

  const result = { published: 0, rejected: 0, skipped: 0, failed: 0, titles: [] as string[] };
  for (const { p, category } of queue) {
    if (result.published >= limit || Date.now() - started > budget) break;
    try {
      const { detail, offer, offers } = await fetchOffer(p.id);
      if (!offer) {
        result.skipped++;
        log(`  skip ${p.nameEn}: no stock that ships to the UK`);
        continue;
      }
      const copy = await writeProductCopy({
        cjName: detail.productNameEn ?? p.nameEn ?? "",
        cjCategory: p.threeCategoryName,
        supplierDescription: detail.description,
        materials: detail.materialNameEnSet,
        options: offer.variants.map((v) => v.name),
        specs: buildSpecs(detail, offer),
      });
      const candidateBase = {
        cjName: detail.productNameEn ?? p.nameEn ?? "",
        source: "trending",
        matchedKeyword: category,
        listedNum: Math.round(num(p.listedNum)),
      };
      if (!copy || !copy.sellable) {
        result.rejected++;
        const reason = copy?.reason ?? "AI declined to write copy";
        await db.sourcingCandidate.upsert({
          where: { cjProductId: p.id },
          create: { cjProductId: p.id, ...candidateBase, status: "REJECTED", notes: reason },
          update: { status: "REJECTED", notes: reason },
        });
        log(`  ✗ ${p.nameEn}: ${reason}`);
        continue;
      }
      const videos = await fetchVideos(p.id);
      const product = await saveProduct({
        content: {
          key: `cj-${p.id}`,
          category: copy.category as CategorySlug,
          searchTerms: [],
          match: { all: [] },
          title: copy.title,
          summary: copy.summary,
          description: copy.description,
          bullets: copy.bullets,
        },
        detail,
        offer,
        offers,
        videos,
      });
      await db.product.update({ where: { id: product.id }, data: { isTrending: true } });
      await db.sourcingCandidate.upsert({
        where: { cjProductId: p.id },
        create: { cjProductId: p.id, ...candidateBase, status: "PUBLISHED", productId: product.id },
        update: { status: "PUBLISHED", productId: product.id },
      });
      result.published++;
      result.titles.push(product.title);
      log(`  ✓ ${product.title} (${copy.category}) — from "${p.nameEn}", ${videos.length} video(s)`);
    } catch (err) {
      result.failed++;
      log(`  ! ${p.nameEn}: ${(err as Error).message}`);
    }
  }
  log(`Done in ${Math.round((Date.now() - started) / 1000)}s.`);
  return { ...result, candidates: found.size };
}

