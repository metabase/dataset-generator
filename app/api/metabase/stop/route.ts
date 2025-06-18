import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Stop and remove containers and volumes using docker-compose down -v
    await execAsync("docker-compose down -v");

    return NextResponse.json({
      message: "Containers and volumes stopped and removed",
    });
  } catch (error: any) {
    console.error("Error stopping containers:", error);
    return NextResponse.json(
      { error: error.stderr || error.message || "Failed to stop containers" },
      { status: 500 }
    );
  }
}
