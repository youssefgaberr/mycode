import { db } from "@/lib/db";

/**
 * Streams a CJ product video. CJ's video host rejects requests without its
 * Referer header, so browsers can't play the URL directly. Range requests are
 * passed through so seeking works (Safari requires this). Responses are
 * cacheable so a CDN (e.g. Vercel's) can serve repeat views.
 */
const ALLOWED_HOST = /(^|\.)cjdropshipping\.com$/;

export async function GET(request: Request, ctx: RouteContext<"/api/video/[id]">) {
  const { id } = await ctx.params;
  const video = await db.productVideo.findUnique({ where: { id } });
  if (!video) return new Response("Not found", { status: 404 });

  let url: URL;
  try {
    url = new URL(video.url);
  } catch {
    return new Response("Bad video URL", { status: 502 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOST.test(url.hostname)) {
    return new Response("Video host not allowed", { status: 403 });
  }

  const headers: Record<string, string> = { Referer: "https://developers.cjdropshipping.com/" };
  const range = request.headers.get("range");
  if (range) headers.Range = range;

  const upstream = await fetch(url, { headers, cache: "no-store" });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Video unavailable", { status: 502 });
  }

  const out = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  if (!out.has("content-type")) out.set("content-type", "video/mp4");
  out.set("cache-control", "public, max-age=86400, s-maxage=604800");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
