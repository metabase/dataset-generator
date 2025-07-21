import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { GenerateSpecPromptParams } from "./spec-prompts";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_CONFIG = {
  maxSizeMB: 100,
  maxFiles: 1000,
  maxAgeDays: 30,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
};

let lastCleanup = Date.now();

// Generate cache key from parameters
export function generateCacheKey(params: GenerateSpecPromptParams): string {
  return createHash("sha256").update(JSON.stringify(params)).digest("hex");
}

// Get cached spec if it exists
export async function getCachedSpec(
  params: GenerateSpecPromptParams
): Promise<any | null> {
  try {
    const key = generateCacheKey(params);
    const filePath = path.join(CACHE_DIR, `${key}.json`);

    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Cache a spec
export async function cacheSpec(
  params: GenerateSpecPromptParams,
  spec: any
): Promise<void> {
  try {
    const key = generateCacheKey(params);
    const filePath = path.join(CACHE_DIR, `${key}.json`);

    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // Write spec to cache
    await fs.writeFile(filePath, JSON.stringify(spec));

    // Check if cleanup is needed
    if (Date.now() - lastCleanup > CACHE_CONFIG.cleanupInterval) {
      await cleanupCache();
      lastCleanup = Date.now();
    }
  } catch (error) {
    console.error("Failed to cache spec:", error);
  }
}

// Clean up old cache files
export async function cleanupCache(): Promise<void> {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const files = await fs.readdir(CACHE_DIR);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        if (!file.endsWith(".json")) return null;

        const filePath = path.join(CACHE_DIR, file);
        const stats = await fs.stat(filePath);
        return { file, size: stats.size, mtime: stats.mtime };
      })
    );

    // Filter out null entries and sort by last accessed (oldest first)
    const validFiles = fileStats
      .filter(Boolean)
      .sort((a, b) => a!.mtime.getTime() - b!.mtime.getTime());

    // Calculate total size
    const totalSizeMB =
      validFiles.reduce((sum, file) => sum + file!.size, 0) / (1024 * 1024);
    const cutoff = Date.now() - CACHE_CONFIG.maxAgeDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    // Delete files if over limits or too old
    if (
      totalSizeMB > CACHE_CONFIG.maxSizeMB ||
      validFiles.length > CACHE_CONFIG.maxFiles
    ) {
      const filesToDelete = validFiles.slice(
        0,
        Math.floor(validFiles.length * 0.3)
      ); // Delete 30%

      for (const file of filesToDelete) {
        await fs.unlink(path.join(CACHE_DIR, file!.file));
        deletedCount++;
      }
    } else {
      // Delete old files
      for (const file of validFiles) {
        if (file!.mtime.getTime() < cutoff) {
          await fs.unlink(path.join(CACHE_DIR, file!.file));
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cache cleanup: deleted ${deletedCount} files`);
    }
  } catch (error) {
    console.error("Cache cleanup failed:", error);
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  fileCount: number;
  totalSizeMB: number;
  oldestFile?: number;
  newestFile?: number;
}> {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const files = await fs.readdir(CACHE_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return { fileCount: 0, totalSizeMB: 0 };
    }

    const stats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(CACHE_DIR, file);
        const stat = await fs.stat(filePath);
        return { file, size: stat.size, mtime: stat.mtime };
      })
    );

    const totalSizeMB =
      stats.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
    const timestamps = stats.map((s) => s.mtime.getTime());

    return {
      fileCount: stats.length,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      oldestFile: Math.min(...timestamps),
      newestFile: Math.max(...timestamps),
    };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return { fileCount: 0, totalSizeMB: 0 };
  }
}

// Clear all cache files
export async function clearCache(): Promise<number> {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const files = await fs.readdir(CACHE_DIR);
    let deletedCount = 0;

    for (const file of files) {
      if (file.endsWith(".json")) {
        await fs.unlink(path.join(CACHE_DIR, file));
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return 0;
  }
}
