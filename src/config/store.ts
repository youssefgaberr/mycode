/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  STORE CONFIGURATION — the one file to edit to rebrand or re-tune the shop.
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Change `name` to rename the store everywhere (header, emails, policies…).
 *  - Replace every value in `company` that is wrapped in [SQUARE BRACKETS]
 *    before you go live. Policy pages show these placeholders until you do.
 *  - Pricing and basket rules are below. All money here is in POUNDS (GBP);
 *    the code converts to pence internally.
 *  - Secrets (API keys, passwords) do NOT belong here — they live in .env.local.
 */

export const store = {
  name: "Brightpan",
  tagline: "Clever little kitchen helpers, delivered across the UK",
  description:
    "Brightpan sells practical home and kitchen gadgets that make everyday cooking a little easier.",

  /** Legal/contact details shown on policy pages, footer and emails. */
  company: {
    legalName: "[YOUR COMPANY NAME LTD]",
    companyNumber: "[COMPANY NUMBER]",
    vatNumber: "[VAT NUMBER]",
    address: "[YOUR REGISTERED ADDRESS, TOWN, POSTCODE]",
    email: "[hello@your-domain.co.uk]",
    /** Where customers send returns. Often different from the registered address. */
    returnsAddress: "[YOUR RETURNS ADDRESS, TOWN, POSTCODE]",
  },

  locale: "en-GB",
  currency: "GBP",
  /** Countries we deliver to (ISO codes). Stripe Checkout only accepts these. */
  shippingCountries: ["GB"] as const,

  pricing: {
    /** Shop price = (supplier cost + UK shipping) × markup, rounded to end in .99 */
    markup: 2.5,
    /** Prices never go below this (pounds). */
    minimumPrice: 12.99,
    /**
     * CJdropshipping quotes everything in US dollars. Update this rate now and
     * then (e.g. monthly) and re-sync from /admin so prices follow the market.
     */
    usdToGbp: 0.79,
    /** Shop prices INCLUDE UK VAT at this rate. */
    vatRate: 0.2,
    /** Estimated Stripe fee for UK cards: percentage + fixed (pounds). */
    stripeFeePercent: 0.015,
    stripeFeeFixed: 0.2,
    /** Estimated advertising cost to win one order (pounds). */
    adCostPerOrder: 8,
    /**
     * Products whose estimated profit (after VAT, supplier cost, shipping,
     * Stripe fee and the ad cost above) is below this become "add-on only":
     * they appear in "Complete your order" instead of the main catalogue.
     */
    addOnProfitThreshold: 3,
  },

  basket: {
    /** Multi-buy: this many items or more… */
    multiBuyMinItems: 3,
    /** …get this percentage off the item subtotal. */
    multiBuyPercentOff: 10,
    /** Delivery is free when the (discounted) item subtotal reaches this (pounds). */
    freeDeliveryThreshold: 35,
    /** Otherwise delivery costs this (pounds). */
    deliveryFee: 3.99,
    /** Max quantity of one item per order. */
    maxQuantityPerLine: 10,
  },

  /** Warehouses we prefer, best first. CN is the fallback. */
  warehousePreference: ["GB", "DE", "CN"] as const,
  /** Minimum stock in a warehouse before we'll sell from it. */
  minimumWarehouseStock: 5,

  categories: [
    { slug: "kitchen", name: "Kitchen & dining" },
    { slug: "home", name: "Home & organisation" },
    { slug: "fitness", name: "Fitness, outdoor & travel" },
    { slug: "pets", name: "Pets" },
    { slug: "car", name: "Car accessories" },
  ],

  /**
   * Show "add-on only" products in the main catalogue too (they still also
   * appear in "Complete your order"). Set false to hide low-margin items
   * from the main grid.
   */
  showAddOnsInMainGrid: true,

  /**
   * Markets we sell to. Customers switch with the £/$ button (or are
   * detected by location). Each market has its own currency, shipping
   * quotes from CJ, delivery charges and tax rules. Money in POUNDS/DOLLARS.
   *
   * UK: prices include 20% VAT.
   * US: prices exclude sales tax (shown at checkout as $0 unless you set up
   *     Stripe Tax). Parcels from China pay US import duty — `importDutyRate`
   *     adds an allowance for it to the cost basis. Check current tariffs.
   */
  markets: {
    GB: {
      code: "GB",
      label: "United Kingdom",
      flag: "🇬🇧",
      currency: "GBP",
      locale: "en-GB",
      shipTo: ["GB"],
      /** USD (CJ's currency) → this market's currency */
      fxFromUsd: 0.79,
      vatRate: 0.2,
      pricesIncludeTax: true,
      importDutyRate: 0,
      minimumPrice: 12.99,
      deliveryFee: 3.99,
      freeDeliveryThreshold: 35,
      stripeFeePercent: 0.015,
      stripeFeeFixed: 0.2,
      adCostPerOrder: 8,
      addOnProfitThreshold: 3,
      /** Warehouses to ship from, best first */
      warehouses: ["GB", "DE", "CN"],
    },
    US: {
      code: "US",
      label: "United States",
      flag: "🇺🇸",
      currency: "USD",
      locale: "en-US",
      shipTo: ["US"],
      fxFromUsd: 1,
      vatRate: 0,
      pricesIncludeTax: false,
      importDutyRate: 0.3,
      minimumPrice: 14.99,
      deliveryFee: 4.99,
      freeDeliveryThreshold: 45,
      stripeFeePercent: 0.029,
      stripeFeeFixed: 0.3,
      adCostPerOrder: 10,
      addOnProfitThreshold: 4,
      warehouses: ["US", "CN"],
    },
  },
} as const;

export type CategorySlug = (typeof store.categories)[number]["slug"];
export type MarketCode = keyof typeof store.markets;
export const MARKETS = Object.keys(store.markets) as MarketCode[];
export const DEFAULT_MARKET: MarketCode = "GB";
export type MarketConfig = (typeof store.markets)[MarketCode];

export function marketConfig(code: string | null | undefined): MarketConfig {
  return store.markets[(code && code in store.markets ? code : DEFAULT_MARKET) as MarketCode];
}

export function isMarket(code: unknown): code is MarketCode {
  return typeof code === "string" && code in store.markets;
}

export const warehouseLabels: Record<string, string> = {
  GB: "UK warehouse",
  DE: "EU (Germany) warehouse",
  CN: "international warehouse",
  US: "US warehouse",
};

export function categoryName(slug: string): string {
  return store.categories.find((c) => c.slug === slug)?.name ?? slug;
}
