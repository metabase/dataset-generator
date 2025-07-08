import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Check if Docker is running
    try {
      await execAsync("docker info");
    } catch (error) {
      return NextResponse.json(
        { error: "Docker is not running. Please start Docker and try again." },
        { status: 400 }
      );
    }

    // Check if containers are already running
    const { stdout: runningContainers } = await execAsync(
      'docker ps --filter "name=dataset_generator" --format "{{.Names}}"'
    );
    if (runningContainers.includes("dataset_generator_metabase")) {
      return NextResponse.json({
        message: "Metabase is already running",
        url: "http://localhost:3001",
      });
    }

    // Start containers using docker-compose
    await execAsync("docker-compose up -d db_metabase metabase");

    return NextResponse.json({
      message: "Metabase is starting",
      url: "http://localhost:3001",
    });
  } catch (error: any) {
    console.error("Error starting Metabase:", error);
    return NextResponse.json(
      { error: error.stderr || error.message || "Failed to start Metabase" },
      { status: 500 }
    );
  }
}
