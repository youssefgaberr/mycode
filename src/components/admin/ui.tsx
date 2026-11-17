export function Flash({ msg }: { msg?: string | string[] }) {
  if (!msg || Array.isArray(msg)) return null;
  return (
    <p role="status" className="mb-4 rounded-lg border border-border bg-accent p-3 text-sm text-accent-fg">
      {msg}
    </p>
  );
}

const statusStyles: Record<string, string> = {
  NEEDS_ATTENTION: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  PAID: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  SUBMITTING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  SENT_TO_CJ: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  SHIPPED: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  DELIVERED: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  APPROVED: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  PUBLISHED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  REJECTED: "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${
        statusStyles[status] ?? "bg-surface-2 text-fg"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "border-danger" : "border-border"} bg-surface`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

export const btn =
  "inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-brand";
export const btnPrimary =
  "inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-fg hover:bg-brand-hover";
