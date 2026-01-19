#!/usr/bin/env node

/**
 * Test script for Instagram Username Search API
 * Tests all endpoints and functionality
 */

const BASE_URL = 'http://localhost:3000';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    log(`\n📍 Testing: ${name}`, 'cyan');
    log(`   URL: ${url}`, 'blue');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === expectedStatus) {
      log(`   ✅ Status: ${response.status}`, 'green');
    } else {
      log(`   ❌ Status: ${response.status} (expected ${expectedStatus})`, 'red');
    }
    
    log(`   Response:`, 'yellow');
    console.log(JSON.stringify(data, null, 2));
    
    return { success: response.status === expectedStatus, data };
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function runTests() {
  log('═══════════════════════════════════════════════════', 'cyan');
  log('  Instagram Username Search API - Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════', 'cyan');

  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/`
  );

  // Test 2: Valid Instagram Username
  await testEndpoint(
    'Valid Username (instagram)',
    `${BASE_URL}/ig-search?username=instagram`
  );

  // Test 3: Another Valid Username
  await testEndpoint(
    'Valid Username (cristiano)',
    `${BASE_URL}/ig-search?username=cristiano`
  );

  // Test 4: Non-existent Username
  await testEndpoint(
    'Non-existent Username',
    `${BASE_URL}/ig-search?username=thisuserdoesnotexist999xyz`
  );

  // Test 5: Missing Username Parameter
  await testEndpoint(
    'Missing Username Parameter',
    `${BASE_URL}/ig-search`,
    400
  );

  // Test 6: Cache Stats
  await testEndpoint(
    'Cache Statistics',
    `${BASE_URL}/cache/stats`
  );

  // Test 7: Cached Response (should be instant)
  log(`\n📍 Testing: Cached Response Speed`, 'cyan');
  const start = Date.now();
  await testEndpoint(
    'Cached Username (instagram)',
    `${BASE_URL}/ig-search?username=instagram`
  );
  const duration = Date.now() - start;
  log(`   ⏱️  Response time: ${duration}ms (should be < 50ms for cached)`, duration < 50 ? 'green' : 'yellow');

  log('\n═══════════════════════════════════════════════════', 'cyan');
  log('  Test Suite Complete! ✅', 'green');
  log('═══════════════════════════════════════════════════', 'cyan');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
