import { NextResponse, type NextRequest } from "next/server";

/**
 * First visit: pick the market from the visitor's country (Vercel adds
 * x-vercel-ip-country). US visitors see dollars; everyone else pounds.
 * The £/$ switch in the header overrides this and is remembered.
 */
export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get("bp_market")) {
    const country = request.headers.get("x-vercel-ip-country");
    if (country) {
      res.cookies.set("bp_market", country === "US" ? "US" : "GB", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }
  return res;
}

export const config = {
  // Pages only — not API routes, Next.js assets or files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|demo/|.*\\..*).*)"],
};
