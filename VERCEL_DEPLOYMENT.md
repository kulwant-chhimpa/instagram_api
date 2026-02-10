# Vercel Deployment Guide

## Prerequisites

- Vercel account (free at https://vercel.com)
- GitHub account (repo should be pushed)
- Bright Data proxy credentials (from your .env)
- Supabase credentials (if using image storage)

---

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Add Instagram API with Vercel config"
git push origin main
```

---

## Step 2: Connect to Vercel

### Option A: Deploy via CLI (Fastest)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod
```

### Option B: Connect GitHub to Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel auto-detects: Node.js + Express ✅
5. Click **"Deploy"** (we'll add env vars next)

---

## Step 3: Add Environment Variables

### In Vercel Dashboard

1. **Project Settings** → **Environment Variables**
2. Add these variables (from your `.env`):

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` | |
| `PROXY_URL` | Your Bright Data URL | `http://brd-customer-...:...@brd.superproxy.io:33335` |
| `PORT` | `3000` | (Vercel sets this automatically) |
| `SUPABASE_URL` | Your Supabase URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | `eyJhbGc...` |
| `CACHE_TTL_HOURS` | `24` | (optional) |

**Important:** Never commit `.env` to GitHub — only use Vercel's environment variables.

---

## Step 4: Redeploy with Environment Variables

After adding env vars in the dashboard:

```bash
vercel --prod
```

Or trigger a redeployment from the Vercel dashboard:
- Go to **Deployments**
- Click **"..." menu on latest deployment**
- Select **"Redeploy"**

---

## Step 5: Test Your Deployment

```bash
# Get your deployment URL from Vercel dashboard
# It should be something like: https://instagram-api-xyz.vercel.app

# Test health check
curl https://instagram-api-xyz.vercel.app/health | jq

# Test profile lookup
curl "https://instagram-api-xyz.vercel.app/api/instagram?username=instagram" | jq
```

---

## Vercel Deployment Structure

Your deployed app will:
- Run on Vercel's global edge network
- Auto-scale based on traffic
- Get HTTPS automatically
- Run on Node.js 20 runtime

Expected URLs:
- **Health:** `https://instagram-api-xyz.vercel.app/health`
- **API:** `https://instagram-api-xyz.vercel.app/api/instagram?username=...`

---

## Environment Variables Reference

```bash
# Required - Bright Data Proxy
PROXY_URL=http://brd-customer-hl_889b164b-zone-residential_proxy1:gs95wzge7vp6@brd.superproxy.io:33335

# Required for TLS (proxy uses self-signed cert)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Optional - Supabase Image Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
PORT=3000
CACHE_TTL_HOURS=24
NODE_ENV=production
```

---

## Troubleshooting Vercel Deployments

### Build Fails

Check build logs in Vercel dashboard:
- **Deployments** → Click failed deploy → **View Logs**

Common issues:
- Missing dependencies: `npm install` and commit `package-lock.json`
- TypeScript errors: Run `npm run build` locally first

### 429 Rate Limit Errors in Production

1. Check Bright Data proxy is added to env vars
2. Make sure `PROXY_URL` value is complete and correct
3. Redeploy: `vercel --prod`

### 502/503 Errors

- Check logs in Vercel dashboard
- Verify Bright Data proxy is accessible
- Check SUPABASE_URL is valid
- Try `vercel --prod` again

### Environment Variables Not Applied

```bash
# Redeploy to apply env var changes
vercel --prod

# Or from dashboard: Deployments → Redeploy
```

---

## Monitoring & Logs

### View Deployment Logs

```bash
# Via CLI
vercel logs https://instagram-api-xyz.vercel.app

# Via Dashboard
# Deployments → Your Deploy → Function Logs
```

### Analytics

Check in Vercel dashboard:
- **Analytics** tab
- Request count, response times
- Edge network performance

---

## Custom Domain (Optional)

1. **Project Settings** → **Domains**
2. Add your domain (e.g., `api.example.com`)
3. Update DNS records per Vercel instructions
4. Verify domain

Now accessible at: `https://api.example.com/api/instagram?username=...`

---

## Continuous Deployment

Once GitHub is connected:
- Every `git push` to `main` → Auto-deploys
- Pull requests → Preview deployments
- Rollback to previous version anytime

```bash
# Deploy new code
git commit -am "Update API"
git push origin main
# → Vercel auto-deploys in ~2 minutes
```

---

## Cost Estimate

| Component | Cost |
|-----------|------|
| **Vercel** | Free (Hobby plan) |
| **Bright Data Proxy** | $5.99/month |
| **Supabase** | Free (up to 500MB storage) |
| **Total** | ~$6/month |

Perfect for 100-1000 req/day! 💰

---

## Quick Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables added:
  - [ ] `PROXY_URL`
  - [ ] `NODE_TLS_REJECT_UNAUTHORIZED=0`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Redeployed after env vars
- [ ] Test endpoints:
  - [ ] `/health`
  - [ ] `/api/instagram?username=instagram`
- [ ] Custom domain configured (optional)

---

## Support & Debugging

### Vercel Docs
- https://vercel.com/docs/concepts/deployments/overview

### Environment Variables
- https://vercel.com/docs/projects/environment-variables

### Node.js on Vercel
- https://vercel.com/docs/runtimes/nodejs

### Still having issues?

1. Check Vercel logs (Dashboard → Deployments → Logs)
2. Test locally first: `npm run build && npm start`
3. Make sure all env vars are set correctly
4. Try redeploying: `vercel --prod`

---

**Your Instagram API is ready for production! 🚀**
