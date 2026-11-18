/**
 * Cached catalogue reads for the storefront. Results are cached (Next.js
 * Cache Components) and refreshed hourly, or immediately when a CJ re-sync
 * calls revalidateTag("products").
 */
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { isLive } from "@/lib/env";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
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

const cardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  variants: { where: { active: true }, orderBy: { pricePence: "asc" as const } },
};

type CardRow = Awaited<ReturnType<typeof fetchCards>>[number];

function fetchCards(where: object) {
  return db.product.findMany({
    where: { ...visibleWhere(), ...where },
    include: cardInclude,
    orderBy: [{ createdAt: "asc" }],
  });
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
  };
}

/** Main catalogue (excludes add-on-only products). */
export async function getMainProducts(category?: string): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const rows = await fetchCards({ isAddOn: false, ...(category ? { category } : {}) });
  return rows.map(toCard);
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
      variants: { where: { active: true }, orderBy: [{ position: "asc" }] },
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
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      pricePence: v.pricePence,
      imageUrl: v.imageUrl,
      deliveryMinDays: v.deliveryMinDays,
      deliveryMaxDays: v.deliveryMaxDays,
      warehouseCountry: v.warehouseCountry,
    })),
  };
}
