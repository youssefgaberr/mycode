import type { CategorySlug } from "@/config/store";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRODUCT CONTENT — our own titles and descriptions.
 * ─────────────────────────────────────────────────────────────────────────────
 *  `npm run import` searches CJdropshipping for each entry below, picks the
 *  best match and stores it with THIS copy. Supplier text is never shown to
 *  customers. Facts that vary by listing (size, capacity, materials) come from
 *  CJ's structured data and appear in the specifications table instead.
 *
 *  Writing rules: plain UK English; describe what the product does; no health,
 *  safety, "non-toxic", "BPA-free" or "dishwasher-safe" claims unless you
 *  have confirmed them for the exact product you are selling.
 *
 *  To add a product: copy an entry, give it a new `key`, write the copy, set
 *  the search terms and match rules, then run `npm run import`. If you already
 *  know the exact CJ product, set `cjProductId` and the search is skipped.
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
    category: "cooking",
    searchTerms: ["silicone air fryer liner", "air fryer silicone pot"],
    match: {
      all: [["air fryer", "airfryer", "air-fryer"], ["silicone"], ["liner", "pot", "basket", "mat", "tray", "pad", "bowl"]],
      none: ["paper", "disposable", "parchment", "oil sprayer", "brush"],
      prefer: ["reusable", "liner", "foldable"],
    },
    title: "Reusable Silicone Air Fryer Liner",
    summary: "A flexible liner that sits in your air fryer basket and catches the mess.",
    description:
      "Pop this liner into your air fryer basket before you cook and the crumbs, grease and sauce end up in the liner rather than the basket. When you're done, lift it out, give it a wash and it's ready for next time.\n\nThe raised sides help keep juices in place and the handles make it easy to lift out once it has cooled. Because it's reusable, there's no need to keep buying paper liners.\n\nCheck the size in the specifications below against your air fryer basket before ordering.",
    bullets: [
      "Keeps your air fryer basket cleaner",
      "Reusable — wash and use again",
      "Raised edges hold in juices and sauces",
      "Folds or squashes down for storage",
    ],
  },
  {
    key: "usb-food-chopper",
    category: "prep",
    searchTerms: ["electric garlic chopper usb", "mini electric food chopper", "wireless food chopper"],
    match: {
      all: [["chopper", "garlic", "mincer", "food processor", "masher"], ["electric", "usb", "rechargeable", "cordless", "wireless"]],
      none: ["manual", "hand pull", "pull rope", "meat grinder", "coffee", "juicer"],
      prefer: ["mini", "garlic", "usb", "wireless"],
    },
    title: "Cordless Mini Food Chopper",
    summary: "A small rechargeable chopper for garlic, onion, herbs and nuts.",
    description:
      "Skip the chopping board for the small jobs. Drop in a few garlic cloves, a shallot or a handful of herbs, press the button and the blades do the work in seconds.\n\nIt charges by USB, so there's no cable trailing across the worktop while you use it, and it's compact enough to live in a drawer. The bowl comes apart for washing.\n\nIdeal for small quantities: sauces, marinades, salsas and baby portions. See the specifications for the bowl size.",
    bullets: [
      "USB rechargeable — no cable while you chop",
      "Handles garlic, onion, herbs, chilli and nuts",
      "Compact enough for a kitchen drawer",
      "Bowl and blades come apart for cleaning",
    ],
  },
  {
    key: "milk-frother",
    category: "drinks",
    searchTerms: ["handheld milk frother", "electric milk frother whisk"],
    match: {
      all: [["frother", "foamer", "froth", "milk whisk"]],
      none: ["pitcher", "jug", "machine", "steam", "cup", "stainless steel pot"],
      prefer: ["handheld", "electric", "rechargeable", "usb", "whisk"],
    },
    title: "Handheld Milk Frother",
    summary: "Whip up foamy milk for lattes, cappuccinos and hot chocolate.",
    description:
      "Turn a mug of warm milk into a café-style topping in a few seconds. Hold the whisk just under the surface, switch on and move it gently until the foam builds up.\n\nIt's just as handy for whisking matcha, protein shakes, instant coffee or a single egg. Rinse the whisk under the tap afterwards and it's clean.\n\nSmall and light, it fits in a cup or a drawer.",
    bullets: [
      "Froths milk for lattes, cappuccinos and hot chocolate",
      "Also mixes matcha, shakes and instant drinks",
      "One-button operation",
      "Rinse clean under the tap",
    ],
  },
  {
    key: "fridge-organiser-bins",
    category: "storage",
    searchTerms: ["fridge organizer bin", "refrigerator storage box stackable", "fridge storage container"],
    match: {
      all: [["fridge", "refrigerator"], ["organizer", "organiser", "storage box", "bin", "container", "drawer", "basket", "storage rack"]],
      none: ["magnet", "sticker", "deodor", "thermometer", "egg", "freezer bag", "filter"],
      prefer: ["stackable", "clear", "transparent", "drawer", "handle"],
    },
    title: "Clear Fridge Organiser Bins",
    summary: "Stackable clear bins that keep your fridge shelves tidy.",
    description:
      "Group your yoghurts, sauces, cheeses and snacks into clear bins and you'll always see what you've got. Slide a bin out and everything comes with it, so nothing gets lost at the back of the shelf.\n\nThey also work well in kitchen cupboards, the pantry or the bathroom.\n\nPlease check the dimensions in the specifications below against your fridge shelves.",
    bullets: [
      "See what's inside at a glance",
      "Slide out to reach the back of the shelf",
      "Helps group foods and use them up",
      "Also handy in cupboards and the pantry",
    ],
  },
  {
    key: "oil-spray-bottle",
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
    category: "prep",
    searchTerms: ["herb scissors 5 blade", "multi blade kitchen scissors", "scallion scissors"],
    match: {
      all: [["scissor", "shear"]],
      none: ["hair", "nail", "pet", "pruning", "garden", "fabric", "tailor", "barber", "thinning"],
      prefer: ["herb", "blade", "layer", "multi", "scallion", "onion", "shredded"],
    },
    title: "Multi-Blade Herb Scissors",
    summary: "Snip fresh herbs straight into the pan with several blades at once.",
    description:
      "Several blades side by side mean one snip does the work of several. Cut chives, parsley, coriander, basil or spring onions straight over the pan or plate — no chopping board to wash.\n\nMany sets come with a cleaning comb for clearing bits from between the blades; see the listing details for what's included.\n\nPlease handle with care: the blades are sharp.",
    bullets: [
      "Several blades for fast, fine snipping",
      "Cut herbs straight over the pan or plate",
      "Great for chives, spring onions and coriander",
      "Less washing up than a knife and board",
    ],
  },
  {
    key: "silicone-baking-mat",
    category: "baking",
    searchTerms: ["silicone baking mat", "non stick silicone baking sheet", "macaron silicone mat"],
    match: {
      all: [["silicone"], ["baking", "bake", "pastry", "macaron", "oven", "cookie"], ["mat", "sheet", "liner", "pad"]],
      none: ["air fryer", "glove", "cup", "mould", "mold", "trivet", "brush", "spatula"],
      prefer: ["baking mat", "reusable", "non stick", "non-stick"],
    },
    title: "Reusable Silicone Baking Mat",
    summary: "Swap baking paper for a mat you can wash and use again.",
    description:
      "Lay this mat on your baking tray instead of baking paper or greasing. Biscuits, roasted veg and pastries lift off easily, and the tray stays cleaner.\n\nSome mats have measurement guides printed on them, which help when rolling out dough or piping macarons evenly — see the photos for the version you'll receive.\n\nWash, dry and roll it up for storage. Check the size in the specifications against your trays.",
    bullets: [
      "Replaces baking paper — wash and reuse",
      "Food lifts off easily",
      "Helps keep baking trays clean",
      "Rolls up for storage",
    ],
  },
  {
    key: "vegetable-spiralizer",
    category: "prep",
    searchTerms: ["handheld vegetable spiralizer", "spiral slicer vegetable", "vegetable spiralizer"],
    match: {
      all: [["spiral", "spiraliz", "spiralis"]],
      none: ["potato tower", "hair", "electric drill", "notebook"],
      prefer: ["handheld", "vegetable", "zucchini", "courgette"],
    },
    title: "Handheld Vegetable Spiralizer",
    summary: "Turn courgettes, carrots and cucumbers into ribbons and spirals.",
    description:
      "Twist a courgette, carrot or cucumber through the spiralizer and it comes out in long ribbons — perfect for courgetti, colourful salads or garnishes.\n\nIt's compact and needs no power, so it fits in a drawer. Use the food holder supplied (where included) to protect your fingers, and take care with the blades when cleaning.",
    bullets: [
      "Makes courgetti and vegetable ribbons",
      "Works with courgettes, carrots, cucumbers and more",
      "Compact, no power needed",
      "Fits in a kitchen drawer",
    ],
  },
];

export function contentByKey(key: string): ProductContent | undefined {
  return productContent.find((c) => c.key === key);
}
