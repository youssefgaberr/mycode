import { store, type MarketConfig } from "@/config/store";

/**
 * Pricing rules (pure functions, unit-tested in tests/pricing.test.ts).
 * All amounts are integer pence unless the name says otherwise.
 */

const p = store.pricing;

export const toPence = (pounds: number) => Math.round(pounds * 100);

/** Convert a CJ USD amount to GBP pence using the configured rate. */
export function usdToPence(usd: number, rate: number = p.usdToGbp): number {
  return Math.round(usd * rate * 100);
}

/**
 * Shop price = (supplier cost + UK shipping) × markup, rounded to end in .99,
 * never below the minimum price. ".99 rounding" means the pound amount is
 * kept and the pence set to 99 (e.g. £14.20 → £14.99, £14.00 → £14.99).
 */
export function shopPricePence(supplierCostPence: number, shippingPence: number): number {
  const raw = (supplierCostPence + shippingPence) * p.markup;
  const rounded = Math.floor(raw / 100) * 100 + 99;
  return Math.max(rounded, toPence(p.minimumPrice));
}

/** VAT contained in a VAT-inclusive amount. */
export function vatIncludedPence(grossPence: number): number {
  return grossPence - Math.round(grossPence / (1 + p.vatRate));
}

/** Estimated Stripe processing fee for a charge. */
export function estimateStripeFeePence(chargePence: number): number {
  if (chargePence <= 0) return 0;
  return Math.round(chargePence * p.stripeFeePercent) + toPence(p.stripeFeeFixed);
}

/**
 * Estimated profit if this item were bought on its own:
 * price excl. VAT − supplier cost − shipping − Stripe fee − ad cost.
 */
export function estimateUnitProfitPence(
  pricePence: number,
  supplierCostPence: number,
  shippingPence: number,
): number {
  const netOfVat = pricePence - vatIncludedPence(pricePence);
  return (
    netOfVat -
    supplierCostPence -
    shippingPence -
    estimateStripeFeePence(pricePence) -
    toPence(p.adCostPerOrder)
  );
}

export function isAddOnOnly(estProfitPence: number): boolean {
  return estProfitPence < toPence(p.addOnProfitThreshold);
}

/** Everything the catalogue needs for one variant, from CJ's USD figures. */
export function priceVariant(supplierCostUsd: number, shippingCostUsd: number, rate?: number) {
  const supplierCostPence = usdToPence(supplierCostUsd, rate);
  const shippingCostPence = usdToPence(shippingCostUsd, rate);
  const pricePence = shopPricePence(supplierCostPence, shippingCostPence);
  const estProfitPence = estimateUnitProfitPence(pricePence, supplierCostPence, shippingCostPence);
  return {
    supplierCostPence,
    shippingCostPence,
    pricePence,
    estProfitPence,
    isAddOn: isAddOnOnly(estProfitPence),
  };
}

export function formatGBP(pence: number): string {
  return new Intl.NumberFormat(store.locale, { style: "currency", currency: store.currency }).format(pence / 100);
}

/** Like formatGBP but drops ".00" for whole pounds — for marketing copy ("free delivery over £35"). */
export function formatGBPShort(pence: number): string {
  if (pence % 100 !== 0) return formatGBP(pence);
  return new Intl.NumberFormat(store.locale, {
    style: "currency",
    currency: store.currency,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

// ── Multi-market pricing ────────────────────────────────────────────────────

/**
 * Price one variant for a market from CJ's USD figures. All results are in
 * the market's currency, minor units (pence/cents).
 *
 *  landed cost = supplier cost + shipping + import-duty allowance
 *  price       = landed × markup, rounded to .99, at least the market minimum
 *  profit      = price (net of VAT where prices include it) − landed cost
 *                − payment fee − ad cost per order
 */
export function priceForMarket(supplierCostUsd: number, shippingCostUsd: number, m: MarketConfig) {
  const toMinor = (usd: number) => Math.round(usd * m.fxFromUsd * 100);
  const supplier = toMinor(supplierCostUsd);
  const duty = Math.round(supplier * m.importDutyRate);
  const shipping = toMinor(shippingCostUsd);
  const raw = (supplier + duty + shipping) * p.markup;
  const priceMinor = Math.max(Math.floor(raw / 100) * 100 + 99, toPence(m.minimumPrice));
  const tax = m.pricesIncludeTax ? priceMinor - Math.round(priceMinor / (1 + m.vatRate)) : 0;
  const fee = Math.round(priceMinor * m.stripeFeePercent) + toPence(m.stripeFeeFixed);
  const estProfitMinor = priceMinor - tax - supplier - duty - shipping - fee - toPence(m.adCostPerOrder);
  return {
    priceMinor,
    /** supplier cost plus the import-duty allowance */
    supplierCostMinor: supplier + duty,
    shippingCostMinor: shipping,
    estProfitMinor,
    isAddOn: estProfitMinor < toPence(m.addOnProfitThreshold),
  };
}

/** Tax contained in a gross amount for a market (0 where prices exclude tax). */
export function taxIncludedMinor(grossMinor: number, m: MarketConfig) {
  return m.pricesIncludeTax ? grossMinor - Math.round(grossMinor / (1 + m.vatRate)) : 0;
}

export function formatMoney(minor: number, m: Pick<MarketConfig, "currency" | "locale">): string {
  return new Intl.NumberFormat(m.locale, { style: "currency", currency: m.currency }).format(minor / 100);
}

export function formatMoneyShort(minor: number, m: Pick<MarketConfig, "currency" | "locale">): string {
  if (minor % 100 !== 0) return formatMoney(minor, m);
  return new Intl.NumberFormat(m.locale, { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(
    minor / 100,
  );
}
