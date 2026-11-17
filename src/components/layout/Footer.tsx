import Link from "next/link";
import { store } from "@/config/store";
import { PanMark } from "@/components/category-icons";

const shop = store.categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name }));
const help = [
  { href: "/delivery", label: "Delivery" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-[#221c18] text-[#efe7dd] dark:bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2">
            <PanMark className="size-7 text-[#f08a5d]" />
            <span className="font-display text-2xl font-semibold">{store.name}</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-[#c9bcaf]">{store.tagline}</p>
        </div>
        <nav aria-label="Shop categories">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f2c46b]">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {shop.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[#c9bcaf] hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Customer service">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f2c46b]">Help</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {help.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[#c9bcaf] hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm text-[#c9bcaf]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f2c46b]">Company</h2>
          <p className="mt-3">{store.company.legalName}</p>
          <p>Company no. {store.company.companyNumber}</p>
          <p>VAT {store.company.vatNumber}</p>
          <p>{store.company.address}</p>
          <p>{store.company.email}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[#a89b8e]">
          © {store.name}. All prices in GBP and include VAT. Secure payments by Stripe.
        </p>
      </div>
    </footer>
  );
}
