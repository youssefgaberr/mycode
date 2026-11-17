"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { store } from "@/config/store";

/**
 * Client-side basket: just variant ids and quantities, stored in
 * localStorage. Prices always come from the server (/api/basket/quote), so
 * nobody can change what they pay by editing the browser.
 */

export interface BasketLine {
  variantId: string;
  quantity: number;
}

interface BasketContextValue {
  lines: BasketLine[];
  ready: boolean;
  count: number;
  add: (variantId: string, quantity?: number, title?: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  replace: (lines: BasketLine[]) => void;
  /** Last announcement for screen readers. */
  announcement: string;
}

const KEY = "bp_basket_v1";
const BasketContext = createContext<BasketContextValue | null>(null);
const max = store.basket.maxQuantityPerLine;

function read(): BasketLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0)
      .map((l) => ({ variantId: l.variantId, quantity: Math.min(l.quantity, max) }));
  } catch {
    return [];
  }
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [toast, setToast] = useState<{ title: string; key: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount (it isn't available during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: BasketLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const value = useMemo<BasketContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    return {
      lines,
      ready,
      count,
      announcement,
      add(variantId, quantity = 1, title) {
        const existing = lines.find((l) => l.variantId === variantId);
        const next = existing
          ? lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(l.quantity + quantity, max) } : l))
          : [...lines, { variantId, quantity: Math.min(quantity, max) }];
        persist(next);
        setAnnouncement(`Added to basket. Basket now has ${next.reduce((n, l) => n + l.quantity, 0)} items.`);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ title: title ?? "Item", key: Date.now() });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
      },
      setQuantity(variantId, quantity) {
        const q = Math.max(0, Math.min(quantity, max));
        persist(
          q === 0
            ? lines.filter((l) => l.variantId !== variantId)
            : lines.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
        );
      },
      remove(variantId) {
        persist(lines.filter((l) => l.variantId !== variantId));
        setAnnouncement("Item removed from basket.");
      },
      clear() {
        persist([]);
      },
      replace(next) {
        persist(next);
      },
    };
  }, [lines, ready, announcement, persist]);

  return (
    <BasketContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {toast && (
        <div
          key={toast.key}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md animate-toast items-center gap-3 rounded-2xl border border-border bg-surface p-3 pl-4 shadow-lift"
          aria-hidden
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">✓</span>
          <p className="min-w-0 flex-1 truncate text-sm">
            <strong>{toast.title}</strong> added to basket
          </p>
          <Link
            href="/basket"
            onClick={() => setToast(null)}
            tabIndex={-1}
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-fg hover:bg-brand-hover"
          >
            View basket
          </Link>
        </div>
      )}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used inside <BasketProvider>");
  return ctx;
}
