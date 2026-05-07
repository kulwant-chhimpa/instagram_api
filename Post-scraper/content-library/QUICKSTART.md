# Quick Setup Guide

This guide gets you running in 5 minutes.

## Installation

```bash
# 1. Navigate to project directory
cd /workspaces/instagram_api/Post-scraper/content-library

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Build TypeScript
npm run build

# 5. Create required directories
mkdir -p data/sessions logs downloads
```

## First Run

```bash
# Open browser and extract tokens (headless=false to see)
npm run example

# Or run with development mode
npm run dev
```

## Verify Installation

```bash
# Check if dist files compiled
ls -la dist/

# Check if browser launches
npx playwright install chromium

# Run basic test
node dist/index.js
```

## Troubleshooting Setup

### Error: "Cannot find module 'playwright'"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Install Playwright browsers
npx playwright install
```

### Error: "Port already in use"

```bash
# Kill any running Node processes
pkill -f node

# Or specify different port
PORT=3001 npm run dev
```

### Error: "Permission denied"

```bash
# Fix directory permissions
chmod -R 755 data logs downloads
```

## Next Steps

1. **Read the full documentation**: [README.md](./README.md)
2. **Try examples**: `npm run example` and `npm run example:batch`
3. **Configure**: Edit `.env` for your needs
4. **Integrate**: Import `InflactService` in your code

## Common Commands

```bash
# Development mode with hot reload
npm run dev

# Build production code
npm run build

# Run examples
npm run example
npm run example:batch

# Clean build
npm run clean

# List saved sessions
node -e "const {SessionStorageManager} = require('./dist/storage/session-storage'); const m = new SessionStorageManager(); console.log(m.listSessions())"
```

## Integration Example

```typescript
import { InflactService } from './src/index';

const service = new InflactService();

async function scrapeProfile(username: string) {
  try {
    await service.initializeBrowser();
    const profile = await service.fetchProfile(username);
    return profile.data;
  } finally {
    await service.close();
  }
}
```

## Support

- Check **logs/app.log** for debug details
- Review **README.md** for comprehensive guidance
- See **examples/** for code samples

---

Ready to go! For more details, see the [full documentation](./README.md). 🚀
