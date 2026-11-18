type P = React.SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Brand mark: a frying pan with a spark. */
export const PanMark = (p: P) => (
  <svg viewBox="0 0 32 32" aria-hidden {...p}>
    <circle cx="13" cy="17" r="10" fill="currentColor" />
    <path d="M22 13.5 30 9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="13" cy="17" r="5.5" fill="var(--bg)" opacity=".9" />
    <path d="M24 3v4M22 5h4" stroke="var(--honey)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Cooking = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 22h26a0 0 0 0 1 0 0v4a10 10 0 0 1-10 10h-6A10 10 0 0 1 8 26v-4Z" />
    <path d="M34 25h7" />
    <path d="M16 16c0-3 3-3 3-6M23 16c0-3 3-3 3-6" />
  </svg>
);
const Prep = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="12" width="28" height="26" rx="5" />
    <circle cx="36" cy="16" r="2" />
    <path d="M16 22c2 3 6 3 8 0M15 30h14" />
  </svg>
);
const Drinks = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 18h22v10a10 10 0 0 1-10 10h-2a10 10 0 0 1-10-10V18Z" />
    <path d="M32 21h3a4 4 0 0 1 0 8h-3" />
    <path d="M16 12c0-2 2-2 2-4M23 12c0-2 2-2 2-4" />
  </svg>
);
const Storage = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="14" width="30" height="24" rx="4" />
    <path d="M9 22h30M20 18h8" />
    <path d="M14 10h20" />
  </svg>
);
const Baking = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 34 34 14" />
    <rect x="30" y="8" width="8" height="12" rx="3" transform="rotate(45 34 14)" />
    <rect x="10" y="28" width="8" height="12" rx="3" transform="rotate(45 14 34)" />
    <circle cx="14" cy="14" r="3" />
  </svg>
);

const Fitness = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 18v12M11 14v20M37 14v20M42 18v12M11 24h26" />
  </svg>
);
const Pets = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="14" cy="18" r="3.5" />
    <circle cx="22" cy="12" r="3.5" />
    <circle cx="30" cy="12" r="3.5" />
    <circle cx="36" cy="19" r="3.5" />
    <path d="M24 22c-6 0-11 8-11 12a5 5 0 0 0 7 4.5c2.5-1 5.5-1 8 0A5 5 0 0 0 35 34c0-4-5-12-11-12Z" />
  </svg>
);
const Car = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 30v-6l4-9a3 3 0 0 1 2.8-2h18.4a3 3 0 0 1 2.8 2l4 9v6" />
    <path d="M6 30h36v5H6z" />
    <circle cx="14" cy="37" r="3" />
    <circle cx="34" cy="37" r="3" />
    <path d="M10 24h28" />
  </svg>
);

export const categoryIcons: Record<string, (p: P) => React.JSX.Element> = {
  kitchen: Cooking,
  home: Storage,
  fitness: Fitness,
  pets: Pets,
  car: Car,
  // older slugs
  cooking: Cooking,
  prep: Prep,
  drinks: Drinks,
  storage: Storage,
  baking: Baking,
};

/** Soft background tints per category, from the brand palette. */
export const categoryTints: Record<string, string> = {
  kitchen: "bg-brand-soft text-brand",
  home: "bg-sage-soft text-sage",
  fitness: "bg-honey-soft text-accent-fg",
  pets: "bg-surface-3 text-fg",
  car: "bg-brand-soft text-brand",
};
