/**
 * Environment helpers. Secrets are read lazily so the app can build without
 * them; features that need a missing secret fail with a clear message.
 */

export type StoreMode = "test" | "live";

export function storeMode(): StoreMode {
  return process.env.STORE_MODE === "live" ? "live" : "test";
}

export function isLive(): boolean {
  return storeMode() === "live";
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing environment variable ${name}. Add it to .env.local (see .env.example).`);
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}
