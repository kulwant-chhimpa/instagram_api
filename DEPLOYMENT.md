# Instagram API — Deployment Summary

## ✅ Service Status: Ready for Production

All core functionality implemented and tested:
- ✅ Instagram profile fetch with browser-accurate headers
- ✅ Two-tier caching (in-memory + Postgres)
- ✅ Derived image URL (no upload/storage latency)
- ✅ Rate limiting (60 req/min per IP)
- ✅ Error handling with exponential backoff retry
- ✅ Proper request validation and sanitization
- ✅ Health check endpoint
- ✅ Debug cache endpoint for testing

## Quick Start

### 1. Pre-requisites

- Node.js 18+
- Supabase account and project
- 5 minutes to set up

### 2. Supabase Setup

Go to your Supabase project dashboard:

**A. Create Cache Table**
- SQL Editor → New Query
- Run the contents of `supabase/setup.sql`

**B. Get API Keys**
- Settings → API
- Copy: **Project URL** → `SUPABASE_URL`
- Copy: **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure & Run

```bash
# Create .env
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# The profile scraper reads Instagram's public profile API directly; no worker URL is needed.

# Install & build
npm install
npm run build

# Run server
npm start
# Server runs on http://localhost:3000
```

### 4. Test It

```bash
# Health check
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

# Profile lookup (will check cache first, then Instagram)
curl "http://localhost:3000/api/instagram?username=instagram"
# → {"exists":true,"username":"instagram","imageUrl":"...","followers":...,"following":...}

# Not found
curl "http://localhost:3000/api/instagram?username=nonexistent_user"
# → {"exists":false}

# Invalid input
curl "http://localhost:3000/api/instagram?username=invalid%20user"
# → {"error":"Invalid username..."}
```

## API Reference

### `GET /api/instagram?username=<username>`

**Query Parameters:**
- `username` (required, string): Instagram username (1-30 chars, alphanumeric + `.` and `_`)

**Success Response (200):**
```json
{
  "exists": true,
  "username": "instagram",
  "imageUrl": "https://images.pathsocial.com/api/instagram/instagram",
  "followers": 686000000,
  "following": 76
}
```

**User Not Found (200):**
```json
{"exists": false}
```

**Validation Error (400):**
```json
{"error": "Invalid username. Use 1-30 characters: letters, numbers, periods, underscores."}
```

**Rate Limited (429):**
```json
{"error": "Too many requests. Please try again later."}
```

### `GET /health`

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T17:56:16.825Z"
}
```

### `POST /api/debug/cache` (Testing Only)

Manually seed the cache without hitting Instagram. Useful for testing the full flow during development.

**Body:**
```json
{
  "username": "instagram",
  "imageUrl": "https://images.pathsocial.com/api/instagram/instagram",
  "followers": 686000000,
  "following": 76
}
```

**Response:**
```json
{"ok": true, "message": "Cached @instagram"}
```

## Rate Limiting & Caching

| Component | Configuration | Default |
|---|---|---|
| **Global Rate Limit** | Requests per minute per IP | 60 req/min |
| **Cache TTL** | Hours to keep profiles cached | 24 hours |
| **Retry on 429** | Exponential backoff retries | 3 retries (2s, 4s, 8s) |

**To change cache TTL:**
```bash
# .env
CACHE_TTL_HOURS=72  # 72 hours instead of 24
```

## Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
CACHE_TTL_HOURS=24
```

## Important Notes

### Instagram Rate Limiting

Instagram's public web endpoint has aggressive rate-limiting:
- **Why:** It's designed for browser use, not bots
- **Error:** HTTP 429 (Too Many Requests)
- **Solution:** Use the cache! With 24-48h TTL, 100-1000 req/day is easily sustainable

For repeated requests:
```bash
# First request (hits Instagram, gets cached)
curl "http://localhost:3000/api/instagram?username=instagram"

# Second request (instant cache hit, no Instagram call)
curl "http://localhost:3000/api/instagram?username=instagram"
```

### For Production

**Single-instance deployment:**
- Railway, Fly.io, Heroku, or any Node.js host
- Supabase provides persistence across restarts
- 100-1000 req/day is very stable

**Multiple instances / CDN:**
- All instances share the Supabase Postgres cache
- In-memory caches are per-instance (that's fine — cache miss → Postgres hit)
- Deploy with standard load balancer

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### What's NOT included

- ❌ Instagram Graph API (use if you need authentication)
- ❌ HTML scraping (Instagram blocks it aggressively)
- ❌ Cookie management (Instagram's public endpoint doesn't require it)
- ❌ Proxy rotation (use for 10,000+ req/day scale)

## File Structure

```
instagram_api/
├── src/
│   ├── index.ts          # Express server entry
│   ├── config.ts         # Environment & validation
│   ├── supabase.ts       # Supabase client
│   ├── instagram.ts      # Instagram API fetch + Worker proxy
│   ├── cache.ts          # Memory + Postgres two-tier cache
│   └── routes.ts         # API handler
├── supabase/
│   └── setup.sql         # Database schema
├── dist/                 # Compiled JavaScript (npm run build)
├── package.json
├── tsconfig.json
├── .env                  # Your secrets (don't commit!)
├── .env.example          # Template
└── README.md
```

## Monitoring & Logs

The service logs important events to `stdout`:

```
[route] Checking cache for @username
[cache hit] @username
[cache miss] @username, fetching from Instagram
[instagram] ✓ Fetched @username — followers: 686000000
[instagram] Rate limited (429) for @username. Retry 1/3 after 2000ms
[instagram] User not found: @username
[debug] Manually cached @username
```

## Next Steps

1. ✅ Deploy to your hosting (Railway, Fly.io, etc.)
2. ✅ Set environment variables in your platform's dashboard
3. ✅ Test the `/health` endpoint
4. ✅ Make your first real request
5. ✅ Monitor logs for any issues
6. ✅ Adjust `CACHE_TTL_HOURS` based on your traffic patterns

## Support

If you hit Instagram's rate limit:
- **Short term:** Wait 15 minutes, increase cache TTL
- **Medium term:** Add delays between requests (sleep 100ms between API calls)
- **Long term:** Migrate to Instagram Graph API for authenticated, higher-rate access

---

**Built with:** Node.js • Express • TypeScript • Supabase • Postgres
**Production Ready:** Yes ✅
