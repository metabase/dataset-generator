import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Check if containers are running
    const { stdout: runningContainers } = await execAsync(
      'docker ps --filter "name=dataset_generator" --format "{{.Names}}"'
    );
    const containers = runningContainers.split("\n").filter(Boolean);

    if (
      !containers.includes("dataset_generator_metabase") ||
      !containers.includes("dataset_generator_postgres_metabase")
    ) {
      return NextResponse.json({
        ready: false,
        message: "Containers are not running",
      });
    }

    // Check if Metabase is actually ready by checking its setup endpoint
    try {
      const setupResponse = await fetch(
        "http://localhost:3001/api/session/properties"
      );
      if (setupResponse.ok) {
        return NextResponse.json({ ready: true });
      } else {
        return NextResponse.json({
          ready: false,
          message: "Metabase is still initializing",
        });
      }
    } catch (error) {
      // Metabase is still starting up
      return NextResponse.json({
        ready: false,
        message: "Metabase is starting up",
      });
    }
  } catch (error) {
    console.error("Error checking Metabase status:", error);
    return NextResponse.json(
      { ready: false, error: "Failed to check Metabase status" },
      { status: 500 }
    );
  }
}
