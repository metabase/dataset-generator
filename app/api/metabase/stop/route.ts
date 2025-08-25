import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Stop and remove Metabase and db containers
    await execAsync("docker-compose stop metabase db_metabase");
    await execAsync("docker-compose rm -f metabase db_metabase");

    // Remove Metabase and db images (ignore errors if already removed)
    await execAsync("docker rmi metabase/metabase:latest || true");
    await execAsync("docker rmi postgres:15 || true");
    await execAsync(
      "docker volume rm dataset-generator_pgdata_metabase || true"
    );

    return NextResponse.json({
      message:
        "Dataset generator containers, volumes, and images stopped and removed",
    });
  } catch (error: unknown) {
    console.error("Error stopping containers:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to stop containers";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
