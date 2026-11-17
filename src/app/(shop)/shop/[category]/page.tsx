import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { store } from "@/config/store";
import { getMainProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { CategoryNav } from "@/components/shop/CategoryNav";

export function generateStaticParams() {
  return store.categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const c = store.categories.find((x) => x.slug === category);
  return c ? { title: c.name, description: `${c.name} gadgets from ${store.name}.` } : {};
}

async function CategoryContent({ params }: Pick<PageProps<"/shop/[category]">, "params">) {
  const { category } = await params;
  const c = store.categories.find((x) => x.slug === category);
  if (!c) notFound();
  const products = await getMainProducts(c.slug);
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">{c.name}</h1>
      <CategoryNav active={c.slug} />
      <ProductGrid products={products} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/shop/[category]">) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
        <CategoryContent params={props.params} />
      </Suspense>
    </div>
  );
}
