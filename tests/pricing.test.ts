import { describe, expect, it } from "vitest";
import {
  estimateStripeFeePence,
  estimateUnitProfitPence,
  isAddOnOnly,
  priceVariant,
  shopPricePence,
  usdToPence,
  vatIncludedPence,
} from "@/lib/pricing";
import { calculateBasket } from "@/lib/basket";
import { priceForMarket } from "@/lib/pricing";
import { store } from "@/config/store";

describe("shopPricePence", () => {
  it("applies 2.5x markup and rounds to .99", () => {
    // (£6.00 + £2.00) × 2.5 = £20.00 → £20.99
    expect(shopPricePence(600, 200)).toBe(2099);
    // (£5.13 + £1.11) × 2.5 = £15.60 → £15.99
    expect(shopPricePence(513, 111)).toBe(1599);
  });

  it("never goes below £12.99", () => {
    expect(shopPricePence(100, 100)).toBe(1299);
    expect(shopPricePence(0, 0)).toBe(1299);
  });

  it("keeps the pound amount when rounding", () => {
    // exactly £30.00 → £30.99; £30.995 → £30.99
    expect(shopPricePence(1200, 0)).toBe(3099);
    expect(shopPricePence(1239, 0)).toBe(3099); // 30.975
  });
});

describe("helpers", () => {
  it("converts USD to pence", () => {
    expect(usdToPence(10, 0.79)).toBe(790);
    expect(usdToPence(3.57, 0.8)).toBe(286);
  });

  it("extracts 20% VAT from a gross price", () => {
    expect(vatIncludedPence(1200)).toBe(200);
    expect(vatIncludedPence(1299)).toBe(216);
  });

  it("estimates Stripe fees at 1.5% + 20p", () => {
    expect(estimateStripeFeePence(1000)).toBe(35);
    expect(estimateStripeFeePence(0)).toBe(0);
  });
});

describe("profit and add-on rule", () => {
  it("computes profit after VAT, costs, Stripe and £8 ads", () => {
    // price £20.99: ex-VAT 1749; cost 600+200; stripe 31+20=51; ads 800
    expect(estimateUnitProfitPence(2099, 600, 200)).toBe(1749 - 800 - 51 - 800);
  });

  it("flags profit under £3 as add-on only", () => {
    expect(isAddOnOnly(299)).toBe(true);
    expect(isAddOnOnly(300)).toBe(false);
  });

  it("a cheap gadget becomes an add-on", () => {
    const v = priceVariant(4, 1.5, 0.8); // £3.20 + £1.20
    expect(v.pricePence).toBe(1299);
    expect(v.isAddOn).toBe(true);
  });

  it("a pricier gadget stays a main product", () => {
    const v = priceVariant(16, 3, 0.8); // £12.80 + £2.40 → ×2.5 = £38 → £38.99
    expect(v.pricePence).toBe(3899);
    expect(v.estProfitPence).toBeGreaterThanOrEqual(300);
    expect(v.isAddOn).toBe(false);
  });
});

describe("calculateBasket", () => {
  it("empty basket is zero", () => {
    const t = calculateBasket([]);
    expect(t.totalPence).toBe(0);
    expect(t.deliveryPence).toBe(0);
  });

  it("charges £3.99 delivery under £35", () => {
    const t = calculateBasket([{ unitPricePence: 1299, quantity: 2 }]);
    expect(t.subtotalPence).toBe(2598);
    expect(t.discountPence).toBe(0);
    expect(t.deliveryPence).toBe(399);
    expect(t.totalPence).toBe(2997);
    expect(t.itemsToMultiBuy).toBe(1);
  });

  it("gives 10% off 3+ items and free delivery from £35 after discount", () => {
    const t = calculateBasket([{ unitPricePence: 1299, quantity: 3 }]);
    expect(t.subtotalPence).toBe(3897);
    expect(t.discountPence).toBe(390);
    expect(t.itemsAfterDiscountPence).toBe(3507);
    expect(t.freeDelivery).toBe(true);
    expect(t.totalPence).toBe(3507);
  });

  it("discount can push a basket back under the free-delivery threshold", () => {
    // 3 × £12.99 = £38.97 − 10% = £35.07 (free). 3 × £12.00 = £36 − 10% = £32.40 (not free)
    const t = calculateBasket([{ unitPricePence: 1200, quantity: 3 }]);
    expect(t.itemsAfterDiscountPence).toBe(3240);
    expect(t.freeDelivery).toBe(false);
    expect(t.deliveryPence).toBe(399);
    expect(t.spendToFreeDeliveryPence).toBe(260);
  });

  it("free delivery for 1–2 items over £35", () => {
    const t = calculateBasket([{ unitPricePence: 3599, quantity: 1 }]);
    expect(t.freeDelivery).toBe(true);
    expect(t.totalPence).toBe(3599);
    expect(t.vatPence).toBe(600);
  });
});

describe("multi-market pricing", () => {
  it("UK: GBP, VAT-inclusive, same rule as before", () => {
    // $16 + $3 at 0.79 = £12.64 + £2.37 → ×2.5 = £37.53 → £37.99
    const uk = priceForMarket(16, 3, store.markets.GB);
    expect(uk.priceMinor).toBe(3799);
    expect(uk.priceMinor).toBe(priceVariant(16, 3, 0.79).pricePence);
  });

  it("US: USD, no VAT, import-duty allowance on the supplier cost", () => {
    // $16 + 30% duty ($4.80) + $3 ship = $23.80 → ×2.5 = $59.50 → $59.99
    const us = priceForMarket(16, 3, store.markets.US);
    expect(us.priceMinor).toBe(5999);
    expect(us.supplierCostMinor).toBe(2080);
    // 5999 − 2080 − 300 − (174 + 30 Stripe) − 1000 ads
    expect(us.estProfitMinor).toBe(5999 - 2080 - 300 - 204 - 1000);
    expect(us.isAddOn).toBe(false);
  });

  it("US minimum price is $14.99", () => {
    expect(priceForMarket(1, 1, store.markets.US).priceMinor).toBe(1499);
  });

  it("US basket: free delivery from $45, no VAT", () => {
    const t = calculateBasket([{ unitPricePence: 2499, quantity: 2 }], store.markets.US);
    expect(t.freeDelivery).toBe(true);
    expect(t.vatPence).toBe(0);
    const t2 = calculateBasket([{ unitPricePence: 1999, quantity: 1 }], store.markets.US);
    expect(t2.deliveryPence).toBe(499);
  });
});
