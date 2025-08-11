import { RateLimiter } from "limiter";
import { NextResponse } from "next/server";

// In-memory store for rate limiters
const rateLimiters = new Map<string, RateLimiter>();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Per IP address
  requestsPerMinute: 10, // 10 requests per minute per IP (reasonable for production)
  requestsPerHour: 100, // 100 requests per hour per IP
  requestsPerDay: 1000, // 1000 requests per day per IP
};

// Get client IP from request
function getClientIP(req: Request): string {
  // For Next.js API routes, we need to extract IP from headers
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");

  // Use the first available IP
  const ip = forwarded?.split(",")[0] || realIP || cfConnectingIP || "unknown";
  return ip;
}

// Create or get rate limiter for an IP
function getRateLimiter(ip: string): RateLimiter {
  if (!rateLimiters.has(ip)) {
    // Create a new rate limiter for this IP
    const limiter = new RateLimiter({
      tokensPerInterval: RATE_LIMIT_CONFIG.requestsPerMinute,
      interval: "minute",
    });
    rateLimiters.set(ip, limiter);
  }
  return rateLimiters.get(ip)!;
}

// Check if request is allowed
export async function checkRateLimit(req: Request): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const ip = getClientIP(req);
  const limiter = getRateLimiter(ip);

  // Check if we have at least 1 token available
  const tokensAvailable = limiter.getTokensRemaining();

  if (tokensAvailable >= 1) {
    // Remove a token
    await limiter.removeTokens(1);
    const remaining = limiter.getTokensRemaining();

    // Request allowed
    return {
      allowed: true,
      remaining,
      resetTime: Date.now() + 60000, // 1 minute from now
    };
  } else {
    // Request blocked
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
    };
  }
}

// Rate limit middleware for Next.js API routes
export async function rateLimitMiddleware(
  req: Request
): Promise<Response | null> {
  const rateLimitResult = await checkRateLimit(req);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ).toString(),
          "X-RateLimit-Limit": RATE_LIMIT_CONFIG.requestsPerMinute.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  return null;
}

// Helper to add rate limit headers to NextResponse
export function addRateLimitHeaders(
  response: NextResponse,
  req: Request
): NextResponse {
  const ip = getClientIP(req);
  const limiter = getRateLimiter(ip);

  response.headers.set(
    "X-RateLimit-Limit",
    RATE_LIMIT_CONFIG.requestsPerMinute.toString()
  );
  response.headers.set(
    "X-RateLimit-Remaining",
    limiter.getTokensRemaining().toString()
  );
  response.headers.set("X-RateLimit-Reset", (Date.now() + 60000).toString());

  return response;
}

// Get rate limit info for debugging
export function getRateLimitInfo(ip: string): {
  remaining: number;
  resetTime: number;
} {
  const limiter = getRateLimiter(ip);
  return {
    remaining: limiter.getTokensRemaining(),
    resetTime: Date.now() + 60000,
  };
}

// Clean up old rate limiters (call periodically)
export function cleanupRateLimiters(): void {
  const now = Date.now();
  for (const [ip, limiter] of rateLimiters.entries()) {
    // Remove rate limiters that haven't been used in the last hour
    if (now - limiter.lastRefillTime > 3600000) {
      rateLimiters.delete(ip);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupRateLimiters, 3600000);
