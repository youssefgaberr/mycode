import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/sourcing", label: "Sourcing" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/admin" className="mr-4 font-extrabold">
            {store.name} admin
          </Link>
          <nav aria-label="Admin" className="flex flex-1 flex-wrap gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 hover:bg-surface-2">
                {n.label}
              </Link>
            ))}
            <Link href="/" className="rounded-md px-3 py-2 hover:bg-surface-2">
              View shop ↗
            </Link>
          </nav>
          <form action={logout}>
            <button className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Log out</button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
