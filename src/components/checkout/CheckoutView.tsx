"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useBasket } from "@/components/basket/BasketProvider";
import type { PricedBasket } from "@/lib/checkout";
import { formatGBP } from "@/lib/pricing";
import { LockIcon } from "@/components/icons";
import { ProductImage } from "@/components/product/ProductImage";

/**
 * Our checkout page. The payment form is Stripe's embedded Checkout: card
 * details go straight to Stripe (we never see them), and Stripe shows every
 * payment method enabled in your dashboard — cards, Apple Pay, Google Pay,
 * Link, Klarna, PayPal, etc.
 */
export function CheckoutView({ publishableKey }: { publishableKey: string }) {
  const { lines, ready } = useBasket();
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<PricedBasket | null>(null);
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  // One checkout session per page view (guards against double mounting).
  const secretPromise = useRef<Promise<string> | null>(null);
  const fetchClientSecret = useCallback(() => {
    if (!secretPromise.current) {
      secretPromise.current = fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      }).then(async (res) => {
        const data = await res.json();
        if (res.ok && data.url) {
          // Embedded checkout not configured: use Stripe's hosted page instead.
          window.location.assign(data.url);
          return new Promise<string>(() => {});
        }
        if (!res.ok || !data.clientSecret) {
          const message = data.error ?? "We couldn't start checkout. Please try again.";
          setError(message);
          throw new Error(message);
        }
        return data.clientSecret as string;
      });
    }
    return secretPromise.current;
  }, [lines]);

  useEffect(() => {
    if (!ready || lines.length === 0) return;
    fetch("/api/basket/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    })
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => undefined);
    // Hosted fallback: no publishable key, so go straight to Stripe.
    if (!publishableKey) fetchClientSecret().catch(() => undefined);
  }, [ready, lines, publishableKey, fetchClientSecret]);

  if (!ready) return <div className="mt-6 h-96 animate-pulse rounded-3xl bg-surface-2" />;

  if (lines.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-border p-10 text-center">
        <p>Your basket is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-semibold text-brand underline">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label="Payment" className="min-h-[600px] overflow-hidden rounded-3xl border border-border bg-white p-2 sm:p-4">
        {error ? (
          <div role="alert" className="p-6 text-[#221c18]">
            <p className="font-semibold">{error}</p>
            <Link href="/basket" className="mt-3 inline-block text-[#b8471f] underline">
              Back to your basket
            </Link>
          </div>
        ) : stripePromise ? (
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <p className="p-6 text-[#675c53]">Taking you to our secure payment page…</p>
        )}
      </section>

      <aside aria-label="Order summary" className="h-fit space-y-4 rounded-3xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl font-semibold">Your order</h2>
        {quote ? (
          <>
            <ul className="space-y-3">
              {quote.lines.map((l) => (
                <li key={l.variantId} className="flex items-center gap-3 text-sm">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                    <ProductImage src={l.image} alt="" sizes="56px" />
                    <span className="absolute -right-1 -top-1 z-10 rounded-full bg-fg px-1.5 text-xs font-bold text-bg">{l.quantity}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.title}</span>
                    {l.showVariantName && <span className="text-muted">{l.variantName}</span>}
                  </span>
                  <span className="tabular-nums">{formatGBP(l.lineTotalPence)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-border pt-3 text-sm">
              {quote.totals.discountPence > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Multi-buy discount</dt>
                  <dd>−{formatGBP(quote.totals.discountPence)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd>{quote.totals.deliveryPence ? formatGBP(quote.totals.deliveryPence) : "Free"}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd>{formatGBP(quote.totals.totalPence)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Includes VAT</dt>
                <dd>{formatGBP(quote.totals.vatPence)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
        )}
        <p className="flex items-start gap-2 text-xs text-muted">
          <LockIcon className="size-4 shrink-0" />
          Payments are processed securely by Stripe. Your card details never touch our servers.
        </p>
        <Link href="/basket" className="block text-sm text-brand underline">
          Edit basket
        </Link>
      </aside>
    </div>
  );
}
