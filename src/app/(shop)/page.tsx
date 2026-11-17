import Link from "next/link";
import { store } from "@/config/store";
import { getMainProducts } from "@/lib/catalog";
import { formatGBPShort, toPence } from "@/lib/pricing";
import { ProductGrid } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { LockIcon, ReturnIcon, TagIcon, TruckIcon } from "@/components/icons";
import { categoryIcons, categoryTints } from "@/components/category-icons";

export default async function HomePage() {
  const products = await getMainProducts();
  const b = store.basket;
  const collage = products.filter((p) => p.image).slice(0, 3);
  const perks = [
    { icon: TruckIcon, title: `Free delivery from ${formatGBPShort(toPence(b.freeDeliveryThreshold))}`, text: `Otherwise ${formatGBPShort(toPence(b.deliveryFee))} to anywhere in the UK` },
    { icon: TagIcon, title: `${b.multiBuyPercentOff}% off ${b.multiBuyMinItems}+ items`, text: "Applied automatically in your basket" },
    { icon: ReturnIcon, title: "14-day returns", text: "Changed your mind? Send it back" },
    { icon: LockIcon, title: "Secure checkout", text: "Pay safely with Stripe" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sage">
              <span className="size-1.5 rounded-full bg-sage" /> Home &amp; kitchen gadgets
            </p>
            <h1 className="font-display mt-5 text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl">
              Little helpers for a <em className="text-brand not-italic sm:italic">happier</em> kitchen.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{store.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center rounded-full bg-brand px-7 font-bold text-brand-fg shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-hover"
              >
                Shop the gadgets
              </Link>
              <Link
                href="#categories"
                className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-7 font-semibold transition hover:border-brand"
              >
                Browse categories
              </Link>
            </div>
          </div>

          {collage.length > 0 && (
            <div className="relative mx-auto h-72 w-full max-w-md sm:h-96" aria-hidden>
              <div className="absolute -right-6 -top-6 size-56 rounded-full bg-honey/30 blur-3xl" />
              <div className="absolute -bottom-8 left-0 size-48 rounded-full bg-brand/20 blur-3xl" />
              {collage.map((p, i) => {
                const pos = [
                  "left-0 top-6 w-[58%] -rotate-3 z-10",
                  "right-0 top-0 w-[48%] rotate-3",
                  "right-6 bottom-0 w-[50%] -rotate-1 z-20",
                ][i];
                return (
                  <div
                    key={p.id}
                    className={`absolute ${pos} aspect-square overflow-hidden rounded-3xl border-4 border-surface shadow-lift animate-fade-up`}
                    style={{ animationDelay: `${150 + i * 120}ms` }}
                  >
                    <ProductImage src={p.image} alt="" sizes="(min-width: 1024px) 260px, 50vw" priority={i === 0} />
                  </div>
                );
              })}
              <div className="absolute bottom-4 left-2 z-30 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lift">
                <p className="text-xs text-muted">From</p>
                <p className="font-display text-xl font-semibold">
                  {formatGBPShort(Math.min(...products.map((p) => p.pricePence)))}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Perks */}
      <section aria-label="Why shop with us" className="border-b border-border bg-surface">
        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories */}
      <section id="categories" aria-labelledby="cat-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <h2 id="cat-heading" className="font-display text-3xl font-semibold">
          Shop by category
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {store.categories.map((c) => {
            const Icon = categoryIcons[c.slug];
            return (
              <li key={c.slug}>
                <Link
                  href={`/shop/${c.slug}`}
                  className="group flex h-full flex-col items-start gap-6 rounded-3xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className={`flex size-14 items-center justify-center rounded-2xl ${categoryTints[c.slug] ?? "bg-surface-2"}`}>
                    {Icon && <Icon className="size-8" />}
                  </span>
                  <span className="flex w-full items-center justify-between font-semibold">
                    {c.name}
                    <span aria-hidden className="text-muted transition group-hover:translate-x-1 group-hover:text-brand">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-14" aria-labelledby="popular">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="popular" className="font-display text-3xl font-semibold">
              Our gadgets
            </h2>
            <p className="mt-1 text-muted">Everyday tools, chosen to earn their place in your drawer.</p>
          </div>
          <Link href="/shop" className="shrink-0 text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>

      {/* Multi-buy band */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grain relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 text-center sm:px-12">
          <p className="font-display text-3xl font-semibold sm:text-4xl">
            Buy {b.multiBuyMinItems}, save {b.multiBuyPercentOff}%.
          </p>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Mix and match anything in the shop. The discount appears automatically in your basket — and orders of{" "}
            {formatGBPShort(toPence(b.freeDeliveryThreshold))}+ ship free.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-fg px-7 font-bold text-bg transition hover:-translate-y-0.5"
          >
            Start your basket
          </Link>
        </div>
      </section>
    </>
  );
}
