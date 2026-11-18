/**
 * Cached catalogue reads for the storefront. Results are cached (Next.js
 * Cache Components) and refreshed hourly, or immediately when a CJ re-sync
 * calls revalidateTag("products").
 *
 * Every product carries its price/delivery for EACH market; the page shows
 * the visitor's market with CSS (see MarketValue), so pages stay static.
 */
import { cacheLife, cacheTag } from "next/cache";
import { MARKETS, store, type MarketCode } from "@/config/store";
import { db } from "@/lib/db";
import { isLive } from "@/lib/env";

export interface MarketPrice {
  priceMinor: number;
  hasVariantPrices: boolean;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  warehouseCountry: string;
  defaultVariantId: string | null;
}
export type MarketPrices = Partial<Record<MarketCode, MarketPrice>>;

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  /** UK price (kept for older callers); use `markets` for display */
  pricePence: number;
  hasVariantPrices: boolean;
  image: string | null;
  isAddOn: boolean;
  isTrending: boolean;
  isDemo: boolean;
  warehouseCountry: string;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  defaultVariantId: string | null;
  /** Price and delivery per market; a missing market means "not available there" */
  markets: MarketPrices;
}

export interface VariantMarketData {
  priceMinor: number;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  warehouseCountry: string;
  logisticName: string | null;
}

export interface ProductPageData extends ProductCardData {
  description: string;
  bullets: string[];
  specs: { label: string; value: string }[];
  logisticName: string | null;
  images: string[];
  videos: { id: string }[];
  variants: {
    id: string;
    name: string;
    pricePence: number;
    imageUrl: string | null;
    deliveryMinDays: number | null;
    deliveryMaxDays: number | null;
    warehouseCountry: string;
    markets: Partial<Record<MarketCode, VariantMarketData>>;
  }[];
}

function visibleWhere() {
  return {
    published: true,
    inStock: true,
    variants: { some: { active: true } },
    // Demo products never show on a live store.
    ...(isLive() ? { isDemo: false } : {}),
  };
}

const variantInclude = {
  where: { active: true },
  orderBy: { pricePence: "asc" as const },
  include: { markets: { where: { available: true } } },
};

const cardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  variants: variantInclude,
};

type CardRow = Awaited<ReturnType<typeof fetchCards>>[number];
type VariantRow = CardRow["variants"][number];

function fetchCards(where: object) {
  return db.product.findMany({
    where: { ...visibleWhere(), ...where },
    include: cardInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

/** A variant's data in one market; UK falls back to the variant's own fields. */
function variantInMarket(v: VariantRow, code: MarketCode): VariantMarketData | null {
  const row = v.markets.find((m) => m.market === code);
  if (row) {
    return {
      priceMinor: row.priceMinor,
      deliveryMinDays: row.deliveryMinDays,
      deliveryMaxDays: row.deliveryMaxDays,
      warehouseCountry: row.warehouseCountry,
      logisticName: row.logisticName,
    };
  }
  if (code === "GB" && v.markets.length === 0) {
    return {
      priceMinor: v.pricePence,
      deliveryMinDays: v.deliveryMinDays,
      deliveryMaxDays: v.deliveryMaxDays,
      warehouseCountry: v.warehouseCountry,
      logisticName: v.logisticName,
    };
  }
  return null;
}

function marketPrices(variants: VariantRow[]): MarketPrices {
  const out: MarketPrices = {};
  for (const code of MARKETS) {
    const avail = variants
      .map((v) => ({ v, m: variantInMarket(v, code) }))
      .filter((x): x is { v: VariantRow; m: VariantMarketData } => !!x.m)
      .sort((a, b) => a.m.priceMinor - b.m.priceMinor);
    if (avail.length === 0) continue;
    const first = avail[0];
    out[code] = {
      priceMinor: first.m.priceMinor,
      hasVariantPrices: new Set(avail.map((x) => x.m.priceMinor)).size > 1,
      deliveryMinDays: first.m.deliveryMinDays,
      deliveryMaxDays: first.m.deliveryMaxDays,
      warehouseCountry: first.m.warehouseCountry,
      defaultVariantId: first.v.id,
    };
  }
  return out;
}

function toCard(p: CardRow): ProductCardData {
  const prices = new Set(p.variants.map((v) => v.pricePence));
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    category: p.category,
    pricePence: p.variants[0]?.pricePence ?? p.pricePence,
    hasVariantPrices: prices.size > 1,
    image: p.images[0]?.url ?? null,
    isAddOn: p.isAddOn,
    isTrending: p.isTrending,
    isDemo: p.isDemo,
    warehouseCountry: p.warehouseCountry,
    deliveryMinDays: p.deliveryMinDays,
    deliveryMaxDays: p.deliveryMaxDays,
    defaultVariantId: p.variants[0]?.id ?? null,
    markets: marketPrices(p.variants),
  };
}

/** Main catalogue. Includes add-on items too when `store.showAddOnsInMainGrid` is on. */
export async function getMainProducts(category?: string): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const rows = await fetchCards({
    ...(store.showAddOnsInMainGrid ? {} : { isAddOn: false }),
    ...(category ? { category } : {}),
  });
  // Trending first, then the rest in the order they were added.
  return rows.map(toCard).sort((a, b) => Number(b.isTrending) - Number(a.isTrending));
}

/**
 * Home-page strip: products marked trending (from CJ's trending list or by
 * you). Falls back to the newest products, labelled "New in" by the page.
 */
export async function getTrendingProducts(): Promise<{ trending: boolean; products: ProductCardData[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const trending = await fetchCards({ isTrending: true });
  if (trending.length > 0) return { trending: true, products: trending.slice(0, 8).map(toCard) };
  const newest = await db.product.findMany({
    where: visibleWhere(),
    include: cardInclude,
    orderBy: [{ createdAt: "desc" }],
    take: 4,
  });
  return { trending: false, products: newest.map(toCard) };
}

/** Add-on-only products for "Complete your order". */
export async function getAddOnProducts(): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const rows = await fetchCards({ isAddOn: true });
  return rows.map(toCard);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const rows = await db.product.findMany({ where: visibleWhere(), select: { slug: true } });
  return rows.map((r) => r.slug);
}

export async function hasDemoProducts(): Promise<boolean> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return (await db.product.count({ where: { ...visibleWhere(), isDemo: true } })) > 0;
}

export async function getProductBySlug(slug: string): Promise<ProductPageData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const p = await db.product.findFirst({
    where: { ...visibleWhere(), slug },
    include: {
      images: { orderBy: { position: "asc" } },
      videos: { orderBy: { position: "asc" } },
      variants: { ...variantInclude, orderBy: [{ position: "asc" }] },
    },
  });
  if (!p) return null;
  const byPrice = [...p.variants].sort((a, b) => a.pricePence - b.pricePence);
  let specs: { label: string; value: string }[] = [];
  try {
    specs = JSON.parse(p.specs);
  } catch {}
  return {
    ...toCard({ ...p, images: p.images.slice(0, 1), variants: byPrice }),
    description: p.description,
    bullets: p.bullets.split("\n").filter(Boolean),
    specs,
    logisticName: p.logisticName,
    images: p.images.map((i) => i.url),
    videos: p.videos.map((v) => ({ id: v.id })),
    variants: p.variants.map((v) => {
      const markets: Partial<Record<MarketCode, VariantMarketData>> = {};
      for (const code of MARKETS) {
        const m = variantInMarket(v, code);
        if (m) markets[code] = m;
      }
      return {
        id: v.id,
        name: v.name,
        pricePence: v.pricePence,
        imageUrl: v.imageUrl,
        deliveryMinDays: v.deliveryMinDays,
        deliveryMaxDays: v.deliveryMaxDays,
        warehouseCountry: v.warehouseCountry,
        markets,
      };
    }),
  };
}
