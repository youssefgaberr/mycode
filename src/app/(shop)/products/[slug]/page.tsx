import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { categoryName, store } from "@/config/store";
import { getAddOnProducts, getProductBySlug, getProductSlugs } from "@/lib/catalog";
import { formatGBPShort, toPence } from "@/lib/pricing";
import { Gallery } from "@/components/product/Gallery";
import { AddToBasket } from "@/components/product/AddToBasket";
import { CompleteYourOrder } from "@/components/product/CompleteYourOrder";
import { CheckIcon } from "@/components/icons";

const PLACEHOLDER = "__none__";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  // Cache Components needs at least one param; the placeholder renders a 404.
  return (slugs.length ? slugs : [PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.title,
    description: product.summary,
    openGraph: { images: product.images[0]?.startsWith("http") ? [product.images[0]] : [] },
  };
}

async function ProductContent({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = slug === PLACEHOLDER ? null : await getProductBySlug(slug);
  if (!product) notFound();
  const addOns = await getAddOnProducts();
  const b = store.basket;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.summary,
    image: product.images.filter((i) => i.startsWith("http")),
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: (product.pricePence / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/shop" className="hover:underline">
              Shop
            </Link>{" "}
            /
          </li>
          <li>
            <Link href={`/shop/${product.category}`} className="hover:underline">
              {categoryName(product.category)}
            </Link>{" "}
            /
          </li>
          <li aria-current="page" className="text-fg">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery title={product.title} images={product.images} videos={product.videos} />

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-4xl font-semibold">{product.title}</h1>
            <p className="mt-2 text-lg text-muted">{product.summary}</p>
            {product.isDemo && (
              <p className="mt-2 inline-block rounded bg-accent px-2 py-1 text-xs font-bold text-accent-fg">
                DEMO PRODUCT
              </p>
            )}
          </div>

          <AddToBasket product={product} />

          <p className="text-sm text-muted">
            Buy {b.multiBuyMinItems}+ items and save {b.multiBuyPercentOff}%. Free UK delivery over{" "}
            {formatGBPShort(toPence(b.freeDeliveryThreshold))}, otherwise {formatGBPShort(toPence(b.deliveryFee))}.{" "}
            <Link href="/returns" className="underline">
              14-day returns
            </Link>
            .
          </p>

          <ul className="space-y-2">
            {product.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-5 shrink-0 text-success" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="about">
          <h2 id="about" className="text-xl font-bold">
            About this product
          </h2>
          <div className="mt-3 space-y-3 leading-relaxed">
            {product.description.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
        {product.specs.length > 0 && (
          <section aria-labelledby="specs">
            <h2 id="specs" className="text-xl font-bold">
              Specifications
            </h2>
            <dl className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              {product.specs.map((s) => (
                <div key={s.label} className="grid grid-cols-2 gap-2 p-3">
                  <dt className="text-muted">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <div className="mt-12">
        <CompleteYourOrder products={addOns} excludeIds={[product.id]} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-80 animate-pulse rounded-2xl bg-surface-2" />
          </div>
        }
      >
        <ProductContent params={props.params} />
      </Suspense>
    </div>
  );
}
