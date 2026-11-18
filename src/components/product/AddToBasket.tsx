"use client";

import { useEffect, useRef, useState } from "react";
import { store } from "@/config/store";
import { useBasket } from "@/components/basket/BasketProvider";
import { useMarket } from "@/components/market/useMarket";
import { formatMoney } from "@/lib/pricing";
import type { ProductPageData } from "@/lib/catalog";
import { DeliveryEstimate } from "./DeliveryEstimate";

export function AddToBasket({ product }: { product: ProductPageData }) {
  const { add } = useBasket();
  const market = useMarket();
  const m = store.markets[market];
  const available = product.variants.filter((v) => v.markets[market]);
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);
  const variant =
    available.find((v) => v.id === variantId) ??
    available.find((v) => v.id === product.markets[market]?.defaultVariantId) ??
    available[0];
  const vm = variant?.markets[market];
  const minPrice = Math.min(...available.map((v) => v.markets[market]!.priceMinor));
  const max = store.basket.maxQuantityPerLine;

  // Show the sticky mobile bar once the main button has scrolled out of view.
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [variant?.id]);

  if (!variant || !vm) {
    return (
      <p className="rounded-2xl border border-border bg-surface-2 p-4 text-sm">
        Sorry — this item can&apos;t currently be delivered to the {m.label}. Try another product, or switch country with
        the £/$ button at the top.
      </p>
    );
  }

  const addToBasket = () => add(variant.id, quantity, product.title);

  return (
    <div className="space-y-6">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tabular-nums">{formatMoney(vm.priceMinor, m)}</span>
        <span className="text-sm text-muted">{m.pricesIncludeTax ? "incl. VAT" : "plus any sales tax"}</span>
      </p>

      {available.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Option: <span className="font-normal text-muted">{variant.name}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {available.map((v) => {
              const price = v.markets[market]!.priceMinor;
              return (
                <label
                  key={v.id}
                  className={`cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-medium transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${
                    v.id === variant.id ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={v.id === variant.id}
                    onChange={() => setVariantId(v.id)}
                    className="sr-only"
                  />
                  {v.name}
                  {price !== minPrice && <span className="text-muted"> · {formatMoney(price, m)}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex items-stretch gap-3">
        <div className="inline-flex items-center rounded-xl border border-border bg-surface" role="group" aria-label="Quantity">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="size-12 rounded-l-xl text-xl hover:bg-surface-2 disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <output className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max}
            className="size-12 rounded-r-xl text-xl hover:bg-surface-2 disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          ref={mainButton}
          type="button"
          onClick={addToBasket}
          className="h-12 flex-1 rounded-xl bg-brand px-6 font-bold text-brand-fg shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-hover active:translate-y-0"
        >
          Add to basket
        </button>
      </div>

      <DeliveryEstimate
        minDays={vm.deliveryMinDays}
        maxDays={vm.deliveryMaxDays}
        warehouseCountry={vm.warehouseCountry}
        carrier={vm.logisticName}
        countryLabel={m.label}
      />

      {/* Sticky bar for phones */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur transition-transform duration-300 sm:hidden ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            <p className="text-sm tabular-nums text-muted">{formatMoney(vm.priceMinor * quantity, m)}</p>
          </div>
          <button
            type="button"
            onClick={addToBasket}
            tabIndex={showSticky ? 0 : -1}
            className="h-12 rounded-xl bg-brand px-6 font-bold text-brand-fg"
          >
            Add to basket
          </button>
        </div>
      </div>
    </div>
  );
}
