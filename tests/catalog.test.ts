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
