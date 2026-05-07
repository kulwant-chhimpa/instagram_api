# Instagram API Test Guide

## Quick Automated Tests

Run these commands to test the API:

### Test Suite (Comprehensive - 10 tests)
```bash
node test.js
```

### Quick Test (7 essential tests, includes `@ke44in`)
```bash
node quick-test.js
```

---

## Manual Test Commands

### 1️⃣ Health Check
```bash
curl http://localhost:3000/health | jq
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T19:21:15.301Z"
}
```

---

### 2️⃣ Fetch a Real Profile
```bash
curl "http://localhost:3000/api/instagram?username=instagram" | jq
```

**Expected:**
```json
{
  "exists": true,
  "username": "instagram",
  "imageUrl": "https://images.pathsocial.com/api/instagram/instagram",
  "followers": 699385032,
  "following": 195
}
```

---

### 3️⃣ Test Multiple Popular Accounts
```bash
# Cristiano Ronaldo
curl -s "http://localhost:3000/api/instagram?username=cristiano" | jq '.'

# Kylie Jenner
curl -s "http://localhost:3000/api/instagram?username=kylie" | jq '.'

# Dwayne Johnson
curl -s "http://localhost:3000/api/instagram?username=therock" | jq '.'

# Bill Gates
curl -s "http://localhost:3000/api/instagram?username=thisisbillgates" | jq '.'
```

---

### 4️⃣ Test Caching (Same User Multiple Times)
```bash
echo "First request (should hit Instagram API):"
time curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.followers'

echo ""
echo "Second request (should use cache - instant):"
time curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.followers'

echo ""
echo "Third request (cache hit again):"
time curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.followers'
```

---

### 5️⃣ Test Not Found
```bash
curl -s "http://localhost:3000/api/instagram?username=notarealuser99999" | jq
```

**Expected:**
```json
{
  "exists": false
}
```

---

### 6️⃣ Test Invalid Input
```bash
# Missing username
curl "http://localhost:3000/api/instagram" | jq

# Username with spaces (invalid)
curl "http://localhost:3000/api/instagram?username=invalid%20user" | jq

# Username too long (>30 chars)
curl "http://localhost:3000/api/instagram?username=this_is_a_really_really_really_really_long_username" | jq
```

**Expected:**
```json
{
  "error": "Invalid username. Use 1-30 characters: letters, numbers, periods, underscores."
}
```

---

### 7️⃣ Test Case Insensitivity
```bash
# All should return the same result
curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.followers'
curl -s "http://localhost:3000/api/instagram?username=INSTAGRAM" | jq '.followers'
curl -s "http://localhost:3000/api/instagram?username=Instagram" | jq '.followers'
```

---

### 8️⃣ Test Rate Limiting (60 req/min per IP)
```bash
# This will succeed - within limit
for i in {1..30}; do
  curl -s "http://localhost:3000/health" > /dev/null
  echo "Request $i"
done

# If you exceed 60 requests/minute, you'll get:
# {"error":"Too many requests. Please try again later."}
```

---

### 9️⃣ Performance Benchmark
```bash
# Test response times (cache vs fresh)
echo "Testing 5 different users:"

for user in instagram cristiano kylie therock billgates; do
  echo ""
  echo "Testing @$user:"
  curl -s "http://localhost:3000/api/instagram?username=$user" | jq '{username, followers}'
done
```

---

### 🔟 Check Server Logs
```bash
# If server is running in background
tail -f /tmp/server.log

# Or if running in foreground terminal, you'll see live logs
```

---

## What to Look For

### ✅ Good Signs
- HTTP 200 responses
- Real Instagram data (followers in millions)
- Cache hits under 10ms
- Deterministic image URL from `images.pathsocial.com`
- Proper error messages for invalid input

### ⚠️ Warning Signs
- HTTP 429 (rate limited) — Wait 10 minutes or use fresh IP
- HTTP 502/503 — Bright Data proxy issue
- Missing followers count — API change on Instagram
- Slow cache responses (>100ms) — Not using cache properly

---

## Advanced Testing

### Test with jq for Pretty Output
```bash
curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '{exists, username, followers, following}'
```

### Extract Specific Fields
```bash
curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.followers'
curl -s "http://localhost:3000/api/instagram?username=instagram" | jq '.imageUrl'
```

### Batch Test Multiple Users
```bash
curl -s 'http://localhost:3000/api/instagram?username=instagram' > /tmp/ig1.json
curl -s 'http://localhost:3000/api/instagram?username=cristiano' > /tmp/ig2.json

cat /tmp/ig1.json | jq '.followers'
cat /tmp/ig2.json | jq '.followers'
```

---

## Troubleshooting

### Server won't start
```bash
# Make sure port 3000 is available
lsof -i :3000

# Or use different port
PORT=8000 npm start
```

### Getting 429 (Rate Limited)
```bash
# Wait a bit and rely on cache hits for repeated usernames
# Ensure CF_WORKER_URL is configured, then npm run build && npm start
```

### Worker URL errors
```bash
# Make sure Cloudflare Worker URL is set
export CF_WORKER_URL=https://your-worker.example.workers.dev
npm start
```

---

## Expected Performance

| Metric | Value |
|--------|-------|
| Health check | <5ms |
| First profile fetch | 200-500ms |
| Cached profile fetch | <10ms |
| Not found lookup | 200-500ms |
| Invalid input validation | <5ms |
| Rate limit window | 60 requests/minute |

---

Enjoy testing! 🚀
