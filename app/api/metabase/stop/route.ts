import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Stop and remove containers and volumes using docker-compose down -v
    // This only affects containers/volumes defined in our docker-compose.yml
    await execAsync("docker-compose down -v");

    // Only remove images that were specifically created by our dataset generator
    // Check if our specific images exist before trying to remove them
    try {
      const { stdout: images } = await execAsync(
        "docker images --format '{{.Repository}}:{{.Tag}}'"
      );
      const imageList = images.split("\n").filter(Boolean);

      // Only remove images that match our naming pattern
      const ourImages = imageList.filter(
        (img) =>
          img.includes("dataset_generator") ||
          img.includes("metabase/metabase") ||
          img.includes("postgres:15")
      );

      for (const image of ourImages) {
        try {
          await execAsync(`docker rmi ${image}`);
        } catch (e) {
          // Ignore errors if image is in use or doesn't exist
          console.error(`Could not remove image ${image}:`, e);
        }
      }
    } catch (e) {
      // If we can't list images, just continue
      console.error("Could not list images:", e);
    }

    return NextResponse.json({
      message:
        "Dataset generator containers, volumes, and images stopped and removed",
    });
  } catch (error: any) {
    console.error("Error stopping containers:", error);
    return NextResponse.json(
      { error: error.stderr || error.message || "Failed to stop containers" },
      { status: 500 }
    );
  }
}
