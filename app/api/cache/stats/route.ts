import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/cache";
import { rateLimitMiddleware } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        oldestFile: stats.oldestFile
          ? new Date(stats.oldestFile).toISOString()
          : undefined,
        newestFile: stats.newestFile
          ? new Date(stats.newestFile).toISOString()
          : undefined,
      },
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
}
