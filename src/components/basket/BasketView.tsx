"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { store } from "@/config/store";
import type { ProductCardData } from "@/lib/catalog";
import type { PricedBasket } from "@/lib/checkout";
import { formatGBP } from "@/lib/pricing";
import { useBasket } from "./BasketProvider";
import { ProductImage } from "@/components/product/ProductImage";
import { CompleteYourOrder } from "@/components/product/CompleteYourOrder";
import { LockIcon } from "@/components/icons";

export function BasketView({ addOns }: { addOns: ProductCardData[] }) {
  const { lines, ready, setQuantity, remove, replace } = useBasket();
  const [quote, setQuote] = useState<PricedBasket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const key = JSON.stringify(lines);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const current = JSON.parse(key) as typeof lines;
    if (current.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/basket/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: current }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("quote failed"))))
      .then((q: PricedBasket) => {
        setQuote(q);
        setError(null);
        if (q.removed.length > 0) {
          setNotice("Some items are no longer available and have been removed from your basket.");
          replace(current.filter((l) => !q.removed.includes(l.variantId)));
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("We couldn't load your basket. Please refresh the page.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [key, ready, replace]);

  function checkout() {
    setCheckingOut(true);
    router.push("/checkout");
  }

  if (!ready || (loading && !quote)) {
    return <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Loading basket" />;
  }

  if (lines.length === 0 || !quote || quote.lines.length === 0) {
    return (
      <div className="mt-6 space-y-8">
        {notice && <p className="rounded-lg bg-accent p-3 text-sm text-accent-fg">{notice}</p>}
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-lg">Your basket is empty.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-7 font-bold text-brand-fg hover:bg-brand-hover"
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  const t = quote.totals;
  const b = store.basket;
  const inBasket = new Set(quote.lines.map((l) => l.productId));

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {notice && (
          <p role="status" className="rounded-lg bg-accent p-3 text-sm text-accent-fg">
            {notice}
          </p>
        )}
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {quote.lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:size-24">
                <ProductImage src={l.image} alt="" sizes="96px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/products/${l.slug}`} className="font-semibold hover:underline">
                  {l.title}
                </Link>
                {l.showVariantName && <p className="text-sm text-muted">{l.variantName}</p>}
                <p className="text-sm text-muted">{formatGBP(l.unitPricePence)} each</p>
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <button
                      type="button"
                      onClick={() => setQuantity(l.variantId, l.quantity - 1)}
                      className="size-10 rounded-l-full text-lg hover:bg-surface-2"
                      aria-label={`Decrease quantity of ${l.title}`}
                    >
                      −
                    </button>
                    <span className="w-8 text-center tabular-nums" aria-label={`Quantity ${l.quantity}`}>
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(l.variantId, l.quantity + 1)}
                      disabled={l.quantity >= b.maxQuantityPerLine}
                      className="size-10 rounded-r-full text-lg hover:bg-surface-2 disabled:opacity-40"
                      aria-label={`Increase quantity of ${l.title}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.variantId)}
                    className="text-sm text-muted underline hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="font-bold tabular-nums">{formatGBP(l.lineTotalPence)}</p>
            </li>
          ))}
        </ul>

        <CompleteYourOrder products={addOns.filter((p) => !inBasket.has(p.id))} />
      </div>

      <aside aria-labelledby="summary" className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 id="summary" className="text-lg font-bold">
          Order summary
        </h2>

        {t.itemsToMultiBuy > 0 && (
          <p className="rounded-lg bg-accent p-3 text-sm text-accent-fg">
            Add {t.itemsToMultiBuy} more item{t.itemsToMultiBuy === 1 ? "" : "s"} to save {b.multiBuyPercentOff}%.
          </p>
        )}
        {!t.freeDelivery && t.spendToFreeDeliveryPence > 0 && (
          <p className="rounded-lg bg-accent p-3 text-sm text-accent-fg">
            Spend {formatGBP(t.spendToFreeDeliveryPence)} more for free delivery.
          </p>
        )}

        <dl className="space-y-2 text-sm" aria-live="polite" aria-busy={loading}>
          <div className="flex justify-between">
            <dt>Items ({t.itemCount})</dt>
            <dd className="tabular-nums">{formatGBP(t.subtotalPence)}</dd>
          </div>
          {t.discountPence > 0 && (
            <div className="flex justify-between text-success">
              <dt>Multi-buy {b.multiBuyPercentOff}% off</dt>
              <dd className="tabular-nums">−{formatGBP(t.discountPence)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>UK delivery</dt>
            <dd className="tabular-nums">{t.deliveryPence === 0 ? "Free" : formatGBP(t.deliveryPence)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatGBP(t.totalPence)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Includes VAT</dt>
            <dd className="tabular-nums">{formatGBP(t.vatPence)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={checkout}
          disabled={checkingOut || loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-bold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
        >
          <LockIcon className="size-5" />
          {checkingOut ? "Opening checkout…" : "Checkout securely"}
        </button>
        <p className="text-center text-xs text-muted">
          Card and digital wallet payments, secured by Stripe.
        </p>
      </aside>
    </div>
  );
}
