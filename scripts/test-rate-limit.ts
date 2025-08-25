import "dotenv/config";
import axios from "axios";

const BASE_URL = "http://localhost:3001";

async function testRateLimit() {
  console.log("🧪 Testing Rate Limiting...\n");

  try {
    // Test 1: Normal request should work
    console.log("1. Testing normal request...");
    const response1 = await axios.post(`${BASE_URL}/api/generate`, {
      businessType: "B2B SaaS",
      schemaType: "One Big Table",
      rowCount: 10,
      timeRange: ["2024"],
    });
    console.log("✅ Normal request successful");
    console.log(`   Rate limit headers:`, {
      limit: response1.headers["x-ratelimit-limit"],
      remaining: response1.headers["x-ratelimit-remaining"],
      reset: response1.headers["x-ratelimit-reset"],
    });

    // Test 2: Make multiple rapid requests to trigger rate limit
    console.log("\n2. Testing rate limit with rapid requests...");

    // First request should work
    const response2 = await axios.post(`${BASE_URL}/api/generate`, {
      businessType: "B2B SaaS",
      schemaType: "One Big Table",
      rowCount: 10,
      timeRange: ["2024"],
    });
    console.log("✅ Second request successful");

    // Second request should be rate limited
    try {
      await axios.post(`${BASE_URL}/api/generate`, {
        businessType: "B2B SaaS",
        schemaType: "One Big Table",
        rowCount: 10,
        timeRange: ["2024"],
      });
      console.log("❌ Second request should have been rate limited");
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log("✅ Rate limiting working - second request blocked");
        console.log("   Error message:", error.response.data.message);
        console.log(
          "   Retry after:",
          error.response.data.retryAfter,
          "seconds"
        );
      } else {
        console.log("❌ Unexpected error:", error.message);
      }
    }

    console.log(`✅ Rate limiting test completed`);

    // Test 3: Check cache stats endpoint
    console.log("\n3. Testing cache stats endpoint...");
    const statsResponse = await axios.get(`${BASE_URL}/api/cache/stats`);
    console.log("✅ Cache stats endpoint working");
    console.log(`   Rate limit headers:`, {
      limit: statsResponse.headers["x-ratelimit-limit"],
      remaining: statsResponse.headers["x-ratelimit-remaining"],
    });

    console.log("\n🎉 Rate limiting tests completed successfully!");
  } catch (error) {
    console.error("❌ Rate limiting test failed:", error);
  }
}

// Run the test
testRateLimit();
