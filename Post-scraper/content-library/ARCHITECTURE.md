# Implementation Guide & Architecture Deep Dive

This guide explains how the system works internally and how to extend it.

## System Flow Diagram

```
User Application
    ↓
    ├─→ InflactService.initializeBrowser()
    │   ↓
    │   ├─→ BrowserSessionManager.launch()
    │   │   └─→ chromium.launch()
    │   │
    │   ├─→ BrowserSessionManager.createPage()
    │   │   ├─→ context.newPage()
    │   │   ├─→ RequestInterceptor.initialize()
    │   │   └─→ page.route('**/*', ...)
    │   │
    │   ├─→ BrowserSessionManager.navigateToInflact()
    │   │   └─→ page.goto(inflactUrl)
    │   │
    │   ├─→ BrowserSessionManager.waitForDynamicContent()
    │   │   └─→ waitFor(() => interceptor.capturedRequests.length > 0)
    │   │
    │   └─→ BrowserSessionManager.extractSessionData()
    │       ├─→ context.cookies()
    │       ├─→ page.evaluate(localStorage)
    │       ├─→ page.evaluate(sessionStorage)
    │       ├─→ interceptor.extractAllTokens()
    │       └─→ SessionStorageManager.update*()
    │
    ├─→ InflactService.fetchProfile(username)
    │   └─→ APIExecutor.fetchProfile()
    │       ├─→ buildHeaders() [adds x-client-token, x-client-signature]
    │       ├─→ buildCookieHeader()
    │       ├─→ executeRequest() [with retry logic]
    │       └─→ return { success, data }
    │
    └─→ InflactService.downloadPosts(posts, username)
        └─→ MediaDownloader.downloadPostBatch()
            ├─→ downloadFile(url) [with progress]
            └─→ save metadata.json
```

## Module Interaction

### 1. Initialization Flow

```
START
  ↓
launch() {
  - Open Chromium browser
  - Create browser context
  - Apply stealth measures
}
  ↓
createPage() {
  - Create isolated page
  - Set viewport, timeout
  - Initialize RequestInterceptor
}
  ↓
navigateToInflact() {
  - page.goto(inflact.com)
  - Wait for DOMContentLoaded
  - Frontend JS initializes...
}
  ↓
waitForDynamicContent() {
  - Loop: check interceptor.capturedRequests
  - Wait for: status.totalCaptured > 0 && withToken > 0
  - Continue when Inflact generated tokens
}
  ↓
extractSessionData() {
  - Get cookies from context
  - Get localStorage via page.evaluate()
  - Get sessionStorage via page.evaluate()
  - Extract tokens from interceptor
  - Save to SessionStorageManager
}
  ↓
READY
```

### 2. Request Interception Mechanism

```
page.route('**/*', async (route) => {
  request = route.request()
  
  if (urlMatches(request.url, '/downloader/api/viewer/')) {
    // Capture request details
    captureRequest(request) {
      - Extract URL, method, headers, body
      - Look for x-client-token and x-client-signature
      - Store in Map<requestId, CapturedAPIRequest>
    }
  }
  
  route.continue()
})

page.on('response', async (response) => {
  url = response.url()
  
  if (urlMatches(url, '/downloader/api/viewer/')) {
    // Capture response details
    captureResponse(response) {
      - Extract status, headers, body
      - Parse JSON if applicable
      - Update CapturedAPIRequest with response
    }
  }
})
```

### 3. API Execution Flow

```
fetchProfile(username) {
  ↓
  buildHeaders() {
    headers = {
      'User-Agent': userAgent,
      'x-client-token': sessionStorage.getHeader('x-client-token'),
      'x-client-signature': sessionStorage.getHeader('x-client-signature'),
      ...
    }
  }
  ↓
  buildCookieHeader() {
    cookies = sessionStorage.getCookies()
    header = "cookie1=value1; cookie2=value2; ..."
  }
  ↓
  retry(async () => {
    executeRequest(endpoint, 'POST', formData, {
      headers,
      cookies,
      ... [axios config]
    })
    
    if (status >= 400) throw error
    return response
  }, retryStrategy)
  ↓
  transform response {
    profileData = parseProfile(response.data)
    return { success: true, data: profileData }
  }
}
```

### 4. Session Persistence

```
SessionStorageManager maintains in-memory state:

SessionStorage {
  cookies: [
    { name: 'ig_nrcb', value: '1', domain: '.instagram.com', ... },
    ...
  ],
  localStorage: {
    '_js_datr': 'value...',
    'ig_device_id': 'value...',
    ...
  },
  sessionStorage: {
    'sessionKey': 'sessionValue',
    ...
  },
  headers: {
    'x-client-token': 'token_value',
    'x-client-signature': 'sig_value'
  },
  userAgent: 'Mozilla/5.0...',
  timestamp: 1620000000000,
  expiresAt: 1620086400000
}

When saveSession(id, session) called:
  - Serialize to JSON
  - Write to data/sessions/{id}.json
  
When loadSession(id) called:
  - Read from data/sessions/{id}.json
  - Check expiresAt - return null if expired
  - Parse JSON back to SessionStorage object
  - Load cookies back to context
```

## Error Handling Strategy

### Classification

```typescript
classifyError(error) {
  if (includes('Cloudflare')) → CLOUDFLARE_CHALLENGE
  if (includes('token')) → EXPIRED_TOKEN
  if (status === 401) → INVALID_SESSION
  if (status === 429) → RATE_LIMITED
  if (includes('cookie')) → MISSING_COOKIES
  if (includes('timeout')) → TIMEOUT
  ...
}
```

### Retry Logic

```typescript
async retry(fn, strategy) {
  delay = strategy.initialDelay
  
  for (attempt = 1 to maxAttempts {
    try {
      return await fn()
    } catch (error) {
      code = classifyError(error)
      
      if (isRecoverableError(code)) {
        if (attempt < maxAttempts) {
          await sleep(delay)
          delay = Math.min(delay * backoffMultiplier, maxDelay)
        }
      } else {
        throw error  // Non-recoverable
      }
    }
  }
}
```

### Recovery Actions

```
ERROR                           ACTION
─────────────────────────────────────────────────────────
CLOUDFLARE_CHALLENGE      → Wait for page to load
EXPIRED_TOKEN             → refreshTokens() or reinitialize
RATE_LIMITED (429)        → Wait + exponential backoff
TIMEOUT                   → Retry with longer timeout
INVALID_SESSION (401)     → Reinitialize browser
NETWORK_ERROR             → Retry with backoff
MISSING_COOKIES           → Restore from session or reinitialize
```

## Data Transformation Pipeline

```
API Response (Raw)
    ↓
    ├─→ DataParser.parseProfile()
    │   ├─→ Extract: id, username, followers, bio, profile_pic
    │   ├─→ Normalize field names (snake_case → camelCase)
    │   ├─→ Parse counts to numbers
    │   └─→ Return: ProfileData object
    │
    ├─→ DataParser.parsePost()
    │   ├─→ Extract: id, caption, images, videos, likes, comments
    │   ├─→ extractImageUrls() - handle carousel, single, array formats
    │   ├─→ extractVideoUrls() - handle multiple video formats
    │   ├─→ parseTimestamp() - convert epoch to milliseconds
    │   ├─→ extractOwner() - get user info
    │   └─→ Return: PostData object
    │
    └─→ Validation
        ├─→ validatePostData() - ensure ID, owner, media
        ├─→ validateProfile() - ensure ID, username
        └─→ Filter null/invalid items
        
Normalized Data Output
```

## Extending the System

### Adding a New Endpoint

```typescript
// 1. Add endpoint to helpers
// src/utils/helpers.ts
export const INFLACT_ENDPOINTS = {
  ...existing,
  HIGHLIGHTS: '/downloader/api/viewer/highlights/',
};

// 2. Add fetch method to APIExecutor
// src/api/executor.ts
async fetchHighlights(username: string): Promise<APIResponse<HighlightData[]>> {
  const formData = createFormData({ url: username });
  
  const response = await this.executeRequest<any>(
    INFLACT_ENDPOINTS.HIGHLIGHTS,
    'POST',
    formData
  );
  
  if (!response.success) return response;
  
  const highlights = this.parseHighlightsResponse(response.data);
  return { ...response, data: highlights };
}

// 3. Add parser to DataParser
// src/parsers/data-parser.ts
parseHighlights(items: any[]): HighlightData[] {
  return items.map(item => ({
    id: item.id,
    name: item.title,
    items: this.parseStories(item.stories),
    thumbnail: item.cover_media?.image_url,
  }));
}

// 4. Add to InflactService
// src/index.ts
async fetchHighlights(username: string): Promise<APIResponse<HighlightData[]>> {
  if (!this.apiExecutor) throw new Error('Not initialized');
  return this.apiExecutor.fetchHighlights(username);
}

// 5. Use it
const highlights = await service.fetchHighlights('instagram');
```

### Adding Caching

```typescript
// src/utils/cache.ts
import NodeCache from 'node-cache';

export class CacheManager {
  private cache = new NodeCache();
  
  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }
  
  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value, ttl ?? 3600);
  }
  
  clear(): void {
    this.cache.flushAll();
  }
}

// In APIExecutor:
private cache = new CacheManager();

async fetchProfile(username: string): Promise<APIResponse<ProfileData>> {
  const cacheKey = `profile:${username}`;
  
  const cached = this.cache.get<APIResponse<ProfileData>>(cacheKey);
  if (cached) {
    this.logger.debug('Cache hit: ' + cacheKey);
    return cached;
  }
  
  const response = await this.executeRequest(...);
  this.cache.set(cacheKey, response);
  
  return response;
}
```

### Adding WebSocket Monitoring

```typescript
// src/utils/monitor.ts
import { EventEmitter } from 'events';

export class RequestMonitor extends EventEmitter {
  async monitorPage(page: Page) {
    page.on('response', (response) => {
      this.emit('response', {
        url: response.url(),
        status: response.status(),
        timestamp: Date.now(),
      });
    });
    
    page.on('requestfailed', (request) => {
      this.emit('request-failed', {
        url: request.url(),
        failure: request.failure(),
        timestamp: Date.now(),
      });
    });
  }
}

// Usage
const monitor = new RequestMonitor();
monitor.on('response', (event) => {
  console.log(`Response: ${event.status} ${event.url}`);
});
await monitor.monitorPage(page);
```

### Adding a Message Queue

```typescript
// For batch processing with queue
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 5,              // 5 parallel operations
  interval: 1000,              // per 1 second
  maxSize: 100,               // max 100 queued items
});

for (const username of usernames) {
  queue.add(() => service.fetchProfile(username));
}

const results = await queue.onIdle();
```

## Performance Considerations

### Memory Management

```typescript
// 1. Limit concurrent browser instances
const MAX_BROWSERS = 3;
const activeBrowsers: BrowserSessionManager[] = [];

// 2. Clear request interceptor cache periodically
setInterval(() => {
  interceptor.clearCapturedRequests();
}, 60000);  // Every minute

// 3. Cleanup old sessions
setInterval(async () => {
  await sessionStorage.cleanupOldSessions(7 * 24 * 60 * 60 * 1000);
}, 24 * 60 * 60 * 1000);  // Daily

// 4. Monitor memory
if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
  global.gc?.();  // Force GC if available (--expose-gc)
}
```

### Connection Pooling

```typescript
// Reuse HTTP connection
const httpClient = axios.create({
  baseURL: 'https://inflact.com',
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 30000,
});
```

### Batch Processing Best Practices

```typescript
// Process in chunks to avoid memory issues
async function batchProcess(items: any[], batchSize: number) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch
    const results = await Promise.all(
      batch.map(item => process(item))
    );
    
    // Save immediately (don't accumulate)
    await saveResults(results);
    
    // Clear memory
    results.length = 0;
    
    // Rate limit between batches
    await sleep(500);
  }
}
```

## Testing Strategy

```typescript
// Unit tests for parsers
describe('DataParser', () => {
  it('should parse profile correctly', () => {
    const parser = new DataParser();
    const profile = parser.parseProfile({ id: '1', username: 'test' });
    expect(profile.username).toBe('test');
  });
});

// Integration tests for API
describe('APIExecutor', () => {
  it('should fetch profile with headers', async () => {
    const executor = new APIExecutor(sessionStorage);
    const response = await executor.fetchProfile('instagram');
    expect(response.success).toBe(true);
  });
});

// E2E tests for full flow
describe('InflactService', () => {
  it('should initialize and fetch profile', async () => {
    const service = new InflactService();
    await service.initializeBrowser();
    
    const profile = await service.fetchProfile('instagram');
    
    expect(profile.success).toBe(true);
    expect(profile.data?.username).toBe('instagram');
    
    await service.close();
  });
});
```

## Debugging Tips

### Enable All Logging

```bash
LOG_LEVEL=debug npm run dev

# Or in code
process.env.LOG_LEVEL = 'debug';
```

### Browser Screenshots & Videos

```typescript
// Screenshot
await page.screenshot({ path: 'screenshot.png' });

// Video (see Playwright docs for setup)
const context = await browser.newContext({ recordVideo: { dir: 'videos' } });
```

### Request Inspection

```typescript
const interceptor = browserSession.getInterceptor();

// All captured requests
console.log(interceptor.getCapturedRequests());

// Latest with tokens
const latest = interceptor.getLatestCapturedRequest();
console.log('Token:', latest?.extractedToken);
console.log('Signature:', latest?.extractedSignature);

// Statistics
console.log(interceptor.getStatistics());
```

### Session Inspection

```typescript
const session = sessionStorage.getCurrentSession();
console.log('Cookies:', session?.cookies.length);
console.log('Headers:', session?.headers);
console.log('localStorage keys:', Object.keys(session?.localStorage || {}));
```

---

This architecture is designed to be:
- **Modular** - each component is independent
- **Testable** - clear interfaces and dependencies
- **Extensible** - easy to add new features
- **Maintainable** - well-organized, commented code
- **Scalable** - supports batch operations and multiple instances

For questions about specific modules, refer to their inline documentation. 🚀
