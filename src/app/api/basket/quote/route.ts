import { basketInputSchema, priceBasket } from "@/lib/checkout";

export async function POST(request: Request) {
  const parsed = basketInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid basket" }, { status: 400 });
  const basket = await priceBasket(parsed.data);
  return Response.json(basket, { headers: { "Cache-Control": "no-store" } });
}
