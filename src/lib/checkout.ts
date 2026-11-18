/**
 * Server-side basket pricing. The browser only sends variant ids and
 * quantities; every price, discount and delivery charge is worked out here
 * from the database.
 */
import { z } from "zod";
import { MARKETS, store, type MarketCode } from "@/config/store";
import { db } from "@/lib/db";
import { isLive } from "@/lib/env";
import { calculateBasket, type BasketTotals } from "@/lib/basket";

export const basketInputSchema = z.object({
  market: z.enum(MARKETS as [MarketCode, ...MarketCode[]]).default("GB"),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(store.basket.maxQuantityPerLine),
      }),
    )
    .max(50),
});

export type BasketInput = z.infer<typeof basketInputSchema>;

export interface PricedLine {
  variantId: string;
  cjVariantId: string;
  productId: string;
  slug: string;
  title: string;
  variantName: string;
  showVariantName: boolean;
  image: string | null;
  quantity: number;
  unitPricePence: number;
  unitCostPence: number;
  lineTotalPence: number;
  warehouseCountry: string;
  logisticName: string | null;
  isDemo: boolean;
}

export interface PricedBasket {
  market: MarketCode;
  currency: string;
  lines: PricedLine[];
  /** Variant ids that are no longer available and were dropped. */
  removed: string[];
  totals: BasketTotals;
}

export async function priceBasket(input: BasketInput): Promise<PricedBasket> {
  const marketCode = input.market ?? "GB";
  const market = store.markets[marketCode];
  // Merge duplicate lines.
  const merged = new Map<string, number>();
  for (const l of input.lines) {
    merged.set(l.variantId, Math.min((merged.get(l.variantId) ?? 0) + l.quantity, store.basket.maxQuantityPerLine));
  }
  const ids = [...merged.keys()];
  const variants = await db.variant.findMany({
    where: {
      id: { in: ids },
      active: true,
      product: { published: true, inStock: true, ...(isLive() ? { isDemo: false } : {}) },
    },
    include: {
      markets: { where: { market: marketCode, available: true } },
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          _count: { select: { variants: { where: { active: true } } } },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: PricedLine[] = [];
  const removed: string[] = [];
  for (const [variantId, quantity] of merged) {
    const v = byId.get(variantId);
    // Price/shipping for this market; UK falls back to the variant's own fields
    // for products imported before markets existed.
    const vm =
      v?.markets[0] ??
      (v && marketCode === "GB" && (await db.variantMarket.count({ where: { variantId: v.id } })) === 0
        ? {
            priceMinor: v.pricePence,
            supplierCostMinor: v.supplierCostPence,
            shippingCostMinor: v.shippingCostPence,
            warehouseCountry: v.warehouseCountry,
            logisticName: v.logisticName,
          }
        : null);
    if (!v || !vm) {
      removed.push(variantId);
      continue;
    }
    lines.push({
      variantId,
      cjVariantId: v.cjVariantId,
      productId: v.productId,
      slug: v.product.slug,
      title: v.product.title,
      variantName: v.name,
      showVariantName: v.product._count.variants > 1,
      image: v.imageUrl ?? v.product.images[0]?.url ?? null,
      quantity,
      unitPricePence: vm.priceMinor,
      unitCostPence: vm.supplierCostMinor + vm.shippingCostMinor,
      lineTotalPence: vm.priceMinor * quantity,
      warehouseCountry: vm.warehouseCountry,
      logisticName: vm.logisticName,
      isDemo: v.product.isDemo,
    });
  }

  return { market: marketCode, currency: market.currency, lines, removed, totals: calculateBasket(lines, market) };
}
