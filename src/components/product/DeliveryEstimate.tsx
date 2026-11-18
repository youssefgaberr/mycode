"use client";

import { useSyncExternalStore } from "react";
import { warehouseLabels } from "@/config/store";
import { ReturnIcon, TruckIcon } from "@/components/icons";
import { daysRange } from "./delivery";

function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const subscribe = () => () => {};

/**
 * Shows CJ's estimated delivery time for the selected variant. Dates are
 * worked out in the browser so the cached page never shows stale dates.
 */
export function DeliveryEstimate({
  minDays,
  maxDays,
  warehouseCountry,
  carrier,
  countryLabel = "UK",
}: {
  minDays: number | null;
  maxDays: number | null;
  warehouseCountry: string;
  carrier: string | null;
  countryLabel?: string;
}) {
  const range = daysRange(minDays, maxDays);
  const dates = useSyncExternalStore(
    subscribe,
    () => {
      if (minDays == null || maxDays == null) return null;
      const now = new Date();
      return `${fmt(addWorkingDays(now, minDays))} – ${fmt(addWorkingDays(now, maxDays))}`;
    },
    () => null,
  );

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage">
          <TruckIcon className="size-5" />
        </span>
        <div className="text-sm">
          {range ? (
            <>
              <p className="font-semibold">
                Estimated delivery to the {countryLabel}: {range} working days
              </p>
              {dates && <p className="text-fg">Arrives around {dates}</p>}
            </>
          ) : (
            <p className="font-semibold">Delivery estimate shown at checkout</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Ships from our {warehouseLabels[warehouseCountry] ?? "partner warehouse"}
            {carrier ? ` with ${carrier}` : ""}. Estimate from our fulfilment partner; not guaranteed.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 text-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <ReturnIcon className="size-5" />
        </span>
        <p>
          <span className="font-semibold">14-day returns.</span> <span className="text-muted">Change your mind after delivery? Send it back.</span>
        </p>
      </div>
    </div>
  );
}
