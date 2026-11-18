import type { Metadata, Viewport } from "next";
import "./globals.css";
import { store } from "@/config/store";
import { siteUrl } from "@/lib/env";
import { display, sans } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${store.name} — ${store.tagline}`, template: `%s | ${store.name}` },
  description: store.description,
  openGraph: { siteName: store.name, locale: "en_GB", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

// Applies the saved theme before first paint, so there's no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('bp_theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
