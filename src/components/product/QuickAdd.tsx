"use client";

import { useState } from "react";
import { useBasket } from "@/components/basket/BasketProvider";
import { BasketIcon, CheckIcon } from "@/components/icons";

export function QuickAdd({ variantId, title, compact }: { variantId: string; title: string; compact?: boolean }) {
  const { add } = useBasket();
  const [done, setDone] = useState(false);
  const onClick = () => {
    add(variantId, 1, title);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Add ${title} to basket`}
        className={`inline-flex size-11 items-center justify-center rounded-full transition ${
          done ? "bg-success text-white" : "bg-brand text-brand-fg hover:bg-brand-hover"
        }`}
      >
        {done ? <CheckIcon className="size-5" /> : <BasketIcon className="size-5" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add ${title} to basket`}
      className="shrink-0 rounded-full border-2 border-brand px-4 py-1.5 text-sm font-bold text-brand transition hover:bg-brand hover:text-brand-fg"
    >
      {done ? "Added ✓" : "Add"}
    </button>
  );
}
