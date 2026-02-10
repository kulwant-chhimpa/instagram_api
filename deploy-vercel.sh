#!/usr/bin/env bash

# Instagram API → Vercel Deployment Script
# Quick setup for Vercel deployment in 3 steps

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Instagram API → Vercel Deployment Helper                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found. Install Node.js from https://nodejs.org"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ git not found"
  exit 1
fi

echo "✅ npm and git installed"
echo ""

# Step 2: Prepare code
echo "🔨 Building for production..."
npm run build --silent 2>/dev/null && echo "✅ Build successful" || {
  echo "❌ Build failed. Fix errors and try again."
  exit 1
}

echo ""
echo "📝 Checking .env..."
if [ ! -f ".env" ]; then
  echo "⚠️  .env file not found!"
  echo "   Copy .env.example → .env and fill in your credentials"
  exit 1
fi

grep -q "PROXY_URL" .env && echo "✅ PROXY_URL configured" || echo "⚠️  PROXY_URL not set in .env"
grep -q "SUPABASE_URL" .env && echo "✅ SUPABASE_URL configured" || echo "⚠️  SUPABASE_URL not configured (optional)"

echo ""
echo "🚀 Ready to deploy to Vercel!"
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  Push code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Instagram API ready for Vercel'"
echo "   git push origin main"
echo ""
echo "2️⃣  Deploy to Vercel (choose one):"
echo ""
echo "   Option A - Via Dashboard (Recommended):"
echo "   → Go to https://vercel.com/dashboard"
echo "   → Click 'Add New' → 'Project'"
echo "   → Import your GitHub repository"
echo "   → Vercel auto-detects Express.js"
echo "   → Click 'Deploy' (we'll add env vars next)"
echo ""
echo "   Option B - Via CLI:"
echo "   npm i -g vercel"
echo "   vercel --prod"
echo ""
echo "3️⃣  Add Environment Variables in Vercel:"
echo "   Dashboard → Project Settings → Environment Variables"
echo ""
echo "   Variable List:"
cat << 'VARS'
   • NODE_TLS_REJECT_UNAUTHORIZED = 0
   • PROXY_URL = (from your .env)
   • SUPABASE_URL = (optional)
   • SUPABASE_SERVICE_ROLE_KEY = (optional)
   • CACHE_TTL_HOURS = 24 (optional)
VARS

echo ""
echo "4️⃣  Redeploy with env vars:"
echo "   vercel --prod"
echo ""
echo "5️⃣  Test your deployment:"
echo "   curl https://YOUR-PROJECT.vercel.app/health"
echo "   curl 'https://YOUR-PROJECT.vercel.app/api/instagram?username=instagram'"
echo ""
echo "📚 For detailed help, see: VERCEL_DEPLOYMENT.md"
echo ""
