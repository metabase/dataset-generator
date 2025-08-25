#!/usr/bin/env tsx

import "dotenv/config";
import axios from "axios";

class APICacheTester {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }

  async testAPICache(): Promise<void> {
    console.log("🧪 Testing API cache functionality...\n");

    const testPayload = {
      businessType: "B2B SaaS",
      schemaType: "One Big Table",
      rowCount: 100,
      timeRange: ["2024"],
      growthPattern: "steady",
      variationLevel: "medium",
      granularity: "daily",
    };

    console.log("Test Payload:");
    console.log(JSON.stringify(testPayload, null, 2));
    console.log();

    try {
      // Test 1: First request (should miss cache)
      console.log("🔄 Test 1: First request (expected cache miss)");
      const result1 = await this.makeAPIRequest(testPayload, "Request 1");
      console.log(`Result: ${result1.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
      console.log(`Response time: ${result1.responseTimeMs}ms`);
      console.log(`Tokens used: ${result1.tokensUsed || "N/A"}`);
      console.log();

      // Test 2: Second request with same params (should hit cache)
      console.log(
        "🔄 Test 2: Second request with identical params (expected cache hit)"
      );
      const result2 = await this.makeAPIRequest(testPayload, "Request 2");
      console.log(`Result: ${result2.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
      console.log(`Response time: ${result2.responseTimeMs}ms`);
      console.log(`Tokens used: ${result2.tokensUsed || "N/A"}`);
      console.log();

      // Test 3: Request with different business type (should miss cache)
      console.log(
        "🔄 Test 3: Request with different business type (expected cache miss)"
      );
      const differentPayload = { ...testPayload, businessType: "Ecommerce" };
      const result3 = await this.makeAPIRequest(differentPayload, "Request 3");
      console.log(`Result: ${result3.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
      console.log(`Response time: ${result3.responseTimeMs}ms`);
      console.log(`Tokens used: ${result3.tokensUsed || "N/A"}`);
      console.log();

      // Test 4: Request with same params again (should hit cache)
      console.log(
        "🔄 Test 4: Third request with original params (expected cache hit)"
      );
      const result4 = await this.makeAPIRequest(testPayload, "Request 4");
      console.log(`Result: ${result4.cacheHit ? "CACHE HIT" : "CACHE MISS"}`);
      console.log(`Response time: ${result4.responseTimeMs}ms`);
      console.log(`Tokens used: ${result4.tokensUsed || "N/A"}`);
      console.log();

      // Generate summary
      this.generateSummary([result1, result2, result3, result4]);
    } catch (error) {
      console.error("❌ API test failed:", error);
      if (axios.isAxiosError(error)) {
        console.error("Response status:", error.response?.status);
        console.error("Response data:", error.response?.data);
      }
    }
  }

  private async makeAPIRequest(
    payload: any,
    requestName: string
  ): Promise<{
    cacheHit: boolean;
    responseTimeMs: number;
    tokensUsed?: number;
    data: any;
  }> {
    const startTime = Date.now();

    const response = await axios.post(`${this.baseUrl}/api/generate`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 120000, // 2 minutes timeout
    });

    const responseTimeMs = Date.now() - startTime;
    const data = response.data.data;

    // Determine if it was a cache hit based on presence of tokens
    const cacheHit = !data.tokens;

    return {
      cacheHit,
      responseTimeMs,
      tokensUsed: data.tokens?.total,
      data,
    };
  }

  private generateSummary(results: any[]): void {
    console.log("📋 API Test Summary:");
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

    if (cacheHits > 0 && cacheMisses > 0) {
      const avgTimeWithCache =
        results
          .filter((r) => r.cacheHit)
          .reduce((sum, r) => sum + r.responseTimeMs, 0) / cacheHits;
      const avgTimeWithoutCache =
        results
          .filter((r) => !r.cacheHit)
          .reduce((sum, r) => sum + r.responseTimeMs, 0) / cacheMisses;

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
    }

    // Check data consistency
    console.log("\n🔍 Data Consistency Check:");
    const uniqueRowCounts = new Set();
    for (const result of results) {
      const rowCount =
        result.data.table?.length || result.data.fact_table?.length || 0;
      uniqueRowCounts.add(rowCount);
    }
    console.log(`Unique row counts: ${uniqueRowCounts.size}/${totalRequests}`);

    if (uniqueRowCounts.size === 1) {
      console.log(
        "✅ Data consistency verified - all requests returned same row count"
      );
    } else {
      console.log(
        "⚠️  Data inconsistency detected - different row counts returned"
      );
    }

    console.log("\n" + "=".repeat(50));
  }
}

// Run API cache test if this script is executed directly
if (require.main === module) {
  const tester = new APICacheTester();
  tester.testAPICache().catch(console.error);
}

export { APICacheTester };
