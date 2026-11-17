import type { Metadata } from "next";
import { getAddOnProducts } from "@/lib/catalog";
import { BasketView } from "@/components/basket/BasketView";

export const metadata: Metadata = { title: "Your basket", robots: { index: false } };

export default async function BasketPage() {
  const addOns = await getAddOnProducts();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-semibold">Your basket</h1>
      <BasketView addOns={addOns} />
    </div>
  );
}
