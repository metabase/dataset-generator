import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Stop containers using docker-compose
    await execAsync("docker-compose stop db metabase");

    return NextResponse.json({ message: "Containers stopped" });
  } catch (error: any) {
    console.error("Error stopping containers:", error);
    return NextResponse.json(
      { error: error.stderr || error.message || "Failed to stop containers" },
      { status: 500 }
    );
  }
}
