import { formatMoneyShort, toPence } from "@/lib/pricing";
import { MarketValue, perMarket } from "./MarketValue";

/** "£35" / "$45" — free-delivery threshold in the visitor's market. */
export const FreeDeliveryFrom = () => (
  <MarketValue values={perMarket((m) => formatMoneyShort(toPence(m.freeDeliveryThreshold), m))} />
);

/** "£3.99" / "$4.99" — standard delivery charge. */
export const DeliveryFee = () => <MarketValue values={perMarket((m) => formatMoneyShort(toPence(m.deliveryFee), m))} />;

/** "UK" / "US" */
export const DeliveryCountry = () => <MarketValue values={perMarket((m) => (m.code === "GB" ? "UK" : "US"))} />;

/** "Prices include VAT" / "Prices exclude sales tax" */
export const TaxNote = () => (
  <MarketValue values={perMarket((m) => (m.pricesIncludeTax ? "Prices include VAT" : "Prices exclude sales tax"))} />
);

/** "GBP" / "USD" */
export const CurrencyCode = () => <MarketValue values={perMarket((m) => m.currency)} />;
