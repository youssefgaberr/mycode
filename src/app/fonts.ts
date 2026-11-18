import localFont from "next/font/local";

/** Self-hosted (no Google Fonts request at build or runtime). */
export const display = localFont({
  src: [
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2", weight: "700" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const sans = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});
