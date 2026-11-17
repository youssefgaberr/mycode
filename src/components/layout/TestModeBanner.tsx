import { isLive } from "@/lib/env";
import { hasDemoProducts } from "@/lib/catalog";

/** Visible reminder that the shop is in test mode (and/or showing demo data). */
export async function TestModeBanner() {
  if (isLive()) return null;
  const demo = await hasDemoProducts();
  return (
    <div role="note" className="bg-accent px-4 py-2 text-center text-sm font-medium text-accent-fg">
      Test mode — payments use Stripe test cards and supplier orders are sandbox only.
      {demo && " Showing demo products; run npm run import to load real ones."}
    </div>
  );
}
