# Instagram Profile API

Backend API service that fetches public Instagram profile data and caches profile pictures in Supabase Storage.

## Architecture

```
Client
  │
  ▼
GET /api/instagram?username=<username>
  │
  ├─ Cache hit? → Return cached response (memory → Supabase Postgres)
  │
  └─ Cache miss:
       ├─ Fetch profile from Instagram public web API
       ├─ Download profile picture
       ├─ Upload to Supabase Storage
       ├─ Cache result (memory + Postgres)
       └─ Return JSON response
```

**Stack:** Express.js + TypeScript + Supabase (Storage + Postgres)

**Why Express over Cloudflare Workers:**
- Full control over outbound HTTP headers (critical for Instagram's UA validation)
- No CF-imposed request restrictions on external origins
- Native Supabase JS SDK — no polyfills needed
- Deployable anywhere: Docker, Railway, Fly.io, VPS
- Simpler debugging and logging at low scale

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (not the anon key) |
| `PORT` | | Server port (default: `3000`) |
| `CACHE_TTL_HOURS` | | Cache duration in hours (default: `24`) |
| `PROXY_URL` | | Optional proxy URL (e.g., `http://proxy.example.com:8080`) |

---

## Supabase Setup

### 1. Create the Storage Bucket

1. Go to **Supabase Dashboard → Storage**
2. Click **New Bucket**
3. Name: `instagram-profiles`
4. Toggle **Public** to **ON**
5. Click **Create**

### 2. Create the Cache Table

Go to **SQL Editor → New Query** and run:

```sql
CREATE TABLE IF NOT EXISTS instagram_cache (
  username    TEXT PRIMARY KEY,
  profile_pic TEXT NOT NULL,
  followers   BIGINT NOT NULL DEFAULT 0,
  following   BIGINT NOT NULL DEFAULT 0,
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_cache_cached_at
  ON instagram_cache (cached_at);
```

Or run the full setup file: `supabase/setup.sql`

### 3. Get Your Keys

1. Go to **Settings → API**
2. Copy the **Project URL** → `SUPABASE_URL`
3. Copy the **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Use the **service_role** key, not the **anon** key. The service role key bypasses Row Level Security and is needed for Storage uploads.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env from template
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Run in development mode (hot reload)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# 4. Test it
curl "http://localhost:3000/api/instagram?username=instagram"
curl "http://localhost:3000/health"

# 5. Run automated tests
node quick-test.js
```

---

## Production Build & Run

```bash
npm run build
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

---

## Deployment Options

### **Option 1: Vercel (Easiest - Free)**
Recommended for beginners. Auto-deploys from GitHub.

```bash
npm i -g vercel
vercel --prod
# Then add environment variables in dashboard
vercel --prod  # Redeploy
```

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed steps.

### **Option 2: Railway (Easy - Some Paid)**
Simple deployment with good free tier.
- Connect GitHub repo
- Set environment variables
- Auto-deploys on `git push`

https://railway.app

### **Option 3: Fly.io (Reliable - Paid)**
Fast global deployment.

```bash
fly launch
fly secrets set PROXY_URL=...
fly deploy
```

### **Option 4: Docker (Anywhere)**
Deploy to any cloud provider (AWS, GCP, Azure, DigitalOcean, etc.)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 3000
CMD ["npm", "start"]
```

---

## API Reference

### `GET /api/instagram?username=<username>`

Fetch an Instagram profile by username.

**Success Response (200):**

```json
{
  "exists": true,
  "username": "instagram",
  "profilePic": "https://xyz.supabase.co/storage/v1/object/public/instagram-profiles/instagram.jpg",
  "followers": 686000000,
  "following": 76
}
```

**User Not Found (200):**

```json
{
  "exists": false
}
```

**Validation Error (400):**

```json
{
  "error": "Missing required query parameter: username"
}
```

**Rate Limited (429):**

```json
{
  "error": "Too many requests. Please try again later."
}
```

### `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

---

## Rate Limiting

- **60 requests/minute per IP** (configurable in `src/index.ts`)
- Applied globally to all routes
- Returns `429 Too Many Requests` when exceeded

---

## Caching Strategy

| Layer | TTL | Scope | Survives Restart? |
|---|---|---|---|
| In-memory `Map` | 24h (configurable) | Per-process | No |
| Supabase `instagram_cache` table | 24h (configurable) | Global | Yes |

Cache flow:
1. Check in-memory cache → instant response
2. Cache miss → check Supabase Postgres → warm memory cache
3. Full miss → fetch from Instagram → store in both layers

---

## Scaling & Stability Notes

- **100–1,000 req/day** is well within Instagram's tolerance for unauthenticated public endpoint access
- Cache at 24h TTL means at most ~1,000 unique Instagram API calls per day
- The in-memory cache handles repeated lookups with zero latency
- Supabase Storage serves profile pictures via CDN — fast and reliable
- If Instagram rate-limits you (429), the service returns `{ exists: false }` gracefully
- For higher scale: add Redis caching, rotate User-Agents, or add request delays

---

## Deployment Checklist

- [ ] Supabase project created
- [ ] Storage bucket `instagram-profiles` created (public)
- [ ] Cache table `instagram_cache` created via SQL
- [ ] `.env` configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `npm install` completed
- [ ] `npm run build` succeeds
- [ ] `npm start` runs without errors
- [ ] `GET /health` returns `{ status: "ok" }`
- [ ] `GET /api/instagram?username=instagram` returns profile data
- [ ] Deployed behind HTTPS (reverse proxy / platform TLS)

---

## Project Structure

```
src/
├── index.ts        # Express app entry point
├── config.ts       # Environment variable loader
├── supabase.ts     # Supabase client singleton
├── instagram.ts    # Instagram public API fetch logic
├── storage.ts      # Download image + upload to Supabase Storage
├── cache.ts        # Two-tier cache (memory + Postgres)
└── routes.ts       # API route handler
supabase/
└── setup.sql       # Database setup script
```

---

## Troubleshooting

### Issue: "Instagram API returned 429" (Rate Limited)

Instagram's public web endpoint has aggressive rate-limiting to prevent bot abuse.

**Why this happens:**
- The endpoint `/api/v1/users/web_profile_info/` is designed for browser use, not programmatic access
- Instagram rate-limits by IP and user agent
- Multiple rapid requests from the same IP trigger 429 responses
- Your IP may be flagged if you've tested multiple scraping solutions

**Solutions:**

1. **Long cache TTL** (recommended for low-traffic services)
   - Increase `CACHE_TTL_HOURS` to 48 or 72 hours
   - Set in `.env`: `CACHE_TTL_HOURS=72`
   - Once a user is cached, no Instagram request needed for 72h

2. **Exponential backoff retry** (built-in)
   - The service automatically retries 3 times with 2s, 4s, 8s delays
   - If all retries fail, the API returns `{ exists: false }`

3. **Use a proxy** (if your IP is banned)
   - Get a proxy service (e.g., Bright Data, Oxylabs, ScrapingBee, or any HTTP proxy)
   - Set in `.env`: `PROXY_URL=http://proxy-host:port` or `PROXY_URL=http://user:pass@proxy:port`
   - Rebuild and restart: `npm run build && npm start`
   - The service will route all Instagram requests through the proxy

4. **Wait for IP to be unbanned**
   - Instagram's IP bans are temporary (24-48 hours)
   - Use a different network (phone hotspot, different WiFi) to test meanwhile

5. **For production at scale (1000+ req/day):**
   - Use **Instagram Graph API** instead (requires app approval)
   - Implement a request queue with delays (e.g., 1 request/second)
   - Use a residential proxy service for unlimited requests
   - Store session cookies if available

6. **For development/testing:**
   - Wait 10–15 minutes between test runs
   - Use different usernames each time
   - Consider testing with the health endpoint instead: `GET /health`

---

## Notes on Scaling & Stability

| Traffic Level | Cache TTL | Approach |
|---|---|---|
| **100–500 req/day** | 24–48h | In-memory + Postgres cache. Very stable. |
| **500–2000 req/day** | 48–72h | Increase cache TTL. One Instagram fetch per unique user per 2–3 days. |
| **2000+ req/day** | Use Graph API | Instagram's public endpoint not suitable. Requires official API access. |

---

## Running Tests

```bash
# Health check (always works)
curl http://localhost:3000/health

# Instagram profile lookup (subject to Instagram's rate-limiting)
curl "http://localhost:3000/api/instagram?username=instagram"

# Invalid username (fails validation)
curl "http://localhost:3000/api/instagram?username=invalid%20user%20123"
```

---

## Technical Details

### Headers Sent to Instagram

The service mimics a real Chrome browser request with:
- Modern `User-Agent` (Chrome 124, Windows)
- Referer pointing to instagram.com
- `X-IG-App-ID` (Instagram's internal app ID)
- All `Sec-*` headers for HTTPS integrity
- `Accept-Encoding: gzip, deflate, br`

### Why No Authentication?

Instagram's public web endpoint is designed to be **unauthenticated**. It:
- Works without cookies or logins
- Requires only a valid user agent and referer
- Returns public profile data only
- Is subject to rate-limiting for non-browser traffic

For authenticated access with higher limits, use **Instagram Graph API** (requires app review).

---

## License

MIT
````
