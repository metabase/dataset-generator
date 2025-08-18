import { RateLimiter } from "limiter";
import { NextResponse } from "next/server";

type LruEntry = { limiter: RateLimiter; lastSeen: number };

const rateLimiters = new Map<string, LruEntry>();

const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 10,
  requestsPerHour: 100,   // (not used in this snippet)
  requestsPerDay: 1000,   // (not used in this snippet)
};

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  return forwarded?.split(",")[0]?.trim() || realIP || cfConnectingIP || "unknown";
}

function getRateLimiter(ip: string): LruEntry {
  const now = Date.now();
  let entry = rateLimiters.get(ip);
  if (!entry) {
    entry = {
      limiter: new RateLimiter({
        tokensPerInterval: RATE_LIMIT_CONFIG.requestsPerMinute,
        interval: "minute",
      }),
      lastSeen: now,
    };
    rateLimiters.set(ip, entry);
  } else {
    entry.lastSeen = now;
  }
  return entry;
}

export async function checkRateLimit(req: Request): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const ip = getClientIP(req);
  const entry = getRateLimiter(ip);
  const { limiter } = entry;

  const tokensAvailable = limiter.getTokensRemaining();
  if (tokensAvailable >= 1) {
    await limiter.removeTokens(1);
    entry.lastSeen = Date.now(); // update on use
    return {
      allowed: true,
      remaining: limiter.getTokensRemaining(),
      resetTime: Date.now() + 60_000,
    };
  }
  return { allowed: false, remaining: 0, resetTime: Date.now() + 60_000 };
}

export async function rateLimitMiddleware(req: Request): Promise<Response | null> {
  const result = await checkRateLimit(req);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter,
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.requestsPerMinute),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetTime),
      },
    });
  }
  return null;
}

export function addRateLimitHeaders(response: NextResponse, req: Request): NextResponse {
  const ip = getClientIP(req);
  const entry = getRateLimiter(ip);
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_CONFIG.requestsPerMinute));
  response.headers.set("X-RateLimit-Remaining", String(entry.limiter.getTokensRemaining()));
  response.headers.set("X-RateLimit-Reset", String(Date.now() + 60_000));
  return response;
}

export function getRateLimitInfo(ip: string) {
  const entry = getRateLimiter(ip);
  return { remaining: entry.limiter.getTokensRemaining(), resetTime: Date.now() + 60_000 };
}

export function cleanupRateLimiters(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimiters.entries()) {
    if (now - entry.lastSeen > 3_600_000) {
      rateLimiters.delete(ip);
    }
  }
}

setInterval(cleanupRateLimiters, 3_600_000);
