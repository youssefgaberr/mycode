import { MARKETS, store, type MarketCode } from "@/config/store";

/**
 * Renders one value per market; CSS shows only the visitor's market
 * (html[data-market]). Works in server and client components, so cached
 * pages need no per-visitor rendering.
 */
export function MarketValue({
  values,
  fallback = null,
}: {
  values: Partial<Record<MarketCode, React.ReactNode>>;
  fallback?: React.ReactNode;
}) {
  return (
    <>
      {MARKETS.map((code) => (
        <span key={code} className={`mk-${code}`}>
          {values[code] ?? fallback}
        </span>
      ))}
    </>
  );
}

/** Build MarketValue values from one function: perMarket((m) => formatMoney(…, m)). */
export function perMarket(
  fn: (m: (typeof store.markets)[MarketCode], code: MarketCode) => React.ReactNode,
): Partial<Record<MarketCode, React.ReactNode>> {
  return Object.fromEntries(MARKETS.map((code) => [code, fn(store.markets[code], code)]));
}
