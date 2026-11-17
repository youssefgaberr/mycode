import type { Metadata } from "next";
import { getMainProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { CategoryNav } from "@/components/shop/CategoryNav";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Browse all our home and kitchen gadgets.",
};

export default async function ShopPage() {
  const products = await getMainProducts();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="font-display text-4xl font-semibold">Shop all</h1>
      <CategoryNav />
      <ProductGrid products={products} />
    </div>
  );
}
