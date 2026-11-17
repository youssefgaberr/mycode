import Link from "next/link";
import { store } from "@/config/store";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl flex-1 px-4 py-20 text-center">
      <Link href="/" className="text-xl font-extrabold">
        {store.name}
      </Link>
      <h1 className="mt-8 font-display text-4xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">That page doesn&apos;t exist, or the product is no longer available.</p>
      <Link
        href="/shop"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-brand px-7 font-bold text-brand-fg hover:bg-brand-hover"
      >
        Browse the shop
      </Link>
    </main>
  );
}
