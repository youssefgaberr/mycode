import { store } from "@/config/store";

/** Highlights values that are still [PLACEHOLDERS] so they're easy to spot and replace. */
export function Fill({ value }: { value: string }) {
  if (value.startsWith("[") && value.endsWith("]")) return <span className="placeholder">{value}</span>;
  return <>{value}</>;
}

export const Company = () => <Fill value={store.company.legalName} />;
export const Email = () => {
  const e = store.company.email;
  return e.startsWith("[") ? <Fill value={e} /> : <a href={`mailto:${e}`}>{e}</a>;
};
export const Address = () => <Fill value={store.company.address} />;

export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="prose-policy mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}
