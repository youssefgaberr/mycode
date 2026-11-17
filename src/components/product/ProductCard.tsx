import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatGBP } from "@/lib/pricing";
import { ProductImage } from "./ProductImage";
import { QuickAdd } from "./QuickAdd";
import { daysRange } from "./delivery";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const range = daysRange(product.deliveryMinDays, product.deliveryMaxDays);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/5] overflow-hidden">
        <ProductImage
          src={product.image}
          alt=""
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="transition duration-500 group-hover:scale-105"
        />
        {product.warehouseCountry === "GB" && (
          <span className="absolute left-3 top-3 rounded-full bg-sage px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white dark:text-[#141110]">
            UK stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-base font-semibold leading-snug sm:text-lg">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.title}
          </Link>
        </h3>
        <p className="line-clamp-2 hidden text-sm text-muted sm:block">{product.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {product.hasVariantPrices && <span className="text-xs font-medium text-muted">from </span>}
              {formatGBP(product.pricePence)}
            </p>
            {range && <p className="text-xs text-muted">Est. {range} working days</p>}
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
      <p className="rounded-3xl border border-dashed border-border p-10 text-center text-muted">No products here yet.</p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
