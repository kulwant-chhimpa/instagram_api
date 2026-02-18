# Cloudflare Workers Setup Guide

Migrate your Instagram API from expensive Bright Data proxy to **free Cloudflare Workers** with built-in caching.

## 🚀 Quick Start

### Prerequisites
- Cloudflare account (free tier works) → [cloudflare.com](https://cloudflare.com)
- Wrangler CLI installed locally

### Step 1: Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

This opens your browser to authenticate with Cloudflare.

### Step 2: Create KV Namespace

```bash
wrangler kv:namespace create "INSTAGRAM_CACHE"
```

Copy the **namespace ID** from the output. You'll use it in the next step.

### Step 3: Update wrangler.toml

Edit `wrangler.toml` and replace:
- `YOUR_KV_NAMESPACE_ID` → the ID from Step 2
- `YOUR_DOMAIN` → your Cloudflare domain (or use default Workers domain)

```toml
[[kv_namespaces]]
binding = "INSTAGRAM_CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # ← Your namespace ID
```

### Step 4: Deploy Worker

```bash
wrangler publish
```

Output will show your Worker URL:
```
✓ Published instagram-api-worker
  https://instagram-api-worker.YOUR_DOMAIN.workers.dev
```

### Step 5: Update Environment Variables

Add to Vercel (or your deployment):

```
CF_WORKER_URL=https://instagram-api-worker.YOUR_DOMAIN.workers.dev
```

Remove these (no longer needed):
- `PROXY_URL` ❌
- `NODE_TLS_REJECT_UNAUTHORIZED` ❌

### Step 6: Redeploy Your API

```bash
# For Vercel
vercel --prod

# For local testing
npm run build && npm start
```

Test it:
```bash
curl "https://instagram-api-fawn.vercel.app/api/instagram?username=instagram"
```

---

## 📊 How It Works

```
Dashboard
   ↓
Node.js API (instagram-api-fawn.vercel.app)
   ↓
Cloudflare Worker (instagram-api-worker.YOUR_DOMAIN.workers.dev)
   ├─→ Check KV Cache (24h TTL)
   ├─→ If miss: Fetch from Instagram's API
   ├─→ Cache result in KV
   └─→ Return profile data
```

**Cloudflare Worker benefits:**
- ✅ Free tier: 100k requests/day
- ✅ Built-in KV caching (24h TTL configurable)
- ✅ Great IP reputation (rarely rate-limited)
- ✅ Edge computing (fast responses)
- ✅ Global distribution

---

## 🔧 Configuration

### Cache TTL (Time-To-Live)

Edit `cloudflare-worker.js` to change cache duration:

```javascript
// Current: 24 hours
await env.INSTAGRAM_CACHE.put(cacheKey, JSON.stringify(profile), {
  expirationTtl: 24 * 60 * 60,  // ← Edit this
});
```

Examples:
- `1 * 60 * 60` = 1 hour
- `7 * 24 * 60 * 60` = 7 days
- `0` = no expiration

### Custom Domain

To use a custom domain instead of `workers.dev`:

1. Add your domain to Cloudflare (free plan)
2. In `wrangler.toml`, add routes:

```toml
routes = [
  { pattern = "api.yourdomain.com/instagram/*", zone_name = "yourdomain.com" }
]
```

3. Redeploy: `wrangler publish`

---

## 📈 Monitoring & Logs

### View Real-Time Logs

```bash
wrangler tail
```

Shows live requests and responses from your Worker.

### Monitor KV Cache Usage

Visit your Cloudflare Dashboard → Workers → Storage → KV

You'll see:
- Number of cached profiles
- Cache hit ratio
- Storage usage (free plan: 1GB)

---

## 💡 Troubleshooting

### "CF_WORKER_URL not configured"

Add `CF_WORKER_URL` to your environment variables:

```bash
export CF_WORKER_URL=https://instagram-api-worker.YOUR_DOMAIN.workers.dev
```

### Worker returns 429 (Rate Limited)

Instagram sometimes rate-limits even from Cloudflare IPs. The Worker includes retry logic for 429 errors.

To increase cache hits:
- Increase `cacheTtlHours` in `.env` (API-level cache)
- Increase Worker's `expirationTtl` (Cloudflare KV cache)

### KV Namespace Not Binding

Make sure:
1. Namespace ID matches in `wrangler.toml`
2. Namespace exists: `wrangler kv:namespace list`
3. Redeploy after editing `wrangler.toml`: `wrangler publish`

---

## 💰 Cost Comparison

| Service | Monthly Cost | Notes |
|---------|---|---|
| **Bright Data Proxy** | $5.99 | Residential proxy (older setup) |
| **Cloudflare Workers** | **FREE** | 100k requests/day included |
| **Supabase** | FREE | Up to 500MB storage |
| **Vercel** | FREE | Hobby tier |
| **Total** | **FREE** | ← Full API at no cost! |

---

## 🚀 Next Steps

1. ✅ Deploy Cloudflare Worker
2. ✅ Add `CF_WORKER_URL` to environment
3. ✅ Redeploy your API
4. ✅ Remove `PROXY_URL` and `NODE_TLS_REJECT_UNAUTHORIZED`
5. ✅ Test: `curl "your-api/api/instagram?username=instagram"`

---

## 📚 References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV Storage](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Deploying Existing Projects](https://developers.cloudflare.com/workers/get-started/guide/)

---

**Questions?** Check the logs:

```bash
# Real-time Worker logs
wrangler tail

# Check API logs
npm run build && npm start
```

Status: ✅ Production-ready, zero-cost Instagram API
