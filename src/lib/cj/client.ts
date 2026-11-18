/**
 * CJdropshipping API v2 client (official API only — no scraping).
 * Docs: https://developers.cjdropshipping.com/en/api/api2/api/auth.html
 *
 * - Access tokens last 180 days; we cache them in the database (Setting table)
 *   so serverless functions don't request a new token on every call.
 * - CJ allows 1 request per second on the base plan, so calls are queued and
 *   spaced at least 1.1 s apart within a process.
 * - Errors are thrown as CjError with CJ's code and requestId (quote the
 *   requestId if you contact CJ support).
 */
import { db } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import type {
  CjFreightOption,
  CjInventoryByPid,
  CjListV2Data,
  CjOrderCreateRequest,
  CjOrderCreateResult,
  CjOrderDetail,
  CjProductDetail,
  CjVideo,
} from "./types";

const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";
const MIN_INTERVAL_MS = 1100;
const TOKEN_KEY = "cj_token";

export class CjError extends Error {
  constructor(
    message: string,
    public code?: number,
    public requestId?: string,
    public httpStatus?: number,
  ) {
    super(message);
    this.name = "CjError";
  }
}

interface CjEnvelope<T> {
  code?: number;
  result?: boolean;
  success?: boolean;
  message?: string;
  data: T;
  requestId?: string;
}

interface StoredToken {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
}

// ── rate limiting ───────────────────────────────────────────────────────────
let queue: Promise<void> = Promise.resolve();
let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });
  queue = next.catch(() => undefined);
  return next;
}

function isOk(json: CjEnvelope<unknown>): boolean {
  if (json.result === false || json.success === false) return false;
  return json.code === 200 || json.success === true || json.result === true;
}

async function rawCall<T>(
  path: string,
  init: { method: "GET" | "POST"; token?: string; query?: Record<string, unknown>; body?: unknown },
): Promise<CjEnvelope<T>> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
    else url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers["CJ-Access-Token"] = init.token;

  for (let attempt = 0; ; attempt++) {
    await throttle();
    const res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    let json: CjEnvelope<T>;
    try {
      json = (await res.json()) as CjEnvelope<T>;
    } catch {
      throw new CjError(`CJ returned a non-JSON response (HTTP ${res.status})`, undefined, undefined, res.status);
    }
    // Rate limited: back off and try again (the request was rejected, so this is safe).
    if ((res.status === 429 || json.code === 1600200) && attempt < 3) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    return json;
  }
}

// ── authentication ──────────────────────────────────────────────────────────
async function loadToken(): Promise<StoredToken | null> {
  const row = await db.setting.findUnique({ where: { key: TOKEN_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as StoredToken;
  } catch {
    return null;
  }
}

async function saveToken(token: StoredToken) {
  const value = JSON.stringify(token);
  await db.setting.upsert({ where: { key: TOKEN_KEY }, create: { key: TOKEN_KEY, value }, update: { value } });
}

const validFor = (iso: string | undefined, ms: number) =>
  !!iso && new Date(iso).getTime() - Date.now() > ms;

const DAY = 24 * 60 * 60 * 1000;

export async function getAccessToken(forceNew = false): Promise<string> {
  // Optional: a token you obtained yourself (skips the key → token exchange).
  if (process.env.CJ_ACCESS_TOKEN) return process.env.CJ_ACCESS_TOKEN;
  const stored = forceNew ? null : await loadToken();
  if (stored && validFor(stored.accessTokenExpiryDate, DAY)) return stored.accessToken;

  if (stored && validFor(stored.refreshTokenExpiryDate, DAY)) {
    const res = await rawCall<StoredToken>("/authentication/refreshAccessToken", {
      method: "POST",
      body: { refreshToken: stored.refreshToken },
    });
    if (isOk(res) && res.data?.accessToken) {
      await saveToken(res.data);
      return res.data.accessToken;
    }
  }

  const apiKey = requireEnv("CJ_API_KEY");
  const res = await rawCall<StoredToken>("/authentication/getAccessToken", {
    method: "POST",
    body: { apiKey },
  });
  if (!isOk(res) || !res.data?.accessToken) {
    throw new CjError(`CJ authentication failed: ${res.message ?? "unknown error"}`, res.code, res.requestId);
  }
  await saveToken(res.data);
  return res.data.accessToken;
}

const AUTH_ERROR_CODES = new Set([1600001, 1600002, 1600003]);

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { query?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
  let token = await getAccessToken();
  let res = await rawCall<T>(path, { method, token, ...opts });
  if (!isOk(res) && res.code !== undefined && AUTH_ERROR_CODES.has(res.code)) {
    token = await getAccessToken(true);
    res = await rawCall<T>(path, { method, token, ...opts });
  }
  if (!isOk(res)) {
    throw new CjError(`CJ ${path} failed: ${res.message ?? "unknown error"}`, res.code, res.requestId);
  }
  return res.data;
}

// ── products ────────────────────────────────────────────────────────────────
export interface SearchParams {
  keyWord?: string;
  countryCode?: string;
  page?: number;
  size?: number;
  /** 0 = trending, 1 = new, 2 = video products, 3 = slow-moving */
  productFlag?: 0 | 1 | 2 | 3;
  /** 0 best match, 1 listing count (popularity), 2 price, 3 newest, 4 inventory */
  orderBy?: 0 | 1 | 2 | 3 | 4;
  sort?: "asc" | "desc";
}

export async function searchProducts(params: SearchParams) {
  const data = await call<CjListV2Data>("GET", "/product/listV2", {
    query: {
      keyWord: params.keyWord,
      countryCode: params.countryCode,
      page: params.page ?? 1,
      size: params.size ?? 30,
      productFlag: params.productFlag,
      orderBy: params.orderBy,
      sort: params.sort,
      features: ["enable_video", "enable_category"],
    },
  });
  return (data?.content ?? []).flatMap((c) => c.productList ?? []);
}

export function getProductDetail(pid: string) {
  return call<CjProductDetail>("GET", "/product/query", {
    query: { pid, features: ["enable_video"] },
  });
}

export function getInventoryByPid(pid: string) {
  return call<CjInventoryByPid>("GET", "/product/stock/getInventoryByPid", { query: { pid } });
}

/** Live stock for one variant, per warehouse country. */
export async function getStockByVid(vid: string): Promise<{ countryCode: string; totalInventoryNum?: number | string }[]> {
  const data = await call<{ countryCode: string; totalInventoryNum?: number | string }[] | null>(
    "GET",
    "/product/stock/queryByVid",
    { query: { vid } },
  );
  return data ?? [];
}

export async function getProductVideos(pid: string): Promise<CjVideo[]> {
  const data = await call<CjVideo[] | null>("POST", "/product/queryVideosByProductId", {
    body: { productId: pid },
  });
  return data ?? [];
}

// ── logistics ───────────────────────────────────────────────────────────────
export async function freightCalculate(
  startCountryCode: string,
  endCountryCode: string,
  products: { vid: string; quantity: number }[],
): Promise<CjFreightOption[]> {
  const data = await call<CjFreightOption[] | null>("POST", "/logistic/freightCalculate", {
    body: { startCountryCode, endCountryCode, products },
  });
  return data ?? [];
}

// ── orders ──────────────────────────────────────────────────────────────────
export function createOrder(order: CjOrderCreateRequest) {
  return call<CjOrderCreateResult>("POST", "/shopping/order/createOrderV2", { body: order });
}

/** Accepts a CJ order id or our own order number. */
export function getOrderDetail(orderId: string) {
  return call<CjOrderDetail>("GET", "/shopping/order/getOrderDetail", { query: { orderId } });
}

export async function getOrderDetailBatch(orderIds: string[]): Promise<CjOrderDetail[]> {
  if (orderIds.length === 0) return [];
  const data = await call<CjOrderDetail[] | null>("POST", "/shopping/order/getOrderDetailBatch", {
    body: { orderIds },
  });
  return data ?? [];
}

// ── sandbox helpers (only work on orders created with isSandbox=1) ──────────
export function sandboxSimulatePay(orderId: string) {
  return call<boolean>("POST", "/shopping/sandbox/simulatePay", { body: { orderId } });
}

export function sandboxUpdateStatus(orderId: string, targetStatus: 400 | 500 | 600 | 700) {
  return call<boolean>("POST", "/shopping/sandbox/updateStatus", { body: { orderId, targetStatus } });
}

export function sandboxUpdateTrackNumber(orderId: string, trackNumber: string) {
  return call<boolean>("POST", "/shopping/sandbox/updateTrackNumber", { body: { orderId, trackNumber } });
}
