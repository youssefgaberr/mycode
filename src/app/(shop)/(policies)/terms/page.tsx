import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { Address, Company, Email, Fill, PolicyPage } from "@/components/policy/Policy";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & conditions" updated="[DATE]">
      <h2>Who we are</h2>
      <p>
        {store.name} is a trading name of <Company />, company number <Fill value={store.company.companyNumber} />,
        VAT number <Fill value={store.company.vatNumber} />, registered address <Address />. Email: <Email />.
      </p>

      <h2>Your order</h2>
      <p>
        When you place an order you&apos;ll receive an email acknowledging it. Our contract with you starts when we send
        that order confirmation. If we can&apos;t accept your order (for example an item has sold out) we&apos;ll tell
        you and refund you in full.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Prices are in pounds sterling and include VAT. Delivery charges are shown in your basket before you pay. Payment
        is taken by Stripe when you place your order. If we&apos;ve made an obvious pricing error we&apos;ll contact you
        before dispatching.
      </p>

      <h2>Delivery</h2>
      <p>
        We deliver to UK addresses only. Delivery estimates are shown on each product page and are not guaranteed. See
        our <Link href="/delivery">delivery information</Link>.
      </p>

      <h2>Cancellations and returns</h2>
      <p>
        You can cancel within 14 days of receiving your goods. Full details are in our{" "}
        <Link href="/returns">returns policy</Link>.
      </p>

      <h2>Using our products</h2>
      <p>
        Please read any instructions supplied with a product and use it only for its intended purpose. Take care with
        sharp blades and keep small items away from young children.
      </p>

      <h2>Our liability</h2>
      <p>
        If we fail to meet these terms we&apos;re responsible for loss or damage you suffer that is a foreseeable result
        of our failure. We don&apos;t exclude or limit liability where it would be unlawful to do so, including for
        death or personal injury caused by our negligence, or for fraud. Nothing in these terms affects your statutory
        rights.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland you can
        also bring proceedings in your local courts.
      </p>
    </PolicyPage>
  );
}
