import { NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";

export async function DELETE() {
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
