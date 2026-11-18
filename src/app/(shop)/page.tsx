import Link from "next/link";
import { store } from "@/config/store";
import { getMainProducts, getTrendingProducts } from "@/lib/catalog";
import { formatGBPShort, toPence } from "@/lib/pricing";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { LockIcon, ReturnIcon, TagIcon, TruckIcon } from "@/components/icons";
import { categoryIcons, categoryTints } from "@/components/category-icons";
import { Faq } from "@/components/home/Faq";

export default async function HomePage() {
  const [products, { trending, products: strip }] = await Promise.all([getMainProducts(), getTrendingProducts()]);
  const b = store.basket;
  const highlights = [
    { big: formatGBPShort(toPence(b.freeDeliveryThreshold)), small: "free UK delivery from", icon: TruckIcon },
    { big: `${b.multiBuyPercentOff}%`, small: `off when you buy ${b.multiBuyMinItems}+`, icon: TagIcon },
    { big: "14 days", small: "to change your mind", icon: ReturnIcon },
    { big: "Stripe", small: "secure checkout", icon: LockIcon },
  ];

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-4xl px-4 pb-14 pt-14 text-center sm:pb-20 sm:pt-20">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-soft">
            <span className="rounded-full bg-danger px-1.5 py-px text-[10px] font-extrabold uppercase text-white">New</span>
            Clever gadgets for UK kitchens
          </p>
          <h1 className="font-display mt-6 animate-fade-up text-[2.5rem] font-extrabold leading-[1.08] sm:text-6xl">
            Kitchen gadgets that
            <br />
            <span className="text-brand">make cooking easier</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-lg leading-relaxed text-muted">
            Smart, affordable tools for everyday cooking, prep and storage — delivered to your door.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 font-semibold text-brand-fg shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-hover"
            >
              Shop all gadgets <span aria-hidden>→</span>
            </Link>
            <Link
              href="#trending"
              className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-7 font-semibold transition hover:border-brand"
            >
              {trending ? "See what's trending" : "See what's new"}
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Free UK delivery from {formatGBPShort(toPence(b.freeDeliveryThreshold))} · 14-day returns · Prices include VAT
          </p>
        </div>
      </section>

      {/* Trending / new strip */}
      {strip.length > 0 && (
        <section id="trending" aria-labelledby="trending-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 id="trending-heading" className="font-display flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              {trending ? (
                <>
                  <span aria-hidden>🔥</span> Trending this week
                </>
              ) : (
                <>
                  <span aria-hidden>✨</span> New in
                </>
              )}
            </h2>
            <Link href="/shop" className="shrink-0 text-sm font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          <ul className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible sm:px-0">
            {strip.slice(0, 4).map((p, i) => (
              <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
                <ProductCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Payments strip */}
      <section aria-label="Payment options" className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-surface-2 px-4 py-4 text-sm font-semibold text-muted">
          <span className="flex items-center gap-2 text-fg">
            <LockIcon className="size-4" /> Secure checkout by Stripe
          </span>
          <span>Visa</span>
          <span>Mastercard</span>
          <span>American Express</span>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" aria-labelledby="cat-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Categories</p>
        <h2 id="cat-heading" className="font-display mt-1 text-2xl font-bold sm:text-3xl">
          Shop by category
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {store.categories.map((c) => {
            const Icon = categoryIcons[c.slug];
            return (
              <li key={c.slug}>
                <Link
                  href={`/shop/${c.slug}`}
                  className="group flex h-full flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift"
                >
                  <span className={`flex size-12 items-center justify-center rounded-xl ${categoryTints[c.slug] ?? "bg-surface-2"}`}>
                    {Icon && <Icon className="size-7" />}
                  </span>
                  <span className="flex w-full items-center justify-between text-sm font-semibold">
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

      {/* Highlights band */}
      <section aria-label="Why shop with us" className="mx-auto max-w-6xl px-4 pt-14">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {highlights.map(({ big, small, icon: Icon }) => (
            <li key={small} className="rounded-2xl border border-border bg-surface p-5 text-center">
              <Icon className="mx-auto size-6 text-brand" />
              <p className="font-display mt-2 text-2xl font-extrabold sm:text-3xl">{big}</p>
              <p className="mt-1 text-sm text-muted">{small}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* All products */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 pt-14" aria-labelledby="all">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Shop</p>
            <h2 id="all" className="font-display mt-1 text-2xl font-bold sm:text-3xl">
              All gadgets
            </h2>
          </div>
          <Link href="/shop" className="shrink-0 text-sm font-semibold text-brand hover:underline">
            Browse the shop →
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>

      <Faq />

      {/* Dark CTA band */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-12">
          <div aria-hidden className="absolute -left-20 -top-20 size-64 rounded-full bg-brand/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -right-16 size-64 rounded-full bg-honey/20 blur-3xl" />
          <p className="relative inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Multi-buy</p>
          <p className="font-display relative mt-4 text-3xl font-extrabold sm:text-4xl">
            Buy {b.multiBuyMinItems}, save {b.multiBuyPercentOff}%
          </p>
          <p className="relative mx-auto mt-3 max-w-md text-white/75">
            Mix and match anything in the shop. The discount appears automatically in your basket — and orders of{" "}
            {formatGBPShort(toPence(b.freeDeliveryThreshold))}+ ship free.
          </p>
          <Link
            href="/shop"
            className="relative mt-7 inline-flex h-12 items-center rounded-xl bg-white px-7 font-semibold text-ink transition hover:-translate-y-0.5"
          >
            Start your basket
          </Link>
        </div>
      </section>
    </>
  );
}
