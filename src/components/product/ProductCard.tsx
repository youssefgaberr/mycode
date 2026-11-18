import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatGBP } from "@/lib/pricing";
import { ProductImage } from "./ProductImage";
import { QuickAdd } from "./QuickAdd";
import { daysRange } from "./delivery";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const range = daysRange(product.deliveryMinDays, product.deliveryMaxDays);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden">
        <ProductImage
          src={product.image}
          alt=""
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {product.isTrending && (
            <span className="rounded-md bg-danger px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
              Hot
            </span>
          )}
          {product.warehouseCountry === "GB" && (
            <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white dark:text-ink">
              UK stock
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
        <h3 className="font-display text-sm font-semibold leading-snug sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.title}
          </Link>
        </h3>
        <p className="line-clamp-2 hidden text-sm text-muted sm:block">{product.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="font-display text-lg font-bold tabular-nums text-brand">
              {product.hasVariantPrices && <span className="text-xs font-medium text-muted">from </span>}
              {formatGBP(product.pricePence)}
            </p>
            {range && <p className="text-xs text-muted">Delivery {range} days</p>}
          </div>
          {product.defaultVariantId && (
            <div className="relative z-10">
              <QuickAdd variantId={product.defaultVariantId} title={product.title} compact />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">No products here yet.</p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
