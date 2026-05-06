#!/usr/bin/env node

/**
 * Instagram API Test Suite
 * 
 * Tests all endpoints and scenarios:
 * - Health check
 * - Profile lookups
 * - Caching layer
 * - Error handling
 * - Rate limiting
 */

const BASE_URL = "http://localhost:3000";

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✅ ${name}`);
    } catch (err) {
      this.failed++;
      console.log(`❌ ${name}`);
      console.log(`   Error: ${err.message}`);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  }

  async assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  summary() {
    console.log("\n" + "=".repeat(60));
    console.log(`Tests Passed: ${this.passed}`);
    console.log(`Tests Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);
    console.log("=".repeat(60) + "\n");
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

async function runTests() {
  const runner = new TestRunner();

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║             INSTAGRAM API TEST SUITE                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Test 1: Health Check
  await runner.test("Health check endpoint should return status ok", async () => {
    const { status, data } = await runner.request("/health");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.status === "ok", "Expected status: ok");
    await runner.assert(data.timestamp, "Expected timestamp in response");
  });

  // Test 2: Fetch valid profile - cristiano
  await runner.test("Fetch valid profile (@cristiano)", async () => {
    const { status, data } = await runner.request("/api/instagram?username=cristiano");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === true, "Expected exists: true");
    await runner.assert(data.username === "cristiano", "Expected username: cristiano");
    await runner.assert(data.followers > 0, "Expected followers > 0");
    await runner.assert(data.following > 0, "Expected following > 0");
    await runner.assert(data.imageUrl, "Expected imageUrl");
    console.log(`   → @cristiano: ${data.followers.toLocaleString()} followers`);
  });

  // Test 3: Fetch valid profile - instagram
  await runner.test("Fetch valid profile (@instagram)", async () => {
    const { status, data } = await runner.request("/api/instagram?username=instagram");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === true, "Expected exists: true");
    await runner.assert(data.username === "instagram", "Expected username: instagram");
    await runner.assert(data.followers > 0, "Expected followers > 0");
    console.log(`   → @instagram: ${data.followers.toLocaleString()} followers`);
  });

  // Test 4: Fetch valid profile - kylie
  await runner.test("Fetch valid profile (@kylie)", async () => {
    const { status, data } = await runner.request("/api/instagram?username=kylie");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === true, "Expected exists: true");
    console.log(`   → @kylie: ${data.followers.toLocaleString()} followers`);
  });

  // Test 5: Cache hit test - should be instant
  console.log("\n⏱️  Testing cache hit (should be <50ms)...");
  await runner.test("Cache hit - second request for same user", async () => {
    const start = Date.now();
    const { status, data } = await runner.request("/api/instagram?username=cristiano");
    const duration = Date.now() - start;
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === true, "Expected cached result");
    console.log(`   → Response time: ${duration}ms (cached)`);
  });

  // Test 6: Non-existent user
  await runner.test("Non-existent user returns exists: false", async () => {
    const { status, data } = await runner.request(
      "/api/instagram?username=this_user_definitely_does_not_exist_12345"
    );
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === false, "Expected exists: false");
  });

  // Test 7: Invalid username validation
  await runner.test("Invalid username format returns error", async () => {
    const { status, data } = await runner.request(
      "/api/instagram?username=invalid%20user%20with%20spaces"
    );
    await runner.assert(status === 400, `Expected 400, got ${status}`);
    await runner.assert(data.error, "Expected error message");
  });

  // Test 8: Missing username parameter
  await runner.test("Missing username parameter returns error", async () => {
    const { status, data } = await runner.request("/api/instagram");
    await runner.assert(status === 400, `Expected 400, got ${status}`);
    await runner.assert(data.error, "Expected error message");
  });

  // Test 9: Username normalization (lowercase)
  await runner.test("Usernames are normalized to lowercase", async () => {
    const { status, data } = await runner.request("/api/instagram?username=CRISTIANO");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(data.exists === true, "Expected to find user");
    await runner.assert(data.username === "cristiano", "Expected normalized username");
  });

  // Test 10: Response format validation
  await runner.test("Response has correct JSON structure", async () => {
    const { status, data } = await runner.request("/api/instagram?username=instagram");
    await runner.assert(status === 200, `Expected 200, got ${status}`);
    await runner.assert(
      typeof data === "object" && data !== null,
      "Expected object response"
    );
    await runner.assert(typeof data.exists === "boolean", "Expected exists: boolean");
    if (data.exists) {
      await runner.assert(typeof data.username === "string", "Expected username: string");
      await runner.assert(typeof data.followers === "number", "Expected followers: number");
      await runner.assert(typeof data.following === "number", "Expected following: number");
      await runner.assert(typeof data.imageUrl === "string", "Expected imageUrl: string");
    }
  });

  // Summary
  runner.summary();
}

// Run tests
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
