import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { formatGBPShort, toPence } from "@/lib/pricing";
import { Email, PolicyPage } from "@/components/policy/Policy";

export const metadata: Metadata = { title: "Delivery" };

export default function DeliveryPage() {
  const b = store.basket;
  return (
    <PolicyPage title="Delivery information" updated="[DATE]">
      <h2>Where we deliver</h2>
      <p>We currently deliver to addresses in the United Kingdom only.</p>

      <h2>Delivery charges</h2>
      <ul>
        <li>
          <strong>Free delivery</strong> on orders of {formatGBPShort(toPence(b.freeDeliveryThreshold))} or more (after any
          discount).
        </li>
        <li>Otherwise delivery costs {formatGBPShort(toPence(b.deliveryFee))} per order.</li>
        <li>
          Buy {b.multiBuyMinItems} or more items and get {b.multiBuyPercentOff}% off your items.
        </li>
      </ul>

      <h2>How long will it take?</h2>
      <p>
        Our products are sent to you directly by our fulfilment partner from warehouses in the UK, the EU or
        internationally. Each product page shows an <strong>estimated delivery time</strong> for that item, based on the
        warehouse it ships from and the carrier used. These are estimates, not guarantees.
      </p>
      <p>
        If your order contains items from different warehouses, they may arrive in separate parcels on different days.
        You won&apos;t pay extra delivery for this.
      </p>

      <h2>Tracking</h2>
      <p>
        When your order ships we&apos;ll email you a tracking number. Please allow a day or two for tracking to start
        showing updates.
      </p>

      <h2>Customs, duty and VAT</h2>
      <p>
        Our prices include UK VAT. You shouldn&apos;t be asked to pay anything extra when your parcel arrives. If a
        carrier asks you for a fee, please contact us before paying.
      </p>

      <h2>Late, lost or damaged parcels</h2>
      <p>
        If your parcel hasn&apos;t arrived within 7 days after the latest estimated date, or arrives damaged, email us
        at <Email /> with your order number and we&apos;ll put it right. See also our{" "}
        <Link href="/returns">returns policy</Link>.
      </p>
    </PolicyPage>
  );
}
