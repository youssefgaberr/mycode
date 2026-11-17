import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatGBP } from "@/lib/pricing";
import { ProductImage } from "./ProductImage";
import { QuickAdd } from "./QuickAdd";

/** "Complete your order" — add-on-only products, shown on product and basket pages. */
export function CompleteYourOrder({
  products,
  excludeIds = [],
  heading = "Complete your order",
}: {
  products: ProductCardData[];
  excludeIds?: string[];
  heading?: string;
}) {
  const list = products.filter((p) => !excludeIds.includes(p.id)).slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="complete-order" className="grain rounded-3xl border border-border bg-surface-2 p-4 sm:p-6">
      <h2 id="complete-order" className="font-display text-2xl font-semibold">
        {heading}
      </h2>
      <p className="text-sm text-muted">Handy extras — and they count towards free delivery and multi-buy savings.</p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <ProductImage src={p.image} alt="" sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${p.slug}`} className="block truncate text-sm font-semibold hover:underline">
                {p.title}
              </Link>
              <p className="text-sm">{formatGBP(p.pricePence)}</p>
            </div>
            {p.defaultVariantId && <QuickAdd variantId={p.defaultVariantId} title={p.title} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
