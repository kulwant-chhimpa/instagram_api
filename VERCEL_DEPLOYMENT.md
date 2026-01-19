# Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- This repository pushed to GitHub

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

4. Add Environment Variables (IMPORTANT):
   - Click "Environment Variables"
   - Add the following:
     - `SUPABASE_URL` = `https://eegjuaievtwuatiswjtt.supabase.co`
     - `SUPABASE_KEY` = `your-service-role-key`
     - `SUPABASE_BUCKET` = `Plixi-Endpoints`

5. Click "Deploy"

## Step 3: Test Your Deployment

After deployment, you'll get a URL like: `https://your-project.vercel.app`

Test it:
```bash
curl "https://your-project.vercel.app/ig-search?username=nasa"
```

Expected response:
```json
{
  "imageUrl": "https://eegjuaievtwuatiswjtt.supabase.co/storage/v1/object/public/Plixi-Endpoints/profiles/nasa-xxxxx.jpg",
  "followers": 98095957,
  "following": 92
}
```

## API Usage

### Endpoint
```
GET https://your-project.vercel.app/ig-search?username=USERNAME
```

### Parameters
- `username` (required) - Instagram username to search

### Response
```json
{
  "imageUrl": "https://supabase-url/...",
  "followers": 123456,
  "following": 789
}
```

### Error Response
```json
{
  "exists": false
}
```

## Environment Variables Required

Make sure these are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_KEY` (use service role key)
- `SUPABASE_BUCKET`

## Rate Limiting
- 30 requests per minute per IP
- Cached responses for 12 hours

## Notes
- Images are automatically uploaded to Supabase
- First request downloads and stores the image
- Subsequent requests use cached Supabase URL
- Cache expires after 12 hours
