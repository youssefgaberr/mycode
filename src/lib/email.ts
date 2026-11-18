/**
 * Email sending. Uses Resend when RESEND_API_KEY is set; otherwise prints the
 * email to the server log (handy in development and before you set up a
 * sending domain).
 */
import { Resend } from "resend";
import { store } from "@/config/store";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/pricing";
import { marketConfig } from "@/config/store";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ sent: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email:placeholder] To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return { sent: false };
  }
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM || `${store.name} <onboarding@resend.dev>`;
  const { data, error } = await resend.emails.send({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return { sent: true, id: data?.id };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="en-GB"><body style="margin:0;background:#f6f1e7;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="font-size:20px;font-weight:800;margin:0 0 16px">${esc(store.name)}</p>
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>
${body}
<p style="font-size:12px;color:#57534e;margin-top:28px">${esc(store.company.legalName)} · ${esc(store.company.address)} · ${esc(store.company.email)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

interface EmailOrder {
  number: string;
  market?: string;
  customerName: string | null;
  totalPence: number;
  deliveryPence: number;
  discountPence: number;
  items: { title: string; variantName: string; quantity: number; unitPricePence: number }[];
}

export function orderConfirmationEmail(order: EmailOrder & { email: string }): EmailMessage {
  const m = marketConfig(order.market);
  const formatGBP = (minor: number) => formatMoney(minor, m);
  const first = order.customerName?.split(" ")[0] ?? "there";
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} × ${esc(i.title)}${i.variantName !== "Standard" ? ` — ${esc(i.variantName)}` : ""}</td><td align="right">${formatGBP(i.unitPricePence * i.quantity)}</td></tr>`,
    )
    .join("");
  const html = layout(
    `Thanks for your order, ${first}!`,
    `<p>We've received your order <strong>${esc(order.number)}</strong> and we're getting it ready. We'll email you tracking details as soon as it ships.</p>
<table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #e7e0d2;margin-top:16px">${rows}
${order.discountPence ? `<tr><td style="padding:6px 0;color:#15803d">Multi-buy discount</td><td align="right" style="color:#15803d">−${formatGBP(order.discountPence)}</td></tr>` : ""}
<tr><td style="padding:6px 0">Delivery</td><td align="right">${order.deliveryPence ? formatGBP(order.deliveryPence) : "Free"}</td></tr>
<tr><td style="padding:6px 0;font-weight:700;border-top:1px solid #e7e0d2">Total paid${m.pricesIncludeTax ? " (incl. VAT)" : ""}</td><td align="right" style="font-weight:700;border-top:1px solid #e7e0d2">${formatGBP(order.totalPence)}</td></tr></table>
<p style="font-size:14px">You can cancel within 14 days of delivery — see our <a href="${siteUrl()}/returns">returns policy</a>.</p>`,
  );
  const text = `Thanks for your order, ${first}!\n\nOrder ${order.number}\n${order.items
    .map((i) => `${i.quantity} x ${i.title} — ${formatGBP(i.unitPricePence * i.quantity)}`)
    .join("\n")}\nTotal paid: ${formatGBP(order.totalPence)}\n\nWe'll email tracking details when it ships.\nReturns: ${siteUrl()}/returns`;
  return { to: order.email, subject: `Your ${store.name} order ${order.number}`, html, text };
}

export function shippedEmail(args: {
  email: string;
  number: string;
  customerName: string | null;
  trackingNumber: string;
  trackingUrl: string | null;
  carrier: string | null;
  items: string[];
  partial: boolean;
}): EmailMessage {
  const first = args.customerName?.split(" ")[0] ?? "there";
  const track = args.trackingUrl
    ? `<a href="${esc(args.trackingUrl)}">${esc(args.trackingNumber)}</a>`
    : `<strong>${esc(args.trackingNumber)}</strong>`;
  const html = layout(
    args.partial ? "Part of your order is on its way" : "Your order is on its way",
    `<p>Hi ${esc(first)}, good news — ${args.partial ? "some items from" : ""} your order <strong>${esc(args.number)}</strong> ${args.partial ? "have" : "has"} shipped.</p>
<p>Tracking number: ${track}${args.carrier ? ` (${esc(args.carrier)})` : ""}</p>
<ul>${args.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
${args.partial ? "<p>The rest of your order ships separately — we'll email you again when it does.</p>" : ""}
<p style="font-size:14px">Tracking can take a day or two to show updates. Any questions? Just reply or email ${esc(store.company.email)}.</p>`,
  );
  const text = `Hi ${first}, your order ${args.number} has shipped.\nTracking: ${args.trackingNumber}${args.carrier ? ` (${args.carrier})` : ""}${args.trackingUrl ? `\n${args.trackingUrl}` : ""}\n\n${args.items.join("\n")}`;
  return { to: args.email, subject: `Your ${store.name} order ${args.number} has shipped`, html, text };
}
