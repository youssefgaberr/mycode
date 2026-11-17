import type { Metadata } from "next";
import { store } from "@/config/store";
import { Address, Company, Email, PolicyPage } from "@/components/policy/Policy";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy policy" updated="[DATE]">
      <p>
        This policy explains how <Company /> (&quot;we&quot;, trading as {store.name}) uses your personal data. We are
        the data controller. Contact us at <Email /> or <Address />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, email address, phone number and delivery address when you place an order.</li>
        <li>What you ordered, how much you paid and your order history.</li>
        <li>Messages you send us.</li>
        <li>
          Payment card details are entered directly into Stripe&apos;s secure checkout. We never see or store your full
          card number.
        </li>
      </ul>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>
          <strong>To fulfil your order</strong> — taking payment, arranging delivery, sending order and tracking emails,
          and handling returns (performance of a contract).
        </li>
        <li>
          <strong>To meet legal obligations</strong> — for example keeping tax and accounting records.
        </li>
        <li>
          <strong>To run and protect our business</strong> — preventing fraud and keeping our site secure (legitimate
          interests).
        </li>
      </ul>
      <p>We don&apos;t send marketing emails unless you&apos;ve opted in, and we don&apos;t sell your data.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Stripe</strong> — to process payments.
        </li>
        <li>
          <strong>CJdropshipping</strong>, our fulfilment partner — receives your name, delivery address and phone
          number so it can pack and ship your order. It operates warehouses in several countries, including outside the
          UK (for example in China). Where data leaves the UK we rely on appropriate safeguards such as the UK
          International Data Transfer Addendum.
        </li>
        <li>
          <strong>Delivery companies</strong> — your name, address and phone number, to deliver your parcel.
        </li>
        <li>
          <strong>Our email provider</strong> (Resend) and <strong>hosting provider</strong> (Vercel) — to send emails
          and run this website.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep order records for 6 years after the end of the financial year they relate to, as required for tax
        purposes. Other data is deleted when it&apos;s no longer needed.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We don&apos;t use advertising or analytics cookies. Your browser stores your basket contents and light/dark
        theme choice on your own device so the site works. Stripe&apos;s checkout page uses its own cookies for security
        and fraud prevention.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, object to or restrict how we use it, or ask for a copy to take
        elsewhere. Email <Email />. If you&apos;re unhappy with how we&apos;ve handled your data, you can complain to the
        Information Commissioner&apos;s Office (ico.org.uk).
      </p>
    </PolicyPage>
  );
}
