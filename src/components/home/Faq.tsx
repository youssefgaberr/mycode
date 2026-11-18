import Link from "next/link";
import { store } from "@/config/store";
import { formatGBPShort, toPence } from "@/lib/pricing";

/** Home-page FAQ. Answers match the policy pages — keep them in sync. */
export function Faq() {
  const b = store.basket;
  const items = [
    {
      q: "How long does delivery take?",
      a: (
        <>
          Each product page shows an estimated delivery time for that item, based on the warehouse it ships from. Orders
          containing items from different warehouses may arrive in separate parcels. You&apos;ll get a tracking number by
          email when your order ships.
        </>
      ),
    },
    {
      q: "How much is delivery?",
      a: (
        <>
          Delivery is free on orders of {formatGBPShort(toPence(b.freeDeliveryThreshold))} or more (after any discount),
          otherwise {formatGBPShort(toPence(b.deliveryFee))} to anywhere in the UK.
        </>
      ),
    },
    {
      q: "How does the multi-buy discount work?",
      a: (
        <>
          Put {b.multiBuyMinItems} or more items in your basket — mix and match anything — and {b.multiBuyPercentOff}% comes
          off your items automatically.
        </>
      ),
    },
    {
      q: "Can I return something?",
      a: (
        <>
          Yes. You can cancel within 14 days of receiving your order, and faulty items are always covered. See our{" "}
          <Link href="/returns" className="text-brand underline">
            returns policy
          </Link>{" "}
          for how it works.
        </>
      ),
    },
    {
      q: "Is checkout secure?",
      a: (
        <>
          Payments are handled by Stripe. Your card details go straight to Stripe and never touch our servers.
        </>
      ),
    },
    {
      q: "Will I have to pay customs or extra VAT?",
      a: (
        <>
          No — our prices include UK VAT. If a carrier ever asks you for a fee, please{" "}
          <Link href="/contact" className="text-brand underline">
            contact us
          </Link>{" "}
          before paying.
        </>
      ),
    },
  ];

  return (
    <section aria-labelledby="faq" className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-brand">Help</p>
      <h2 id="faq" className="font-display mt-2 text-center text-3xl font-bold sm:text-4xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
        {items.map((item, i) => (
          <details key={item.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold">
              {item.q}
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Still have a question?{" "}
        <Link href="/contact" className="font-semibold text-brand underline">
          Contact us
        </Link>
      </p>
    </section>
  );
}
