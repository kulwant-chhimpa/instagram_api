# Inflact Browser Session Extractor - Complete Documentation

> Production-grade browser session extractor and API utilization system for Inflact's Instagram Viewer endpoints using Playwright + Node.js

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Quick Start](#quick-start)
5. [Core Modules](#core-modules)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Examples](#examples)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)
11. [Performance & Scaling](#performance--scaling)
12. [Maintenance Strategy](#maintenance-strategy)

---

## Overview

### Purpose

This system automates Instagram data extraction through a real Chromium browser, allowing Inflact's frontend to dynamically generate authentication headers and session tokens. Unlike static request replay, this approach:

- ✅ **Generates tokens dynamically** - leverages browser runtime to create x-client-token and x-client-signature
- ✅ **Maintains session continuity** - persists cookies, localStorage, sessionStorage
- ✅ **Handles Cloudflare** - native browser prevents many anti-bot challenges
- ✅ **Intercepts API requests** - captures real, authenticated requests
- ✅ **Resilient & scalable** - with retry logic, session management, and batching

### Key Features

- Real browser session with dynamic header generation
- Automatic request interception and token extraction
- Session persistence for token reuse
- Intelligent retry with exponential backoff
- Pagination support with cursor handling
- Media download with progress tracking
- Professional logging and error handling
- TypeScript types for type safety
- Modular, testable architecture

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    InflactService (Orchestrator)            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │   Browser        │  │   API            │  │ Data       │ │
│  │   Session        │  │   Executor       │  │ Parser     │ │
│  │   Manager        │  │                  │  │            │ │
│  └───────┬──────────┘  └──────────────────┘  └────────────┘ │
│          │                                                    │
│  ┌──────▼──────────────────┐  ┌──────────────────────────┐   │
│  │ Request Interceptor     │  │ Media Downloader        │   │
│  │ (captures headers/tokens)│  │ (downloads media/metadata)  │
│  └─────────────────────────┘  └──────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         Session Storage Manager (Persistence)          │ │
│  │  - Cookies, localStorage, sessionStorage               │ │
│  │  - Headers (x-client-token, x-client-signature)        │ │
│  │  - Session lifecycle management                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   Chromium Browser Context        │
        │   - Stealth measures applied      │
        │   - Viewport: 1920x1080          │
        │   - JavaScript enabled           │
        │   - No webdriver detection       │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  https://inflact.com              │
        │  - Frontend generates tokens      │
        │  - API requests intercepted       │
        │  - Session maintained            │
        └───────────────────────────────────┘
```

### Module Breakdown

| Module | Purpose | Key Exports |
|--------|---------|------------|
| **BrowserSessionManager** | Lifecycle, page creation, stealth | launch, createPage, initialize |
| **RequestInterceptor** | Capture API requests/responses | initialize, getCaptured*, extractAllTokens |
| **APIExecutor** | Execute API calls with session | fetchProfile, fetchPosts, fetchReels |
| **SessionStorageManager** | Persist/restore session data | saveSession, loadSession, getCookies |
| **DataParser** | Normalize API responses | parseProfile, parsePosts, parseReels |
| **MediaDownloader** | Download media with progress | downloadPost, downloadReel, downloadBatch |
| **InflactService** | Orchestrate all modules | initializeBrowser, fetchProfile*, saveSession |

---

## Installation & Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Linux/Mac/Windows with bash

### Step 1: Install Dependencies

```bash
cd /workspaces/instagram_api/Post-scraper/content-library

# Install all dependencies
npm install

# Verify installation
npm list playwright axios dotenv
```

### Step 2: Build TypeScript

```bash
npm run build

# Output will be in ./dist/
ls dist/
```

### Step 3: Create Environment File

```bash
# Copy example config
cp .env.example .env

# Edit as needed
nano .env
```

### Environment Variables

```env
# Browser Settings
BROWSER_HEADLESS=false              # true for production
BROWSER_SLOWMO=100                  # milliseconds between actions
BROWSER_TIMEOUT=30000               # page timeout
INFLACT_URL=https://inflact.com    # target URL

# Session Storage
SESSION_DATA_PATH=./data/sessions   # where sessions are saved
ENABLE_SESSION_PERSISTENCE=true     # auto-save sessions

# API Configuration
API_RETRY_ATTEMPTS=3                # retry failed requests
API_RETRY_DELAY=1000                # initial retry delay (ms)
API_TIMEOUT=30000                   # request timeout
API_MAX_CONCURRENT_REQUESTS=5       # concurrent requests

# Proxy (optional)
PROXY_URL=                          # proxy server URL
PROXY_USERNAME=                     # proxy username
PROXY_PASSWORD=                     # proxy password

# User Agent Rotation
ROTATE_USER_AGENTS=false            # rotate between different user agents

# Logging
LOG_LEVEL=info                      # debug|info|warn|error
LOG_FILE=./logs/app.log            # log file path

# Media Download
DOWNLOAD_MEDIA=false                # enable media downloading
MEDIA_OUTPUT_PATH=./downloads       # where to save media

# Performance
ENABLE_CACHE=true                   # enable response caching
CACHE_TTL=3600                      # cache time-to-live (seconds)
MAX_BROWSER_POOL_SIZE=3             # max parallel browser instances
```

### Step 4: Create Directories

```bash
mkdir -p data/sessions logs downloads

# Verify
ls -la data/ logs/ downloads/
```

---

## Quick Start

### Basic Usage

```typescript
import { InflactService } from './src/index';

async function main() {
  // Create service
  const service = new InflactService();

  try {
    // Initialize browser with token generation
    await service.initializeBrowser({
      headless: false,  // See browser in action
      slowmo: 100,      // Slow down for visibility
    });

    // Fetch Instagram profile
    const profile = await service.fetchProfile('instagram');

    if (profile.success) {
      console.log(`@${profile.data?.username}`);
      console.log(`Followers: ${profile.data?.followerCount}`);
    }

    // Fetch posts with pagination
    const posts = await service.fetchPosts('instagram');
    console.log(`Posts: ${posts.data?.length}`);

    // Save session for reuse
    await service.saveSession('my_session');

  } finally {
    await service.close();
  }
}

main().catch(console.error);
```

### Running Examples

```bash
# Basic usage with browser setup
npm run example

# Batch scrape multiple users
npm run example:batch

# Load and reuse saved session
npx tsx examples/session-restoration.ts
```

---

## Core Modules

### 1. BrowserSessionManager

Manages browser lifecycle, context, and page setup with stealth measures.

#### Key Methods

```typescript
// Initialize browser and load page
await browserSession.initialize();

// Create isolated page
const page = await browserSession.createPage();

// Navigate to Inflact
await browserSession.navigateToInflact();

// Wait for frontend to generate tokens
await browserSession.waitForDynamicContent();

// Extract session cookies and headers
await browserSession.extractSessionData();

// Refresh tokens
await browserSession.refreshTokens();

// Cleanup
await browserSession.close();
```

#### Features

- Chromium with stealth scripts to avoid detection
- Automatic cookie management
- Session persistence with localStorage/sessionStorage
- Configurable viewport, user-agent, timeout
- Optional proxy support
- Dynamic token refresh on demand

### 2. RequestInterceptor

Intercepts network requests to capture authentication headers and tokens.

#### Key Methods

```typescript
// Initialize interceptor on page
await interceptor.initialize(page);

// Get all captured requests
const requests = interceptor.getCapturedRequests();

// Get latest request with tokens
const latest = interceptor.getLatestCapturedRequest();

// Extract tokens from all requests
const tokens = interceptor.extractAllTokens();

// Get request statistics
const stats = interceptor.getStatistics();
```

#### Captured Data

Each captured request contains:
- URL, method, headers, body
- x-client-token and x-client-signature
- Response status, headers, body
- Timestamp

### 3. APIExecutor

Executes API calls using captured session credentials.

#### Key Methods

```typescript
// Initialize with session
const executor = new APIExecutor(sessionStorage);
executor.setPageContext(page);

// Fetch data with automatic retry
const profile = await executor.fetchProfile(username);
const posts = await executor.fetchPosts(username);
const reels = await executor.fetchReels(username);
const stories = await executor.fetchStories(username);

// Fetch with pagination
const allPosts = await executor.fetchWithPagination(
  (cursor) => executor.fetchPosts(username, cursor),
  5  // max pages
);
```

### 4. SessionStorageManager

Persists and restores session state (cookies, headers, storage).

#### Key Methods

```typescript
// Create new session
const session = manager.createSession(userAgent);

// Save to disk
await manager.saveSession('session_id', session);

// Load from disk
const loaded = await manager.loadSession('session_id');

// Update component data
manager.updateCookies(cookies);
manager.updateHeaders({ 'x-client-token': token });
manager.updateLocalStorage(data);

// Get current session
const current = manager.getCurrentSession();

// Cleanup old sessions
await manager.cleanupOldSessions(7 * 24 * 60 * 60 * 1000);  // 7 days

// List all sessions
const sessions = manager.listSessions();
```

### 5. DataParser

Normalizes API responses into clean TypeScript objects.

#### Key Methods

```typescript
// Parse individual items
const profile = parser.parseProfile(rawData);
const post = parser.parsePost(rawItem);
const reel = parser.parsePost(reelItem);

// Parse arrays
const posts = parser.parsePosts(rawItems);
const reels = parser.parseReels(rawItems);
const stories = parser.parseStories(rawItems);

// Validate parsed data
const isValid = parser.validatePostData(post);
```

### 6. MediaDownloader

Downloads media with progress tracking and batch operations.

#### Key Methods

```typescript
// Download individual items
await downloader.downloadPost(post);
await downloader.downloadReel(reel);
await downloader.downloadStory(story);

// Batch download
await downloader.downloadPostBatch(posts, 'username');
await downloader.downloadReelBatch(reels, 'username');

// Progress tracking
downloader.onProgress((progress) => {
  console.log(`${progress.filename}: ${progress.percentage}%`);
});

// Cleanup
const sizeBytes = downloader.getDirectorySize();
console.log(downloader.formatSize(sizeBytes));
downloader.cleanupOldFiles(7);  // older than 7 days
```

---

## API Reference

### InflactService (Main API)

```typescript
// Initialize
const service = new InflactService(sessionPath, mediaPath);

// Browser
await service.initializeBrowser(config);
await service.loadSession(sessionId, config);
await service.refreshSession();

// Fetching
const profile = await service.fetchProfile(username);
const posts = await service.fetchPosts(username, cursor);
const reels = await service.fetchReels(username, cursor);
const stories = await service.fetchStories(username);
const all = await service.fetchProfileComplete(username);

// Downloading
await service.downloadProfile(profile, includeMedia);
await service.downloadPosts(posts, username);
await service.downloadReels(reels, username);

// Session Management
await service.saveSession(sessionId);
const storage = service.getSessionStorage();
const executor = service.getAPIExecutor();

// Cleanup
await service.close();
```

### Response Types

All fetch methods return:

```typescript
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  cursor?: string;           // for pagination
  hasMore?: boolean;         // more pages available
  rawResponse?: any;         // original axios response
}
```

### Data Types

```typescript
// Profile
interface ProfileData {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  businessCategoryName?: string;
}

// Post/Reel
interface PostData {
  id: string;
  shortcode: string;
  caption: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  likeCount: number;
  commentCount: number;
  owner: { id: string; username: string };
  timestamp: number;
  type: 'image' | 'carousel' | 'video';
}

// Story
interface StoryData {
  id: string;
  image: string;
  video?: string;
  timestamp: number;
  owner: { id: string; username: string };
  hasExpired: boolean;
}
```

---

## Configuration

### BrowserSessionConfig

```typescript
interface BrowserSessionConfig {
  headless?: boolean;           // true for production
  slowmo?: number;              // ms between actions (0 = normal)
  timeout?: number;             // page timeout in ms
  inflactUrl?: string;          // target URL
  proxyServer?: string;         // proxy URL
  userAgent?: string;           // custom user agent
  persistSession?: boolean;     // auto-save session
  sessionPath?: string;         // session storage path
  rotateUserAgents?: boolean;   // rotate user agents
}
```

### Environment Precedence

1. Environment variables (.env file)
2. Process environment (ENV)
3. Config defaults
4. Hard-coded defaults

### Override Priority

```typescript
// Command line
BROWSER_HEADLESS=true npm run dev

// VS code .env
# .env
BROWSER_HEADLESS=false

// Code override
await service.initializeBrowser({ headless: true });
```

---

## Examples

### Example 1: Basic Profile Scraping

```typescript
import { InflactService } from './src/index';

const service = new InflactService();

try {
  await service.initializeBrowser();

  const profile = await service.fetchProfile('instagram');
  console.log(profile.data);

  await service.saveSession('instagram_session');
} finally {
  await service.close();
}
```

### Example 2: Session Reuse

```typescript
const service = new InflactService();

// Load saved session
const loaded = await service.loadSession('instagram_session');

if (loaded) {
  // No need to visit browser, reuse tokens
  const posts = await service.fetchPosts('instagram');
  console.log(posts.data);
}

await service.close();
```

### Example 3: Batch Scraping

```typescript
const service = new InflactService();
await service.initializeBrowser();

const usernames = ['instagram', 'cristiano', 'selenagomez'];

for (const username of usernames) {
  try {
    const all = await service.fetchProfileComplete(username);
    console.log(`@${username}: ${all.posts.length} posts`);

    // Save to file
    fs.writeFileSync(
      `${username}.json`,
      JSON.stringify(all, null, 2)
    );

    // Optional: download media
    await service.downloadPosts(all.posts.slice(0, 5), username);

    // Respect rate limits
    await new Promise(r => setTimeout(r, 2000));
  } catch (error) {
    console.error(`Failed: ${username}`, error);
  }
}

await service.close();
```

### Example 4: With Progress Tracking

```typescript
const service = new InflactService();
const downloader = service.getMediaDownloader();

downloader.onProgress((progress) => {
  const percent = progress.percentage;
  const bar = '█'.repeat(percent / 5) + '░'.repeat(20 - percent / 5);
  console.log(`[${bar}] ${percent}%`);
});

await service.initializeBrowser();

const posts = await service.fetchPosts('instagram');
await service.downloadPosts(posts.data || [], 'instagram');

await service.close();
```

### Example 5: Error Handling & Retry

```typescript
import { InflactService, ErrorCode, InflactError } from './src/index';

const service = new InflactService();

try {
  await service.initializeBrowser();

  // Automatic retry with exponential backoff
  const result = await service.fetchPosts('instagram');

  if (!result.success) {
    console.error(`API Error: ${result.error}`);
    // Logger already captured details
  }

  // If tokens expire, refresh
  if (result.error?.includes('token')) {
    console.log('Refreshing tokens...');
    await service.refreshSession();

    // Retry request
    const retry = await service.fetchPosts('instagram');
    console.log(retry.data);
  }
} catch (error) {
  if (error instanceof InflactError) {
    console.error(`Code: ${error.code}, Message: ${error.message}`);
  }
} finally {
  await service.close();
}
```

---

## Advanced Features

### 1. Request Interception & Token Extraction

The system automatically captures all requests to `/downloader/api/viewer/*`:

```typescript
const browserSession = service.getBrowserSession();
const interceptor = browserSession?.getInterceptor();

// Get all captured requests
const requests = interceptor?.getCapturedRequests();

// Latest captured tokens
const tokens = interceptor?.extractAllTokens();
console.log('Token:', tokens.token);
console.log('Signature:', tokens.signature);

// Statistics
const stats = interceptor?.getStatistics();
console.log(`Captured: ${stats.totalCaptured}`);
console.log(`With tokens: ${stats.withToken}`);
```

### 2. Pagination Handling

Automatically handle cursor-based pagination:

```typescript
const executor = service.getAPIExecutor();

// Fetch all pages automatically
const allPosts = await executor?.fetchWithPagination(
  (cursor) => executor!.fetchPosts('instagram', cursor),
  10  // max 10 pages
);

console.log(`Fetched: ${allPosts?.length} posts across multiple pages`);
```

### 3. Session Persistence

Sessions are automatically saved and can be restored:

```typescript
const manager = service.getSessionStorage();

// Create new session
const session = manager.createSession(userAgent);

// Update components
manager.updateCookies(cookies);
manager.updateHeaders({ 'x-client-token': token });
manager.updateLocalStorage(data);

// Save to disk
await manager.saveSession('my_session', session);

// Later: restore
const loaded = await manager.loadSession('my_session');
if (loaded) {
  console.log(`Cookies: ${loaded.cookies.length}`);
}

// List all saved sessions
const all = manager.listSessions();
console.log('Saved sessions:', all);

// Cleanup old sessions (>7 days)
await manager.cleanupOldSessions(7 * 24 * 60 * 60 * 1000);
```

### 4. Media Download with Progress

```typescript
const downloader = service.getMediaDownloader();

// Track progress
downloader.onProgress((progress) => {
  console.log(
    `${progress.filename}: ${progress.loaded}/${progress.total} bytes`
  );
});

// Download with metadata
const posts = await service.fetchPosts('instagram');
await service.downloadPosts(posts.data || [], 'instagram');

// Check storage usage
const sizeBytes = downloader.getDirectorySize();
console.log(`Downloads: ${downloader.formatSize(sizeBytes)}`);
```

### 5. Stealth Measures & Anti-Detection

Built-in anti-detection techniques:

```typescript
// Applied automatically in BrowserSessionManager:
// ✓ Override navigator.webdriver()
// ✓ Set window.chrome.runtime
// ✓ Mask navigator.plugins
// ✓ Mask navigator.languages
// ✓ Randomized user-agent
// ✓ Realistic viewport (1920x1080)
// ✓ Realistic slowmo delays
```

---

## Troubleshooting

### Issue: "Timeout waiting for API requests"

**Causes:**
- Page didn't load properly
- JavaScript hasn't finished initializing
- Cloudflare challenge

**Solutions:**
```typescript
// Increase timeout
await service.initializeBrowser({
  timeout: 60000,  // 60 seconds
});

// Check if page loaded
const page = service.getBrowserSession()?.getPage();
const title = await page?.title();
console.log('Page title:', title);

// View page screenshot
await page?.screenshot({ path: 'screenshot.png' });
```

### Issue: "Invalid session" errors

**Causes:**
- Tokens expired
- Session corrupted
- Cookies cleared

**Solutions:**
```typescript
// Refresh tokens
await service.refreshSession();

// Or start fresh
await service.close();
await service.initializeBrowser();  // Creates new session
```

### Issue: "Rate limited" (429 errors)

**Causes:**
- Too many rapid requests
- No delay between requests
- Batch size too large

**Solutions:**
```typescript
// Add delays between requests
for (const username of usernames) {
  await service.fetchProfile(username);
  await new Promise(r => setTimeout(r, 2000));  // 2 second delay
}

// Reduce concurrent requests
process.env.API_MAX_CONCURRENT_REQUESTS = '1';

// Implement queue system
```

### Issue: "Cloudflare challenge"

**Causes:**
- IP flagged
- User-agent blocked
- Suspicious pattern

**Solutions:**
```typescript
// Use proxy
process.env.PROXY_URL = 'http://proxy.example.com:8080';

// Rotate user-agent
process.env.ROTATE_USER_AGENTS = 'true';

// Increase slowmo
await service.initializeBrowser({ slowmo: 300 });

// Run headful (browser visible)
await service.initializeBrowser({ headless: false });
```

### Issue: "Download failed" errors

**Causes:**
- URL expired or invalid
- Media removed
- Network issue

**Solutions:**
```typescript
// Check URL before download
const post = parsedPost;
if (!post.imageUrl && !post.videoUrl) {
  console.log('No downloadable media');
  return;
}

// Add retry to downloader (already built-in)
// Already uses axios with retry logic

// Track failed downloads
downloader.onProgress((progress) => {
  if (progress.loaded === 0) {
    console.warn(`Failed: ${progress.filename}`);
  }
});
```

### Debug Logging

Enable detailed logging:

```typescript
process.env.LOG_LEVEL = 'debug';

// Or in code
import { Logger } from './src/utils/logger';
const logger = new Logger('MyModule', 'debug');
```

Check logs:
```bash
tail -f logs/app.log
```

---

## Performance & Scaling

### Performance Optimization

#### 1. Caching

```typescript
process.env.ENABLE_CACHE = 'true';
process.env.CACHE_TTL = '3600';  // 1 hour

// Cache automatically reuses recent responses
const profile1 = await service.fetchProfile('instagram');
const profile2 = await service.fetchProfile('instagram');  // Cached
```

#### 2. Parallel Operations

```typescript
// Fetch multiple users in parallel
const users = ['instagram', 'cristiano', 'selenagomez'];

const results = await Promise.all(
  users.map(u => service.fetchProfileComplete(u))
);
```

#### 3. Pagination Optimization

```typescript
// Fetch specific number of pages instead of all
const posts = await executor?.fetchWithPagination(
  (cursor) => executor!.fetchPosts(username, cursor),
  3  // fetch only 3 pages (not unlimited)
);
```

#### 4. Batch Processing

```typescript
// Process in batches to avoid memory issues
const BATCH_SIZE = 50;
const usernames = load_usernames();  // 10,000 users

for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
  const batch = usernames.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(u => service.fetchProfile(u))
  );

  // Process results
  save_to_database(results);

  // Memory cleanup
  if (i % (BATCH_SIZE * 10) === 0) {
    global.gc?.();  // Force garbage collection
  }
}
```

### Scaling Strategies

#### 1. Browser Pool

Multiple browser instances for parallel scraping:

```typescript
class BrowserPool {
  private services: InflactService[] = [];

  async initialize(poolSize: number) {
    for (let i = 0; i < poolSize; i++) {
      const service = new InflactService();
      await service.initializeBrowser();
      this.services.push(service);
    }
  }

  getAvailable(): InflactService {
    return this.services[Math.floor(Math.random() * this.services.length)];
  }

  async close() {
    await Promise.all(this.services.map(s => s.close()));
  }
}

// Usage
const pool = new BrowserPool();
await pool.initialize(3);  // 3 parallel browsers

for (const user of users) {
  const service = pool.getAvailable();
  const profile = await service.fetchProfile(user);
}

await pool.close();
```

#### 2. Request Queue

Manage rate limits with queue:

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5, interval: 60000, maxSize: 100 });

for (const username of usernames) {
  queue.add(async () => {
    return service.fetchProfile(username);
  });
}

const results = await queue.onIdle();
```

#### 3. Distributed Processing

```typescript
// Use message queue (RabbitMQ, Redis)
// Worker processors
// Result aggregation
```

### Resource Monitoring

```typescript
// Monitor memory
const used = process.memoryUsage();
console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);

// Monitor disk space
downloader.getDirectorySize();

// Cleanup old files
await downloader.cleanupOldFiles(7);  // 7 days
```

---

## Maintenance Strategy

### For Inflact Frontend Changes

The system is designed to adapt to frontend changes:

#### 1. Token Detection

If token names change:

```typescript
// Update in request interceptor
// src/interceptors/request-interceptor.ts
// Look for: 'x-client-token', 'x-client-signature'

// New tokens automatically captured if sent in headers
```

#### 2. API Response Format

If response structure changes:

```typescript
// Update data parser
// src/parsers/data-parser.ts
// Update extractXxx() methods to handle new format

// Example:
private extractImageUrls(item: any): string[] {
  // Add new path if format changed
  if (item.new_media_format?.images) {
    return item.new_media_format.images;
  }
  // Fallback to old format
  return item.image_versions2?.candidates || [];
}
```

#### 3. New Endpoints

If new Inflact endpoints added:

```typescript
// Add to helpers
// src/utils/helpers.ts
export const INFLACT_ENDPOINTS = {
  PROFILE: '/downloader/api/viewer/profile/',
  POSTS: '/downloader/api/viewer/posts/',
  REELS: '/downloader/api/viewer/reels/',
  STORIES: '/downloader/api/viewer/stories/',
  NEW_ENDPOINT: '/downloader/api/viewer/new/',  // Add here
};

// Add to API Executor
// src/api/executor.ts
async fetchNewData(username: string): Promise<APIResponse<any>> {
  return this.executeRequest('/downloader/api/viewer/new/', 'POST', {
    url: username,
  });
}
```

### Monitoring & Alerts

```typescript
// Add monitoring
const logger = new Logger('Monitor');

setInterval(async () => {
  const stats = interceptor?.getStatistics();

  if (!stats?.totalCaptured) {
    logger.warn('No requests captured - frontend may have changed');
    // Send alert
  }

  if (stats.withToken === 0) {
    logger.warn('No tokens captured - token generation may have changed');
    // Send alert
  }
}, 60000);  // Every minute
```

### Version Control

```bash
# Version format: MAJOR.MINOR.PATCH-FRONTEND_VERSION
# Example: 1.0.0-v2024-05-01

git tag -a v1.0.0-inflact-2024-05-01 -m "Compatible with Inflact frontend 2024-05-01"

git log --oneline | head -10  # Track changes
```

---

## Security Considerations

### 1. Session Storage

Sessions contain auth tokens - keep secure:

```bash
# Restrict permissions
chmod 700 data/sessions

# Encrypt if needed
# Use: node-cache with encryption
```

### 2. Proxy Credentials

```bash
# Use environment variables, not hardcoded
# .env (not committed)
PROXY_URL=http://proxy.example.com:8080
PROXY_USERNAME=${PROXY_USER}
PROXY_PASSWORD=${PROXY_PASS}
```

### 3. Rate Limiting

Respect Inflact's rate limits:

```typescript
// Implement backoff
retryStrategy = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// Add jitter
const delay = basedelay + Math.random() * 1000;
```

### 4. User Agent

```typescript
// Rotate user agents to avoid pattern detection
process.env.ROTATE_USER_AGENTS = 'true';

// In code
const ua = getRandomUserAgent();  // from helpers
```

---

## Support & Development

### Running Tests

```bash
npm run test

# Build
npm run build

# Development with hot reload
npm run dev
```

### Directory Structure

```
content-library/
├── src/
│   ├── browser/
│   │   └── session-manager.ts
│   ├── api/
│   │   └── executor.ts
│   ├── interceptors/
│   │   └── request-interceptor.ts
│   ├── storage/
│   │   └── session-storage.ts
│   ├── parsers/
│   │   └── data-parser.ts
│   ├── downloaders/
│   │   └── media-downloader.ts
│   ├── utils/
│   │   ├── types.ts
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   └── index.ts
├── examples/
│   ├── basic-usage.ts
│   ├── batch-scraping.ts
│   └── session-restoration.ts
├── dist/
├── data/
│   └── sessions/
├── downloads/
├── logs/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Final Notes

This system provides a **production-ready, maintainable foundation** for Inflact Instagram scraping. Key strengths:

✅ Real browser automation - generates authentic tokens  
✅ Session persistence - reuse tokens without repeated browser loads  
✅ Error resilience - automatic retry with exponential backoff  
✅ Type safety - full TypeScript support  
✅ Modular design - easy to extend and maintain  
✅ Professional logging - track operations and debug issues  
✅ Scalable - supports batch operations and browser pools  

For questions or issues, check logs first:
```bash
tail -f logs/app.log
```

Good luck! 🚀
