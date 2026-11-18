"use client";

import { MARKETS, store } from "@/config/store";
import { setMarket, useMarket } from "./useMarket";

const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

/** £ / $ currency and delivery-country switch. */
export function MarketSwitcher() {
  const market = useMarket();
  return (
    <div role="group" aria-label="Currency and delivery country" className="flex rounded-xl border border-border p-0.5">
      {MARKETS.map((code) => {
        const m = store.markets[code];
        const active = code === market;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setMarket(code)}
            aria-pressed={active}
            title={`${m.label} — prices in ${m.currency}`}
            className={`flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold transition ${
              active ? "bg-brand text-brand-fg" : "text-muted hover:text-fg"
            }`}
          >
            <span aria-hidden>{m.flag}</span>
            {symbols[m.currency] ?? m.currency}
            <span className="sr-only"> {m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
