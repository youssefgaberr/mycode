import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { buildOffer, matchesContent, parseAging, pickFreight, variantLabel } from "@/lib/cj/catalog";
import { contentByKey } from "@/content/products";
import { keywordRelevance } from "@/lib/cj/discover";
import type { CjProductDetail } from "@/lib/cj/types";

const liners = contentByKey("air-fryer-liners")!;
const frother = contentByKey("milk-frother")!;

describe("matchesContent", () => {
  it("accepts a relevant listing", () => {
    expect(matchesContent("Reusable Silicone Air Fryer Liner Pot Basket", liners)).toBe(true);
  });
  it("rejects paper liners and unrelated items", () => {
    expect(matchesContent("Disposable Paper Air Fryer Liner 100pcs", liners)).toBe(false);
    expect(matchesContent("Silicone Baking Mat", liners)).toBe(false);
  });
  it("rejects frother jugs", () => {
    expect(matchesContent("Electric Milk Frother Handheld Whisk", frother)).toBe(true);
    expect(matchesContent("Stainless Steel Milk Frother Pitcher Jug", frother)).toBe(false);
  });
});

describe("freight helpers", () => {
  it("parses CJ delivery ranges", () => {
    expect(parseAging("2-5")).toEqual({ min: 2, max: 5 });
    expect(parseAging("7")).toEqual({ min: 7, max: 7 });
    expect(parseAging("")).toEqual({ min: null, max: null });
  });
  it("picks the cheapest, then the fastest", () => {
    const best = pickFreight([
      { logisticName: "Slow", logisticPrice: 3, logisticAging: "10-20" },
      { logisticName: "Fast", logisticPrice: 3, logisticAging: "3-5" },
      { logisticName: "Pricey", logisticPrice: 9, logisticAging: "1-2" },
      { logisticName: "NoPrice" },
    ]);
    expect(best?.logisticName).toBe("Fast");
  });

  it("accepts free shipping (UK warehouses often quote 0)", () => {
    const best = pickFreight([
      { logisticName: "Paid", logisticPrice: 2.5, logisticAging: "2-4" },
      { logisticName: "UK Free", logisticPrice: 0, logisticAging: "2-5" },
    ]);
    expect(best?.logisticName).toBe("UK Free");
  });

  it("rejects options without a stated price or name", () => {
    expect(pickFreight([{ logisticName: "X" }, { logisticPrice: 1 }])).toBeNull();
  });
});

describe("variantLabel", () => {
  it("formats CJ option keys", () => {
    expect(variantLabel({ vid: "a", variantKey: "Black-XXL" }, 0)).toBe("Black / XXL");
    expect(variantLabel({ vid: "a", variantKey: "黑色" }, 2)).toBe("Option 3");
  });
});

describe("buildOffer", () => {
  const detail: CjProductDetail = {
    pid: "P1",
    variants: [
      { vid: "V-GB", variantKey: "Grey", variantSellPrice: 5, variantWeight: 200 },
      { vid: "V-CN", variantKey: "Blue", variantSellPrice: 4, variantWeight: 200 },
    ],
  };
  const inventory = {
    variantInventories: [
      { vid: "V-GB", inventory: [{ countryCode: "GB", totalInventory: 40 }, { countryCode: "CN", totalInventory: 999 }] },
      { vid: "V-CN", inventory: [{ countryCode: "CN", totalInventory: 500 }] },
    ],
  };

  it("prefers the UK warehouse and prices from the quote", async () => {
    const quote = vi.fn(async () => [{ logisticName: "UK Post", logisticPrice: 2, logisticAging: "2-4" }]);
    const offer = await buildOffer(detail, inventory, quote, 0.8);
    expect(offer?.warehouseCountry).toBe("GB");
    expect(offer?.variants.map((v) => v.cjVariantId)).toEqual(["V-GB"]);
    expect(offer?.variants[0].deliveryMaxDays).toBe(4);
    // (£4.00 + £1.60) × 2.5 = £14.00 → £14.99
    expect(offer?.variants[0].priced.pricePence).toBe(1499);
    expect(quote).toHaveBeenCalledWith("GB", "V-GB");
  });

  it("falls back to the next warehouse when UK shipping is unavailable", async () => {
    const quote = vi.fn(async (from: string) =>
      from === "GB" ? [] : [{ logisticName: "CJPacket", logisticPrice: 3, logisticAging: "8-12" }],
    );
    const offer = await buildOffer(detail, inventory, quote, 0.8);
    expect(offer?.warehouseCountry).toBe("CN");
    expect(offer?.variants).toHaveLength(2);
    // sorted cheapest first
    expect(offer?.variants[0].cjVariantId).toBe("V-CN");
    // both variants weigh 200 g, so only one CN quote is needed
    expect(quote.mock.calls.filter(([c]) => c === "CN")).toHaveLength(1);
  });

  it("throws (instead of reporting no shipping) when CJ API points run out", async () => {
    const { CjError, isQuotaError } = await import("@/lib/cj/client");
    const quote = vi.fn(async () => {
      throw new CjError("CJ /logistic/freightCalculate failed: Insufficient API points. Used today: 57410, Remaining: 0");
    });
    const err = await buildOffer(detail, inventory, quote, 0.8).catch((e) => e);
    expect(isQuotaError(err)).toBe(true);
    // an ordinary shipping failure still just skips that warehouse
    const other = vi.fn(async () => {
      throw new CjError("CJ /logistic/freightCalculate failed: no route");
    });
    await expect(buildOffer(detail, inventory, other, 0.8)).resolves.toBeNull();
  });

  it("returns null when nothing is in stock", async () => {
    const offer = await buildOffer(detail, { variantInventories: [] }, vi.fn(async () => []), 0.8);
    expect(offer).toBeNull();
  });
});

describe("keywordRelevance", () => {
  it("scores real matches high and loose CJ results low", () => {
    expect(keywordRelevance("silicone air fryer liner", "Air Fryer Silicone Pot Liners Reusable")).toBe(1);
    expect(keywordRelevance("silicone air fryer liner", "Adjustable Air Conditioning Cover Wind Deflector")).toBeLessThan(0.6);
    expect(keywordRelevance("herb scissors", "5 Blade Herb Scissors Kitchen")).toBe(1);
  });
});

describe("discovery eligibility", () => {
  it("keeps kitchen gadgets and drops furniture", async () => {
    const { isEligible } = await import("@/lib/cj/discover");
    expect(isEligible("Electric Coffee Grinder Grinding Milling Nut Bean Spice")).toBe(true);
    expect(isEligible("TV Stand Cabinet High Gloss With 3 Drawers, 3 Open Storage")).toBe(false);
    expect(isEligible("Upholstered Double Bed With Hydraulic Storage")).toBe(false);
  });
});

describe("discovery safety filter", () => {
  it("never lets blades, pet or garden items through", async () => {
    const { isEligible } = await import("@/lib/cj/discover");
    expect(isEligible("Slaughter Cutting Meat Boning Small Scimitar Special Skinning Butcher Kitchen")).toBe(false);
    expect(isEligible("Silicone Dog Bath Massage Gloves Brush Pet Cat Bathroom")).toBe(false);
    expect(isEligible("Breathable Potato Tomato Vegetable Plant Growth Bag")).toBe(false);
    expect(isEligible("Iron Pan Traditional Iron Wok Handmade")).toBe(true);
    expect(isEligible("Multifunctional Slotted Spoon Grinding Cooking Spoon Garlic")).toBe(true);
  });
});

describe("trending pre-filter", () => {
  it("blocks restricted items and allows ordinary gadgets", async () => {
    const { trendingAllowed } = await import("@/lib/cj/trending");
    expect(trendingAllowed("Portable Folding Silicone Water Bottle")).toBe(true);
    expect(trendingAllowed("Car Seat Gap Organizer Storage Box")).toBe(true);
    expect(trendingAllowed("Dog Leash Retractable")).toBe(true);
    expect(trendingAllowed("Kids Toy Car Remote Control")).toBe(false);
    expect(trendingAllowed("Infrared Thermometer Digital")).toBe(false);
    expect(trendingAllowed("Folding Pocket Knife Camping")).toBe(false);
    expect(trendingAllowed("Mini Juicer Blender UK Plug")).toBe(false);
  });
});

describe("AI copy schema", () => {
  it("accepts well-formed copy and rejects unknown categories", async () => {
    const { CopySchema } = await import("@/lib/ai/copywriter");
    const good = { sellable: true, reason: "ok", category: "pets", title: "Retractable Dog Lead", summary: "s", description: "d", bullets: ["a", "b", "c", "d"] };
    expect(CopySchema.safeParse(good).success).toBe(true);
    expect(CopySchema.safeParse({ ...good, category: "toys" }).success).toBe(false);
  });
});
