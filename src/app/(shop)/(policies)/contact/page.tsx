import type { Metadata } from "next";
import { store } from "@/config/store";
import { Address, Company, Email, PolicyPage } from "@/components/policy/Policy";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <PolicyPage title="Contact us" updated="[DATE]">
      <p>Questions about an order, a product or a return? We&apos;re happy to help.</p>

      <h2>Email</h2>
      <p>
        <Email />
      </p>
      <p>Please include your order number (it starts with BP-) if you have one. We aim to reply within 1 working day.</p>

      <h2>Address</h2>
      <p>
        <Company />
        <br />
        <Address />
      </p>
      <p className="text-sm text-muted">
        Please don&apos;t send returns to this address unless we ask you to — see our returns policy for the returns
        address.
      </p>

      <h2>About {store.name}</h2>
      <p>{store.description}</p>
    </PolicyPage>
  );
}
