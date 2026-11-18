import type { CategorySlug } from "@/config/store";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRODUCT CONTENT — our own titles and descriptions.
 * ─────────────────────────────────────────────────────────────────────────────
 *  `npm run import` (or "Import products from CJ" in /admin/products) loads
 *  each entry below from CJdropshipping and stores it with THIS copy. Supplier
 *  text is never shown to customers. Facts that vary by listing (size,
 *  materials, options) come from CJ's structured data and appear in the
 *  specifications table instead.
 *
 *  Each entry is pinned to the exact CJ listing (`cjProductId`) chosen after
 *  checking CJ's catalogue, so imports always fetch that product. The copy is
 *  written to match those listings. If you change a `cjProductId`, re-check
 *  the copy against the new item.
 *
 *  Writing rules: plain UK English; describe what the product does; no health,
 *  safety, "non-toxic", "BPA-free" or "dishwasher-safe" claims, and no specs
 *  (capacity, battery, charging) unless you've confirmed them for the exact
 *  product you are selling.
 *
 *  To add a product: copy an entry, give it a new `key`, write the copy, set
 *  `cjProductId` (find it with "Search CJ" in /admin/sourcing) or the search
 *  terms and match rules, then import.
 */

export interface ProductContent {
  key: string;
  /** Optional: pin an exact CJ product ID (pid) instead of searching. */
  cjProductId?: string;
  category: CategorySlug;
  searchTerms: string[];
  match: {
    /** Every group must match: at least one phrase from each group appears in CJ's English name. */
    all: string[][];
    /** Reject products whose name contains any of these. */
    none?: string[];
    /** Phrases that make a product a better match. */
    prefer?: string[];
  };
  title: string;
  /** One sentence for product cards. */
  summary: string;
  /** Paragraphs separated by a blank line. */
  description: string;
  bullets: string[];
}

export const productContent: ProductContent[] = [
  {
    key: "air-fryer-liners",
    // CJ: "Air Fryer Silicone Pot Replacement Of Parchment Paper Liners…"
    cjProductId: "1435061247828692992",
    category: "cooking",
    searchTerms: ["silicone air fryer liner", "air fryer silicone pot"],
    match: {
      all: [["air fryer", "airfryer", "air-fryer"], ["silicone"], ["liner", "pot", "basket", "mat", "tray", "pad", "bowl"]],
      none: ["disposable", "oil sprayer", "brush"],
      prefer: ["reusable", "liner", "foldable"],
    },
    title: "Reusable Silicone Air Fryer Liner",
    summary: "A silicone pot that sits in your air fryer basket and catches the mess.",
    description:
      "Pop this silicone pot into your air fryer basket before you cook and the crumbs, grease and sauce end up in the liner rather than the basket. When you're done, lift it out, give it a wash and it's ready for next time.\n\nIts raised sides help keep juices in place, and because it's reusable there's no need to keep buying paper liners.\n\nThere are several sizes and colours — check the options and the size in the specifications against your air fryer basket before ordering.",
    bullets: [
      "Keeps your air fryer basket cleaner",
      "Reusable — wash and use again",
      "Raised sides hold in juices and sauces",
      "Choice of sizes and colours",
    ],
  },
  {
    key: "usb-food-chopper",
    // CJ: "Multifunctional Household Slice Electric Garlic Pounding Chopper"
    cjProductId: "1716721556694511616",
    category: "prep",
    searchTerms: ["electric garlic chopper usb", "mini electric food chopper", "wireless food chopper"],
    match: {
      all: [["chopper", "garlic", "mincer", "food processor", "masher"], ["electric", "usb", "rechargeable", "cordless", "wireless"]],
      none: ["manual", "hand pull", "pull rope", "meat grinder", "coffee", "juicer"],
      prefer: ["mini", "garlic", "usb", "wireless"],
    },
    title: "Electric Mini Garlic & Food Chopper",
    summary: "A compact electric chopper for garlic, onion, herbs and nuts.",
    description:
      "Skip the chopping board for the small jobs. Drop in a few garlic cloves, a shallot or a handful of herbs, press the button and the blades do the work in seconds.\n\nIt's compact enough to live in a drawer, and the bowl comes apart for washing.\n\nIdeal for small quantities: sauces, marinades, salsas and dressings. See the options and specifications for sizes and power details.",
    bullets: [
      "Chops garlic, onion, herbs, chilli and nuts in seconds",
      "One-touch electric operation",
      "Compact enough for a kitchen drawer",
      "Bowl and blades come apart for cleaning",
    ],
  },
  {
    key: "milk-frother",
    // CJ: "Modern Minimalist Handheld Electric Milk Powder Stirrer"
    cjProductId: "2408020406281627600",
    category: "drinks",
    searchTerms: ["handheld milk frother", "electric milk frother whisk"],
    match: {
      all: [["frother", "foamer", "froth", "milk whisk", "stirrer"]],
      none: ["pitcher", "jug", "machine", "steam", "heater", "stainless steel pot"],
      prefer: ["handheld", "electric", "rechargeable", "usb", "whisk"],
    },
    title: "Handheld Milk Frother",
    summary: "Whip up foamy milk for lattes, cappuccinos and hot chocolate.",
    description:
      "Turn a mug of warm milk into a café-style topping in a few seconds. Hold the whisk just under the surface, switch on and move it gently until the foam builds up.\n\nIt's just as handy for mixing matcha, hot chocolate, protein shakes or instant coffee. Rinse the whisk under the tap afterwards and it's clean.\n\nSlim and light, it fits in a cup or a drawer.",
    bullets: [
      "Froths milk for lattes, cappuccinos and hot chocolate",
      "Also mixes matcha, shakes and instant drinks",
      "One-button operation",
      "Rinse clean under the tap",
    ],
  },
  {
    key: "fridge-organiser-bins",
    // CJ: "8 Grids Divided Serving Tray … Refrigerator Organizer"
    cjProductId: "1798298899103485952",
    category: "storage",
    searchTerms: ["fridge organizer box divided", "refrigerator storage box"],
    match: {
      all: [["fridge", "refrigerator"], ["organizer", "organiser", "storage box", "bin", "container", "drawer", "basket"]],
      none: ["magnet", "sticker", "deodor", "thermometer", "freezer bag", "filter"],
      prefer: ["divided", "grid", "compartment", "clear", "lid"],
    },
    title: "Divided Fridge & Snack Organiser",
    summary: "One box, eight compartments — keep fruit, snacks and sauces sorted.",
    description:
      "Give small foods a home. This organiser box is split into eight compartments, so berries, cheese, olives, dips and snacks each have their own space instead of rolling around the fridge shelf.\n\nIt's just as useful as a serving tray for picnics and snack boards, or for keeping seasonings and baking bits tidy in a cupboard.\n\nPlease check the dimensions in the specifications below against your fridge shelves.",
    bullets: [
      "Eight separate compartments",
      "Keeps fruit, snacks and sauces sorted",
      "Doubles as a snack or serving tray",
      "Also handy in cupboards and the pantry",
    ],
  },
  {
    key: "oil-spray-bottle",
    // CJ: "2 In 1 Oil Sprayer Bottle BBQ Cooking Oil Dispenser Olive Oil Pourers Sprayer…"
    cjProductId: "1715574082122551296",
    category: "cooking",
    searchTerms: ["2 in 1 oil sprayer bottle", "oil spray dispenser kitchen", "olive oil sprayer"],
    match: {
      all: [["oil"], ["spray", "sprayer", "mister", "dispenser", "bottle"]],
      none: ["perfume", "hair", "plant", "garden", "massage", "essential oil", "car"],
      prefer: ["2 in 1", "2-in-1", "2in1", "pour", "spray"],
    },
    title: "2-in-1 Oil Sprayer and Pourer",
    summary: "Spray a light mist or pour a little — one bottle, two ways.",
    description:
      "Use the spray to mist oil evenly over salads, roasting veg or the air fryer basket, or tip the bottle to pour when a recipe calls for more. It's an easy way to keep track of how much oil you're using.\n\nFill it with olive, rapeseed or sunflower oil, or with vinegar for dressings.\n\nSee the specifications for capacity and materials.",
    bullets: [
      "Spray or pour from the same bottle",
      "Even mist for salads, roasting and air frying",
      "Works with oil or vinegar",
      "Refillable",
    ],
  },
  {
    key: "herb-scissors",
    // CJ: "Kitchen Multi-function Bottle Opener Kitchen Auxiliary Scissors"
    // (CJ had no multi-blade herb scissors when this was chosen.)
    cjProductId: "1761573015550169088",
    category: "prep",
    searchTerms: ["kitchen scissors multifunction", "herb scissors"],
    match: {
      all: [["scissor", "shear"]],
      none: ["hair", "nail", "pet", "pruning", "garden", "fabric", "tailor", "barber", "thinning"],
      prefer: ["kitchen", "herb", "multi", "bottle opener"],
    },
    title: "Multi-Function Kitchen Scissors",
    summary: "Everyday kitchen scissors with a built-in bottle opener.",
    description:
      "A sturdy pair of kitchen scissors for the jobs a knife makes fiddly: snipping herbs and spring onions, trimming bacon, opening food packets and cutting string.\n\nThe built-in bottle opener saves hunting for one in the drawer.\n\nPlease handle with care: the blades are sharp. See the photos and specifications for the exact design you'll receive.",
    bullets: [
      "Snip herbs, spring onions and packaging",
      "Built-in bottle opener",
      "Handy alternative to a knife and board",
      "Lives happily in a kitchen drawer",
    ],
  },
  {
    key: "silicone-baking-mat",
    // CJ: "Non-Stick Silicone Pyramid Cooking Mat Baking Mat With Grid…"
    cjProductId: "ECAC663E-87ED-4D84-B320-A8E7FD76AE41",
    category: "baking",
    searchTerms: ["silicone baking mat", "silicone pyramid baking mat"],
    match: {
      all: [["silicone"], ["baking", "bake", "pastry", "oven", "cooking"], ["mat", "sheet", "liner", "pad"]],
      none: ["air fryer", "glove", "cup", "mould", "mold", "trivet", "brush", "spatula", "pet", "dog", "cat"],
      prefer: ["baking mat", "reusable", "non stick", "non-stick"],
    },
    title: "Silicone Pyramid Roasting & Baking Mat",
    summary: "A reusable mat with a raised surface for roasting and baking.",
    description:
      "Lay this mat on your baking tray and cook on top of it. The raised pyramid surface lets air circulate under your food and lets fat run away from it, so oven chips, wings, bacon and roasted veg crisp up nicely.\n\nIt's a reusable alternative to baking paper and foil — wash, dry and roll it up for storage.\n\nThere's a choice of sizes and colours; check the size in the specifications against your trays.",
    bullets: [
      "Raised pyramid surface lets fat drain away",
      "Reusable alternative to baking paper and foil",
      "Choice of sizes and colours",
      "Rolls up for storage",
    ],
  },
  {
    key: "vegetable-spiralizer",
    // CJ: "Vegetable Grater Potato Spiral Slicer Whirlwind Fruit Vegetable Spiral Machine…"
    cjProductId: "2409131134451623700",
    category: "prep",
    searchTerms: ["vegetable spiralizer", "spiral slicer vegetable"],
    match: {
      all: [["spiral", "spiraliz", "spiralis"]],
      none: ["potato tower", "hair", "electric drill", "notebook"],
      prefer: ["vegetable", "slicer", "zucchini", "courgette"],
    },
    title: "Vegetable Spiral Slicer",
    summary: "Turn potatoes, courgettes and carrots into spirals and ribbons.",
    description:
      "Turn everyday veg into something more fun. Feed a potato, courgette, carrot or cucumber through the spiral slicer and it comes out in long spirals and ribbons — perfect for spiral fries, courgetti, colourful salads and garnishes.\n\nSee the photos for how it works, use the food holder where supplied to keep fingers clear, and take care with the blades when cleaning.",
    bullets: [
      "Makes spiral fries, courgetti and veg ribbons",
      "Works with potatoes, courgettes, carrots and more",
      "Fun way to get more veg on the plate",
      "Take care: blades are sharp",
    ],
  },
];

export function contentByKey(key: string): ProductContent | undefined {
  return productContent.find((c) => c.key === key);
}
