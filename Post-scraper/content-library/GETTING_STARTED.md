# Getting Started - First Time User Guide

Welcome! This guide will get you up and running in **under 10 minutes**.

## Step 1: Installation (2 minutes)

```bash
# Navigate to the project
cd /workspaces/instagram_api/Post-scraper/content-library

# Install dependencies
npm install

# This will take 1-2 minutes as it downloads Playwright and Chromium
```

## Step 2: Setup Environment (1 minute)

```bash
# Copy the example environment file
cp .env.example .env

# Optionally, edit for your needs
# nano .env

# But defaults are fine for most use cases
```

## Step 3: Build TypeScript (1 minute)

```bash
# Compile TypeScript to JavaScript
npm run build

# This creates JavaScript files in the dist/ directory
```

## Step 4: Run Your First Example (3 minutes)

```bash
# Run the basic example (opens browser)
npm run example
```

You should see:
```
🚀 Starting Inflact Browser Session Extractor...

📱 Step 1: Initializing browser session...
✅ Browser session initialized!

💾 Step 2: Saving session...
✅ Session saved!

📊 Step 3: Fetching profile for @instagram...
✅ Profile fetched!
   Username: instagram
   Followers: 640,000,000
   Posts: 12,345
   Bio: Celebrating the world...
```

## Step 5: Explore Examples (2 minutes)

```bash
# Try batch scraping example (scrape multiple users)
npm run example:batch

# Try session restoration (reuse saved sessions)
npx tsx examples/session-restoration.ts
```

---

## 📖 Understanding What Happened

### When you ran `npm run example`:

1. ✅ **Browser Launched** - Chromium opened (or headless on server)
2. ✅ **Navigated to Inflact** - Visited instagram.com viewer
3. ✅ **Tokens Generated** - Frontend created x-client-token and x-client-signature
4. ✅ **Session Saved** - Tokens and cookies saved to `data/sessions/`
5. ✅ **API Called** - Used tokens to fetch real Instagram profile
6. ✅ **Data Parsed** - Raw API response converted to clean TypeScript object
7. ✅ **Results Saved** - JSON file created with profile data

### Key files created:

```
data/sessions/session_*.json    # Your saved session (token reuse!)
results_instagram_*.json        # Profile data
logs/app.log                    # Detailed logs
```

---

## 🎯 Now What? Try This:

### Option A: Fetch a Different User

Edit `examples/basic-usage.ts`:

```typescript
// Line 32: Change 'instagram' to your target username
const username = 'cristiano';  // Change this
```

Then run:
```bash
npm run example
```

### Option B: Use in Your Own Code

```typescript
import { InflactService } from './src/index';

const service = new InflactService();

try {
  // Initialize browser (generates tokens)
  await service.initializeBrowser();

  // Fetch profile
  const profile = await service.fetchProfile('instagram');
  console.log(profile.data);

  // Save for next time
  await service.saveSession('my_session');

} finally {
  await service.close();
}
```

### Option C: Batch Scraping

```bash
npm run example:batch
```

This scrapes 3 profiles efficiently with delays:
- `instagram`
- `cristiano`
- `selenagomez`

---

## 🔧 Debugging

### See what happened

```bash
# View detailed logs
tail -f logs/app.log

# Or just check the file
cat logs/app.log | grep ERROR
```

### Troubleshoot

**Problem:** "Chrome is already running"
```bash
pkill -f chromium
npm run example
```

**Problem:** "Dependencies not installed"
```bash
rm -rf node_modules
npm install
```

**Problem:** "Can't connect to Inflact"
- Check your internet connection
- Inflact.com might be down
- Try with a VPN

---

## 📚 Learn More

### Read These (in order):

1. **QUICKSTART.md** (5 min) - Quick reference
2. **API.md** (10 min) - What functions are available
3. **README.md** (30 min) - Complete guide with examples
4. **ARCHITECTURE.md** (20 min) - How it works internally

### Try These Examples:

```bash
# Basic usage with browser setup
npm run example

# Batch scraping multiple users  
npm run example:batch

# Load saved session (no browser needed!)
npx tsx examples/session-restoration.ts
```

---

## 💡 Pro Tips

### Tip 1: Reuse Sessions (Save Time)

Instead of launching browser every time:

```typescript
const service = new InflactService();

// Load saved session (no browser!)
const loaded = await service.loadSession('my_session');

if (loaded) {
  // Use saved tokens - much faster
  const posts = await service.fetchPosts('instagram');
}
```

### Tip 2: Batch Process Responsibly

Add delays between requests:

```typescript
for (const username of usernames) {
  const profile = await service.fetchProfile(username);
  console.log(profile.data);

  // Wait 2 seconds before next request
  await new Promise(r => setTimeout(r, 2000));
}
```

### Tip 3: Download Media

```typescript
const posts = await service.fetchPosts('instagram');

if (posts.data) {
  // Download first 5 posts
  await service.downloadPosts(posts.data.slice(0, 5), 'instagram');

  // Check what was downloaded
  ls downloads/
}
```

### Tip 4: Handle Errors Gracefully

```typescript
try {
  const profile = await service.fetchProfile('instagram');

  if (!profile.success) {
    console.error('API Error:', profile.error);
    // Automatically retried 3 times already
  }

} catch (error) {
  console.error('Fatal error:', error);
  // Check logs for details
}
```

---

## 🚀 Ready for Production?

Before deploying:

1. ✅ Test with multiple users
2. ✅ Check `logs/app.log` for warnings
3. ✅ Configure `.env` for your environment
4. ✅ Set `BROWSER_HEADLESS=true` for servers
5. ✅ Implement rate limiting (add delays)
6. ✅ Monitor token expiration (refresh if needed)

---

## 📞 If Something Goes Wrong

**Check in this order:**

1. **Logs** - `tail logs/app.log`
   - Most errors are logged here with full details

2. **Environment** - `cat .env`
   - Make sure configuration looks right

3. **Dependencies** - `npm list`
   - Verify all packages installed

4. **Documentation** - `README.md` → search for error message
   - Comprehensive troubleshooting section

5. **Examples** - `cat examples/basic-usage.ts`
   - Working code to reference

---

## ✨ You're Ready!

You now have a **production-ready Instagram scraping system**.

### Quick Reference:

```
# Setup
npm install && npm run build

# First run
npm run example

# Your code
npm run dev
#  or
node dist/index.js

# Logs
tail -f logs/app.log
```

### Next Steps:

- [ ] Run `npm run example` ✅ (you're here)
- [ ] Try batch scraping: `npm run example:batch`
- [ ] Load saved session: `npx tsx examples/session-restoration.ts`
- [ ] Create your own script
- [ ] Deploy to production

---

## 🎉 Congratulations!

You're now using the Inflact Browser Session Extractor. The system will:

✅ Open a real browser  
✅ Let frontend generate tokens  
✅ Intercept and extract authentication  
✅ Save sessions for token reuse  
✅ Fetch Instagram profiles, posts, reels, stories  
✅ Download media automatically  
✅ Handle errors with smart retry logic  
✅ Log everything for debugging  

**Enjoy! 🚀**

---

For more details:
- [README.md](./README.md) - Complete guide
- [API.md](./API.md) - All functions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - How it works
- [examples/](./examples/) - More code samples
