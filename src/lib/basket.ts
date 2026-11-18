import { store, type MarketConfig } from "@/config/store";
import { taxIncludedMinor, toPence } from "@/lib/pricing";

/**
 * Basket maths (pure, unit-tested). Used both to show the basket and to
 * build the Stripe Checkout session, so the two always agree.
 *
 * Rules:
 *  - 10% off the item subtotal when the basket has 3+ items (by quantity).
 *  - Free delivery when the discounted item subtotal is £35 or more,
 *    otherwise £3.99.
 */

export interface BasketLineInput {
  unitPricePence: number;
  quantity: number;
}

export interface BasketTotals {
  itemCount: number;
  subtotalPence: number;
  discountPence: number;
  multiBuyApplied: boolean;
  itemsAfterDiscountPence: number;
  deliveryPence: number;
  freeDelivery: boolean;
  totalPence: number;
  vatPence: number;
  /** How many more items would unlock the multi-buy discount (0 if applied). */
  itemsToMultiBuy: number;
  /** How much more (pence) would unlock free delivery (0 if free). */
  spendToFreeDeliveryPence: number;
}

const b = store.basket;

/** Basket totals in the market's currency (minor units). Defaults to the UK market. */
export function calculateBasket(lines: BasketLineInput[], market: MarketConfig = store.markets.GB): BasketTotals {
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalPence = lines.reduce((s, l) => s + l.unitPricePence * l.quantity, 0);

  const multiBuyApplied = itemCount >= b.multiBuyMinItems;
  const discountPence = multiBuyApplied ? Math.round((subtotalPence * b.multiBuyPercentOff) / 100) : 0;
  const itemsAfterDiscountPence = subtotalPence - discountPence;

  const threshold = toPence(market.freeDeliveryThreshold);
  const freeDelivery = itemCount > 0 && itemsAfterDiscountPence >= threshold;
  const deliveryPence = itemCount === 0 || freeDelivery ? 0 : toPence(market.deliveryFee);

  const totalPence = itemsAfterDiscountPence + deliveryPence;

  return {
    itemCount,
    subtotalPence,
    discountPence,
    multiBuyApplied,
    itemsAfterDiscountPence,
    deliveryPence,
    freeDelivery,
    totalPence,
    vatPence: taxIncludedMinor(totalPence, market),
    itemsToMultiBuy: multiBuyApplied ? 0 : Math.max(0, b.multiBuyMinItems - itemCount),
    spendToFreeDeliveryPence: freeDelivery ? 0 : Math.max(0, threshold - itemsAfterDiscountPence),
  };
}
