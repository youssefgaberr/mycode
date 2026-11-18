"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_MARKET, isMarket, type MarketCode } from "@/config/store";

export const MARKET_COOKIE = "bp_market";
const EVENT = "bp-market-change";

function read(): MarketCode {
  const m = typeof document !== "undefined" ? document.documentElement.dataset.market : undefined;
  return isMarket(m) ? m : DEFAULT_MARKET;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** The visitor's market (set before paint by the script in the root layout). */
export function useMarket(): MarketCode {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_MARKET);
}

export function setMarket(code: MarketCode) {
  document.documentElement.dataset.market = code;
  document.cookie = `${MARKET_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new Event(EVENT));
}
