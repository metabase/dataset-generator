import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/cache";

export async function GET() {
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
