import type { Metadata } from "next";
import { store } from "@/config/store";
import { Address, Company, Email, Fill, PolicyPage } from "@/components/policy/Policy";

export const metadata: Metadata = { title: "Returns & refunds" };

export default function ReturnsPage() {
  return (
    <PolicyPage title="Returns & refunds" updated="[DATE]">
      <p>
        This policy explains your rights under the Consumer Contracts (Information, Cancellation and Additional Charges)
        Regulations 2013 and the Consumer Rights Act 2015. It doesn&apos;t affect your statutory rights.
      </p>

      <h2>Changed your mind? You have 14 days</h2>
      <p>
        You can cancel your order for any reason within <strong>14 days</strong> of the day you (or someone you
        nominate) receive the goods. If your order arrives in several parcels, the 14 days start from the day you
        receive the last one. You can also cancel any time before your order arrives.
      </p>

      <h2>How to cancel</h2>
      <p>
        Tell us clearly that you want to cancel, by emailing <Email /> with your name and order number. You can use the
        model cancellation form below, but you don&apos;t have to.
      </p>

      <h2>Sending items back</h2>
      <ul>
        <li>
          Send the items back within 14 days of telling us you&apos;re cancelling, to:{" "}
          <Fill value={store.company.returnsAddress} />.
        </li>
        <li>
          Unless the item is faulty or not as described, <strong>you pay the cost of returning it</strong>. We recommend
          a tracked service and keeping proof of postage.
        </li>
        <li>Please pack items carefully so they aren&apos;t damaged on the way back.</li>
      </ul>

      <h2>Your refund</h2>
      <ul>
        <li>
          We&apos;ll refund the price you paid for the items <strong>and our standard delivery charge</strong> for the
          original delivery.
        </li>
        <li>
          We&apos;ll refund you within 14 days of receiving the items back, or of you giving us evidence that you&apos;ve
          sent them, whichever is sooner. If you cancel before the items are sent, we&apos;ll refund within 14 days of
          you telling us.
        </li>
        <li>Refunds go back to the card or payment method you used.</li>
        <li>
          You may handle items as you would in a shop to check them. If an item has been used beyond that, we may reduce
          the refund to reflect the loss in value.
        </li>
        <li>If you cancel part of a multi-buy order, the refund reflects the discount applied to the returned items.</li>
      </ul>

      <h2>Items that can&apos;t be returned once opened</h2>
      <p>
        For hygiene reasons, sealed items that are not suitable for return once unsealed (for example items that come
        into direct contact with food and arrive in sealed packaging) can&apos;t be returned if the seal has been broken,
        unless they are faulty.
      </p>

      <h2>Faulty or not as described</h2>
      <p>
        If an item is faulty, damaged, or not as described, you have rights under the Consumer Rights Act 2015. Within
        30 days of delivery you can reject it for a full refund. After 30 days (and within 6 months) you&apos;re
        entitled to a repair or replacement, or a refund if that isn&apos;t possible. We&apos;ll cover reasonable return
        costs. Email <Email /> with your order number and, if possible, a photo of the problem.
      </p>

      <h2>Model cancellation form</h2>
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p>
          To: <Company />, <Address />, <Email />
        </p>
        <p>
          I/We hereby give notice that I/We cancel my/our contract of sale of the following goods: [items], ordered on
          [date] / received on [date].
        </p>
        <p>Order number: [order number]</p>
        <p>Name of consumer(s): [name]</p>
        <p>Address of consumer(s): [address]</p>
        <p>Signature of consumer(s) (only if this form is sent on paper): [signature]</p>
        <p>Date: [date]</p>
      </div>
    </PolicyPage>
  );
}
