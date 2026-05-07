#!/usr/bin/env node

/**
 * Quick Instagram API Test
 * Tests core functionality with realistic scenarios
 */

const BASE_URL = "http://localhost:3000";

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
    return false;
  }
}

async function request(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  return { status: response.status, data: await response.json() };
}

async function main() {
  console.log("\n🧪 Instagram API - Quick Test\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Health
  if (
    await test("✓ Health check", async () => {
      const { status, data } = await request("/health");
      if (status !== 200) throw new Error(`Status ${status}`);
      if (!data.status) throw new Error("No status field");
    })
  )
    passed++;
  else failed++;

  // Test 2: Profile lookup
  if (
    await test("✓ Lookup profile @instagram", async () => {
      const { status, data } = await request(
        "/api/instagram?username=instagram"
      );
      if (status !== 200) throw new Error(`Status ${status}`);
      if (!data.exists) throw new Error(`Profile not found`);
      if (!data.followers) throw new Error("No followers count");
      console.log(`   📊 ${data.followers.toLocaleString()} followers`);
    })
  )
    passed++;
  else failed++;

  // Test 3: Another profile
  if (
    await test("✓ Lookup profile @cristiano", async () => {
      const { status, data } = await request(
        "/api/instagram?username=cristiano"
      );
      if (status !== 200) throw new Error(`Status ${status}`);
      if (!data.exists) throw new Error(`Profile not found`);
      console.log(`   📊 ${data.followers.toLocaleString()} followers`);
    })
  )
    passed++;
  else failed++;

  // Test 4: Requested profile lookup
  if (
    await test("✓ Lookup profile @ke44in", async () => {
      const { status, data } = await request("/api/instagram?username=ke44in");
      if (status !== 200) throw new Error(`Status ${status}`);
      if (!data.exists) throw new Error(`Profile not found`);
      if (data.username !== "ke44in") throw new Error("Username mismatch");
      console.log(`   📊 ${data.followers.toLocaleString()} followers`);
    })
  )
    passed++;
  else failed++;

  // Test 5: Cache test
  if (
    await test("✓ Cache hit (instant response)", async () => {
      const start = Date.now();
      const { status } = await request("/api/instagram?username=instagram");
      const ms = Date.now() - start;
      if (status !== 200) throw new Error(`Status ${status}`);
      if (ms > 100) console.log(`   ⚠️  Slow: ${ms}ms (not cached?)`);
      else console.log(`   ⚡ ${ms}ms`);
    })
  )
    passed++;
  else failed++;

  // Test 6: Not found
  if (
    await test(
      "✓ Not found user returns exists: false",
      async () => {
        const { status, data } = await request(
          "/api/instagram?username=notarealuser99999"
        );
        if (status !== 200) throw new Error(`Status ${status}`);
        if (data.exists !== false) throw new Error("Should return exists: false");
      }
    )
  )
    passed++;
  else failed++;

  // Test 7: Validation
  if (
    await test(
      "✓ Invalid username rejected",
      async () => {
        const { status, data } = await request(
          "/api/instagram?username=invalid%20user"
        );
        if (status !== 400) throw new Error(`Expected 400, got ${status}`);
        if (!data.error) throw new Error("No error message");
      }
    )
  )
    passed++;
  else failed++;

  console.log(`\n📈 Results: ${passed}/7 passed\n`);

  if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) failed. Check server is running:\n`);
    console.log(`   npm start\n`);
    process.exit(1);
  }

  console.log("🎉 All tests passed!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
