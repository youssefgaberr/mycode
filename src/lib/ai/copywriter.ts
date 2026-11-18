/**
 * AI product copy: writes an original title, summary, description and
 * bullets for a CJ product, and screens out items the store shouldn't sell.
 *
 * Uses the Claude API (needs ANTHROPIC_API_KEY). Roughly $0.02 per product.
 * Supplier text is given to the model as reference only; the output is new
 * copy in plain English with no unverifiable claims.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { store } from "@/config/store";

const MODEL = "claude-opus-5-5";
const CATEGORY_SLUGS = store.categories.map((c) => c.slug) as [string, ...string[]];

export const CopySchema = z.object({
  sellable: z.boolean(),
  reason: z.string(),
  category: z.enum(CATEGORY_SLUGS),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
});
export type ProductCopy = z.infer<typeof CopySchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sellable", "reason", "category", "title", "summary", "description", "bullets"],
  properties: {
    sellable: {
      type: "boolean",
      description: "false if the product falls into any excluded group (see instructions)",
    },
    reason: { type: "string", description: "One short sentence: why it is or isn't sellable" },
    category: { type: "string", enum: CATEGORY_SLUGS },
    title: { type: "string", description: "Product title, 3-7 words, Title Case, no brand names" },
    summary: { type: "string", description: "One sentence, max 110 characters" },
    description: {
      type: "string",
      description: "2-3 short paragraphs separated by a blank line (\\n\\n), 60-140 words in total",
    },
    bullets: { type: "array", items: { type: "string" }, description: "Exactly 4 short feature bullets" },
  },
} as const;

const SYSTEM = `You write product copy for ${store.name}, an online shop selling practical gadgets to customers in the UK and the US.

You receive raw supplier data for one product from a dropshipping catalogue. Supplier titles and descriptions are often machine-translated, keyword-stuffed and sometimes copied from other brands. Use them only to understand what the product is and does.

Write ORIGINAL copy:
- Plain, friendly British English (customers in the US read it too, so avoid UK-only slang). No hype words ("revolutionary", "must-have", "game-changer"), no emojis, no ALL CAPS.
- Describe what the product is and how it's used. Never copy phrases from the supplier text.
- Do not state specific numbers (capacity, battery life, wattage, dimensions, materials) unless they appear in the structured data provided; the store shows a specifications table separately, so you can say "see the specifications for size".
- No health, medical, safety, therapeutic, weight-loss, eco or "non-toxic/BPA-free/food-grade/dishwasher-safe" claims.
- No brand or trademark names (even if the supplier uses them), no "compatible with <brand>" claims.

Categories: ${store.categories.map((c) => `${c.slug} = ${c.name}`).join("; ")}.

Set sellable=false (and still fill the other fields briefly) if the product is ANY of:
- a knife, blade, razor, weapon, self-defence item, or anything sharp sold mainly as a blade
- a medical device or health product (thermometers, posture correctors, braces, massagers making health claims, supplements, medicines)
- a cosmetic, skincare, haircare or anything applied to skin/hair/nails
- a toy or product designed for children or babies
- mains-powered electrical with a plug (USB or battery powered is fine)
- a lithium battery or power bank sold on its own
- an imitation of a branded product, or bearing someone else's logo/character
- adult, smoking/vaping, alcohol, gambling, or otherwise age-restricted
- clothing or footwear, jewellery, or anything outside: kitchen & dining, home & organisation, fitness/outdoor/travel, pets, car accessories`;

export interface CopyInput {
  cjName: string;
  cjCategory?: string | null;
  supplierDescription?: string | null;
  materials?: string[];
  options?: string[];
  specs?: { label: string; value: string }[];
}

function stripHtml(html: string) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let client: Anthropic | null = null;
export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Returns new copy, or null if the model declined. Throws on API errors. */
export async function writeProductCopy(input: CopyInput): Promise<ProductCopy | null> {
  client ??= new Anthropic();
  // The supplier description is reference material only; a long one is cut to
  // an excerpt (and labelled as such) to keep the request small.
  const desc = input.supplierDescription ? stripHtml(input.supplierDescription) : "";
  const excerpt = desc.length > 3000 ? `${desc.slice(0, 3000)} … [excerpt]` : desc;
  const lines = [
    `Supplier product name: ${input.cjName}`,
    input.cjCategory ? `Supplier category: ${input.cjCategory}` : "",
    input.materials?.length ? `Materials: ${input.materials.join(", ")}` : "",
    input.options?.length ? `Options available: ${input.options.join(", ")}` : "",
    input.specs?.length ? `Structured data:\n${input.specs.map((s) => `- ${s.label}: ${s.value}`).join("\n")}` : "",
    excerpt ? `Supplier description (reference only, do not copy):\n${excerpt}` : "",
  ].filter(Boolean);

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: jsonSchema } },
    system: SYSTEM,
    messages: [{ role: "user", content: lines.join("\n\n") }],
  });

  if (response.stop_reason === "refusal") return null;
  if (response.stop_reason === "max_tokens") throw new Error("Copy was cut off (max_tokens)");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No copy returned");
  const parsed = CopySchema.safeParse(JSON.parse(text.text));
  if (!parsed.success) throw new Error(`Copy didn't match the schema: ${parsed.error.issues[0]?.message}`);
  const copy = parsed.data;
  copy.bullets = copy.bullets.slice(0, 5);
  return copy;
}
