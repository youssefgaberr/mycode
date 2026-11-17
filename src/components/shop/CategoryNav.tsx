import Link from "next/link";
import { store } from "@/config/store";

/** Category filter chips. `active` is the current category slug (or undefined for all). */
export function CategoryNav({ active }: { active?: string }) {
  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${
      selected ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface hover:border-brand"
    }`;
  return (
    <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href="/shop" className={chip(!active)} aria-current={!active ? "page" : undefined}>
            All
          </Link>
        </li>
        {store.categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/shop/${c.slug}`}
              className={chip(active === c.slug)}
              aria-current={active === c.slug ? "page" : undefined}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
