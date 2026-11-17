import Link from "next/link";
import { store } from "@/config/store";
import { PanMark } from "@/components/category-icons";
import { BasketLink } from "./BasketLink";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/shop", label: "Shop all" },
  { href: "/delivery", label: "Delivery" },
  { href: "/returns", label: "Returns" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto flex items-center gap-2" aria-label={`${store.name} home`}>
          <PanMark className="size-8 text-brand" />
          <span className="font-display text-2xl font-semibold">{store.name}</span>
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-3 py-2 text-muted transition hover:bg-surface-2 hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/shop"
          className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg md:hidden"
        >
          Shop
        </Link>
        <ThemeToggle />
        <BasketLink />
      </div>
    </header>
  );
}
