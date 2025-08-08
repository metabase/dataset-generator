#!/usr/bin/env tsx

import {
  getCachedSpec,
  cacheSpec,
  getCacheStats,
  clearCache,
  generateCacheKey,
} from "../lib/cache";
import { GenerateSpecPromptParams } from "../lib/spec-prompts";

class SimpleCacheTester {
  async testCache(): Promise<void> {
    console.log("🧪 Testing cache functionality (simple version)...\n");

    // Clear cache first for clean test
    const clearedCount = await clearCache();
    console.log(`Cleared ${clearedCount} existing cache files\n`);

    const testParams: GenerateSpecPromptParams = {
      businessType: "B2B SaaS",
      schemaType: "One Big Table",
      timeRange: ["2024"],
      growthPattern: "steady",
      variationLevel: "medium",
      granularity: "daily",
    };

    console.log("Test Parameters:");
    console.log(JSON.stringify(testParams, null, 2));
    console.log();

    // Test 1: Generate cache key
    console.log("🔄 Test 1: Cache key generation");
    const key1 = generateCacheKey(testParams);
    console.log(`Cache key: ${key1}`);
    console.log(`Key length: ${key1.length} characters`);
    console.log();

    // Test 2: Check cache miss (should be null)
    console.log("🔄 Test 2: Cache miss (expected)");
    const cachedSpec1 = await getCachedSpec(testParams);
    console.log(`Cached spec: ${cachedSpec1 ? "FOUND" : "NOT FOUND"}`);
    console.log();

    // Test 3: Store a test spec
    console.log("🔄 Test 3: Store test spec in cache");
    const testSpec = {
      entities: [
        {
          name: "users",
          attributes: {
            user_id: { type: "id", prefix: "user" },
            user_name: { type: "faker", method: "person.fullName" },
          },
        },
      ],
      event_stream_table: {
        name: "events",
        columns: [
          {
            name: "event_id",
            source: { type: "id", prefix: "event" },
          },
        ],
      },
      simulation: {
        initial_event: "user_signup",
        events: {
          user_signup: {
            type: "random",
            avg_per_entity_per_month: 0.1,
            outputs: {},
          },
        },
      },
    };

    await cacheSpec(testParams, testSpec);
    console.log("Test spec stored in cache");
    console.log();

    // Test 4: Check cache hit
    console.log("🔄 Test 4: Cache hit (expected)");
    const cachedSpec2 = await getCachedSpec(testParams);
    console.log(`Cached spec: ${cachedSpec2 ? "FOUND" : "NOT FOUND"}`);
    if (cachedSpec2) {
      console.log(
        `Spec has ${Object.keys(cachedSpec2.entities || {}).length} entities`
      );
      console.log(
        `Spec has ${
          Object.keys(cachedSpec2.simulation?.events || {}).length
        } events`
      );
    }
    console.log();

    // Test 5: Different parameters (should miss cache)
    console.log("🔄 Test 5: Different parameters (expected cache miss)");
    const differentParams = { ...testParams, businessType: "Ecommerce" };
    const key2 = generateCacheKey(differentParams);
    console.log(`Different cache key: ${key2}`);
    console.log(`Keys are different: ${key1 !== key2}`);

    const cachedSpec3 = await getCachedSpec(differentParams);
    console.log(
      `Cached spec for different params: ${cachedSpec3 ? "FOUND" : "NOT FOUND"}`
    );
    console.log();

    // Test 6: Same parameters again (should hit cache)
    console.log("🔄 Test 6: Same parameters again (expected cache hit)");
    const cachedSpec4 = await getCachedSpec(testParams);
    console.log(`Cached spec: ${cachedSpec4 ? "FOUND" : "NOT FOUND"}`);
    console.log();

    // Test 7: Cache statistics
    console.log("🔄 Test 7: Cache statistics");
    const stats = await getCacheStats();
    console.log("Cache Statistics:");
    console.log(`  Files: ${stats.fileCount}`);
    console.log(`  Total size: ${stats.totalSizeMB}MB`);
    if (stats.oldestFile) {
      console.log(`  Oldest file: ${new Date(stats.oldestFile).toISOString()}`);
    }
    if (stats.newestFile) {
      console.log(`  Newest file: ${new Date(stats.newestFile).toISOString()}`);
    }
    console.log();

    // Generate summary
    this.generateSummary({
      key1,
      key2,
      cachedSpec1,
      cachedSpec2,
      cachedSpec3,
      cachedSpec4,
      stats,
    });
  }

  private generateSummary(results: any): void {
    console.log("📋 Cache Test Summary:");
    console.log("=".repeat(50));

    const cacheHits = [results.cachedSpec2, results.cachedSpec4].filter(
      Boolean
    ).length;
    const cacheMisses = [results.cachedSpec1, results.cachedSpec3].filter(
      (spec) => !spec
    ).length;
    const totalTests = 4;

    console.log(`Total cache tests: ${totalTests}`);
    console.log(
      `Cache hits: ${cacheHits} (${((cacheHits / totalTests) * 100).toFixed(
        1
      )}%)`
    );
    console.log(
      `Cache misses: ${cacheMisses} (${(
        (cacheMisses / totalTests) *
        100
      ).toFixed(1)}%)`
    );

    // Verify cache key uniqueness
    console.log("\n🔍 Cache Key Verification:");
    console.log(`Keys are different: ${results.key1 !== results.key2}`);
    console.log(`Key 1 length: ${results.key1.length} characters`);
    console.log(`Key 2 length: ${results.key2.length} characters`);

    if (results.key1 !== results.key2) {
      console.log(
        "✅ Cache keys are working correctly - different parameters generate different keys"
      );
    } else {
      console.log("❌ Cache keys may be colliding - investigate further");
    }

    // Verify cache storage
    console.log("\n💾 Cache Storage Verification:");
    console.log(`Cache files: ${results.stats.fileCount}`);
    console.log(`Cache size: ${results.stats.totalSizeMB}MB`);

    if (results.stats.fileCount > 0) {
      console.log("✅ Cache storage is working correctly");
    } else {
      console.log("❌ Cache storage may not be working");
    }

    console.log("\n" + "=".repeat(50));
  }
}

// Run cache test if this script is executed directly
if (require.main === module) {
  const tester = new SimpleCacheTester();
  tester.testCache().catch(console.error);
}

export { SimpleCacheTester };
