import { NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";
import { rateLimitMiddleware } from "@/lib/rate-limit";

export async function DELETE(req: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const deletedCount = await clearCache();

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} cache files`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
