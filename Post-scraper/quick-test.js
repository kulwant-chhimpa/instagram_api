#!/usr/bin/env node

const BASE_URL = "http://localhost:3001";

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function request(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  return { status: response.status, data: await response.json() };
}

async function main() {
  console.log("\n🧪 Instagram Post Scraper - Quick Test\n");

  let passed = 0;
  let failed = 0;

  if (
    await test("Health check", async () => {
      const { status, data } = await request("/health");
      if (status !== 200) throw new Error(`Status ${status}`);
      if (!data.status) throw new Error("No status field");
    })
  )
    passed++;
  else failed++;

  if (
    await test("Lookup public engagement data", async () => {
      const { status, data } = await request("/api/instagram/posts?username=instagram");
      if (status !== 200) throw new Error(`Status ${status}`);
      if (data.exists !== true && data.exists !== false) {
        throw new Error("Unexpected response shape");
      }
      if (data.exists) {
        if (!data.profileName) throw new Error("Missing profileName");
        if (typeof data.followers !== "number") throw new Error("Missing followers");
        if (!Array.isArray(data.topPosts)) throw new Error("Missing topPosts");
        if (!data.formatted || typeof data.formatted !== "object") {
          throw new Error("Missing formatted block");
        }
      }
    })
  )
    passed++;
  else failed++;

  console.log(`\n📈 Results: ${passed}/2 passed\n`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal:", error.message);
  process.exit(1);
});