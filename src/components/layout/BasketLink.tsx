"use client";

import Link from "next/link";
import { useBasket } from "@/components/basket/BasketProvider";
import { BasketIcon } from "@/components/icons";

export function BasketLink() {
  const { count, ready } = useBasket();
  const label = ready && count > 0 ? `Basket, ${count} item${count === 1 ? "" : "s"}` : "Basket";
  return (
    <Link
      href="/basket"
      aria-label={label}
      className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
    >
      <BasketIcon />
      {ready && count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold leading-5 text-brand-fg"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
