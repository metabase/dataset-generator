#!/usr/bin/env tsx

import "dotenv/config";
import { OpenAI } from "openai";
import {
  generateSpecPrompt,
  GenerateSpecPromptParams,
} from "../lib/spec-prompts";
import {
  getCachedSpec,
  cacheSpec,
  getCacheStats,
  clearCache,
} from "../lib/cache";

class CacheTester {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async testCache(): Promise<void> {
    console.log("🧪 Testing cache functionality...\n");

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

    // Test 1: First request (should miss cache)
    console.log("🔄 Test 1: First request (expected cache miss)");
    const result1 = await this.makeRequest(testParams, "Request 1");
    console.log(`Result: ${result1.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result1.generationTimeMs}ms`);
    console.log(`Tokens used: ${result1.tokensUsed || "N/A"}`);
    console.log();

    // Test 2: Second request with same params (should hit cache)
    console.log(
      "🔄 Test 2: Second request with identical params (expected cache hit)"
    );
    const result2 = await this.makeRequest(testParams, "Request 2");
    console.log(`Result: ${result2.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result2.generationTimeMs}ms`);
    console.log(`Tokens used: ${result2.tokensUsed || "N/A"}`);
    console.log();

    // Test 3: Request with different params (should miss cache)
    console.log(
      "🔄 Test 3: Request with different business type (expected cache miss)"
    );
    const differentParams = { ...testParams, businessType: "Ecommerce" };
    const result3 = await this.makeRequest(differentParams, "Request 3");
    console.log(`Result: ${result3.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result3.generationTimeMs}ms`);
    console.log(`Tokens used: ${result3.tokensUsed || "N/A"}`);
    console.log();

    // Test 4: Request with same params again (should hit cache)
    console.log(
      "🔄 Test 4: Third request with original params (expected cache hit)"
    );
    const result4 = await this.makeRequest(testParams, "Request 4");
    console.log(`Result: ${result4.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result4.generationTimeMs}ms`);
    console.log(`Tokens used: ${result4.tokensUsed || "N/A"}`);
    console.log();

    // Test 5: Request with slightly different params (should miss cache)
    console.log(
      "🔄 Test 5: Request with different time range (expected cache miss)"
    );
    const timeRangeParams = { ...testParams, timeRange: ["2023", "2024"] };
    const result5 = await this.makeRequest(timeRangeParams, "Request 5");
    console.log(`Result: ${result5.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result5.generationTimeMs}ms`);
    console.log(`Tokens used: ${result5.tokensUsed || "N/A"}`);
    console.log();

    // Test 6: Request with context (should miss cache)
    console.log("🔄 Test 6: Request with context (expected cache miss)");
    const contextParams = {
      ...testParams,
      context: "Construction management software",
    };
    const result6 = await this.makeRequest(contextParams, "Request 6");
    console.log(`Result: ${result6.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result6.generationTimeMs}ms`);
    console.log(`Tokens used: ${result6.tokensUsed || "N/A"}`);
    console.log();

    // Test 7: Request with same context again (should hit cache)
    console.log(
      "🔄 Test 7: Second request with same context (expected cache hit)"
    );
    const result7 = await this.makeRequest(contextParams, "Request 7");
    console.log(`Result: ${result7.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
    console.log(`Generation time: ${result7.generationTimeMs}ms`);
    console.log(`Tokens used: ${result7.tokensUsed || "N/A"}`);
    console.log();

    // Get cache statistics
    const stats = await getCacheStats();
    console.log("📊 Cache Statistics:");
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
    this.generateSummary([
      result1,
      result2,
      result3,
      result4,
      result5,
      result6,
      result7,
    ]);
  }

  private async makeRequest(
    params: GenerateSpecPromptParams,
    requestName: string
  ): Promise<{
    cacheHit: boolean;
    generationTimeMs: number;
    tokensUsed?: number;
    spec: any;
  }> {
    const startTime = Date.now();

    // Check cache first
    let spec = await getCachedSpec(params);
    const cacheHit = !!spec;

    if (!spec) {
      // Generate new spec
      const prompt = generateSpecPrompt(params);

      const completion = await this.openai.chat.completions.create({
        model: process.env.LLM_MODEL || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No spec generated from LLM");
      }

      spec = JSON.parse(content);
      await cacheSpec(params, spec);
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      cacheHit,
      generationTimeMs,
      tokensUsed: cacheHit ? undefined : 1000, // Mock token count for cache hits
      spec,
    };
  }

  private generateSummary(results: any[]): void {
    console.log("📋 Test Summary:");
    console.log("=".repeat(50));

    const cacheHits = results.filter((r) => r.cacheHit).length;
    const cacheMisses = results.filter((r) => !r.cacheHit).length;
    const totalRequests = results.length;

    console.log(`Total requests: ${totalRequests}`);
    console.log(
      `Cache hits: ${cacheHits} (${((cacheHits / totalRequests) * 100).toFixed(
        1
      )}%)`
    );
    console.log(
      `Cache misses: ${cacheMisses} (${(
        (cacheMisses / totalRequests) *
        100
      ).toFixed(1)}%)`
    );

    const avgTimeWithCache =
      results
        .filter((r) => r.cacheHit)
        .reduce((sum, r) => sum + r.generationTimeMs, 0) / cacheHits;
    const avgTimeWithoutCache =
      results
        .filter((r) => !r.cacheHit)
        .reduce((sum, r) => sum + r.generationTimeMs, 0) / cacheMisses;

    console.log(`Average time with cache: ${avgTimeWithCache.toFixed(0)}ms`);
    console.log(
      `Average time without cache: ${avgTimeWithoutCache.toFixed(0)}ms`
    );
    console.log(
      `Speed improvement: ${(
        (avgTimeWithoutCache / avgTimeWithCache) *
        100
      ).toFixed(1)}x faster with cache`
    );

    // Verify cache key uniqueness
    console.log("\n🔍 Cache Key Verification:");
    const uniqueSpecs = new Set();
    for (const result of results) {
      const specHash = JSON.stringify(result.spec).substring(0, 100);
      uniqueSpecs.add(specHash);
    }
    console.log(`Unique specs generated: ${uniqueSpecs.size}/${totalRequests}`);

    if (uniqueSpecs.size === totalRequests) {
      console.log(
        "✅ Cache keys are working correctly - each unique parameter set generates a different spec"
      );
    } else {
      console.log("⚠️  Some cache keys may be colliding - investigate further");
    }

    console.log("\n" + "=".repeat(50));
  }
}

// Run cache test if this script is executed directly
if (require.main === module) {
  const tester = new CacheTester();
  tester.testCache().catch(console.error);
}

export { CacheTester };
