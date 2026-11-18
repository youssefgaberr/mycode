/**
 * Unit economics with the store's real pricing rules (src/config/store.ts).
 *
 *   npm run economics
 *
 * Prints, per market: shop price and profit for typical CJ costs, then the
 * profit on whole orders of 1–4 items (the ad cost is paid once per ORDER,
 * so bigger baskets are where the money is).
 */
import { MARKETS, store } from "@/config/store";
import { calculateBasket } from "@/lib/basket";
import { formatMoney, priceForMarket, taxIncludedMinor, toPence } from "@/lib/pricing";

const scenarios: [number, number][] = [
  [1, 4],
  [2, 4.5],
  [3, 4.5],
  [6, 5],
  [10, 6],
  [15, 8],
];

for (const code of MARKETS) {
  const m = store.markets[code];
  const money = (minor: number) => formatMoney(minor, m);
  console.log(`\n=== ${m.flag} ${code} (${m.currency}) — markup ×${store.pricing.markup}, ads ${money(toPence(m.adCostPerOrder))}/order ===`);
  console.log("supplier+ship (USD) | shop price | profit after ads (1 item) | add-on?");
  for (const [s, sh] of scenarios) {
    const r = priceForMarket(s, sh, m);
    console.log(`$${s} + $${sh}`.padEnd(20), "|", money(r.priceMinor).padEnd(10), "|", money(r.estProfitMinor).padEnd(25), "|", r.isAddOn ? "yes" : "no");
  }

  console.log("\nWhole orders of a typical item ($3 + $4.50 shipping each):");
  const item = priceForMarket(3, 4.5, m);
  for (const qty of [1, 2, 3, 4]) {
    const totals = calculateBasket([{ unitPricePence: item.priceMinor, quantity: qty }], m);
    const tax = taxIncludedMinor(totals.totalPence, m);
    const fee = Math.round(totals.totalPence * m.stripeFeePercent) + toPence(m.stripeFeeFixed);
    const goods = (item.supplierCostMinor + item.shippingCostMinor) * qty;
    const profit = totals.totalPence - tax - fee - goods - toPence(m.adCostPerOrder);
    console.log(
      `  ${qty} item(s): customer pays ${money(totals.totalPence)}` +
        `${totals.multiBuyApplied ? " (multibuy −10%)" : ""}${totals.freeDelivery ? " (free delivery)" : ""}` +
        ` → profit after ads ${money(profit)}`,
    );
  }
}
