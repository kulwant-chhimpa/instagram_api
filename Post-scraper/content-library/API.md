# API Reference

Quick reference for all exported functions and types.

## Main Service

### InflactService

```typescript
import { InflactService } from '@inflact-scraper/content-library';

const service = new InflactService(sessionPath?, mediaPath?);

// Browser
await service.initializeBrowser(config?: BrowserSessionConfig);
await service.loadSession(sessionId: string, config?: BrowserSessionConfig): Promise<boolean>;
await service.refreshSession();

// Fetch Data
const profile = await service.fetchProfile(username: string);
const posts = await service.fetchPosts(username: string, cursor?: string, parseData?: boolean);
const reels = await service.fetchReels(username: string, cursor?: string, parseData?: boolean);
const stories = await service.fetchStories(username: string, parseData?: boolean);
const all = await service.fetchProfileComplete(username: string);

// Download
await service.downloadProfile(profile: ProfileData, includeMedia?: boolean);
await service.downloadPosts(posts: PostData[], username: string);
await service.downloadReels(reels: ReelData[], username: string);

// Management
await service.saveSession(identifier?: string);
await service.close();

// Access sub-modules
service.getMediaDownloader(): MediaDownloader;
service.getDataParser(): DataParser;
service.getSessionStorage(): SessionStorageManager;
service.getBrowserSession(): BrowserSessionManager | null;
service.getAPIExecutor(): APIExecutor | null;
```

## Response Types

```typescript
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  cursor?: string;
  hasMore?: boolean;
  rawResponse?: any;
}

// Profile Data
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
  url?: string;
  rawData?: any;
}

// Post/Reel Data
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
  viewCount?: number;
  owner: { id: string; username: string };
  timestamp: number;
  type: 'image' | 'carousel' | 'video';
  rawData?: any;
}

interface ReelData extends PostData {
  type: 'video';
  viewCount: number;
  playCount?: number;
}

// Story Data
interface StoryData {
  id: string;
  image: string;
  video?: string;
  timestamp: number;
  owner: { id: string; username: string };
  hasExpired: boolean;
  rawData?: any;
}
```

## Sub-Modules

### BrowserSessionManager

```typescript
import { BrowserSessionManager } from '@inflact-scraper/content-library';

const manager = new BrowserSessionManager(sessionStorage, config?);

// Lifecycle
await manager.launch();
await manager.createPage();
await manager.initialize();
await manager.close();

// Navigation
await manager.navigateToInflact();
await manager.waitForDynamicContent();

// Session
await manager.extractSessionData();
await manager.restoreSessionCookies();
await manager.refreshTokens();

// Utilities
manager.evaluate<T>(pageFunction, ...args): Promise<T>;
manager.getPage(): Page | null;
manager.getContext(): BrowserContext | null;
manager.getInterceptor(): RequestInterceptor;
manager.getSessionStorage(): SessionStorageManager;
manager.isReady(): boolean;
```

### APIExecutor

```typescript
import { APIExecutor } from '@inflact-scraper/content-library';

const executor = new APIExecutor(sessionStorage, baseUrl?, retryAttempts?);

executor.setPageContext(page: Page);

// Fetch
const profile = await executor.fetchProfile(username: string);
const posts = await executor.fetchPosts(username: string, cursor?: string);
const reels = await executor.fetchReels(username: string, cursor?: string);
const stories = await executor.fetchStories(username: string);

// Advanced
const all = await executor.fetchWithPagination<T>(
  fetchFn: (cursor: string) => Promise<APIResponse<T[]>>,
  maxPages?: number
);

// Internal
const response = await executor.executeRequest<T>(
  endpoint: string,
  method?: string,
  data?: any,
  config?: AxiosRequestConfig
);
```

### DataParser

```typescript
import { DataParser } from '@inflact-scraper/content-library';

const parser = new DataParser();

// Parse
const profile = parser.parseProfile(data: any): ProfileData | null;
const post = parser.parsePost(item: any): PostData | null;
const posts = parser.parsePosts(items: any[]): PostData[];
const reels = parser.parseReels(items: any[]): ReelData[];
const stories = parser.parseStories(items: any[]): StoryData[];

// Validation
const valid = parser.validatePostData(post: PostData): boolean;
const valid = parser.validateProfile(profile: ProfileData): boolean;
```

### SessionStorageManager

```typescript
import { SessionStorageManager } from '@inflact-scraper/content-library';

const manager = new SessionStorageManager(sessionPath?: string);

// Session
const session = manager.createSession(userAgent: string);
await manager.saveSession(identifier: string, session: SessionStorage);
const loaded = await manager.loadSession(identifier: string): Promise<SessionStorage | null>;

// Cookies
manager.updateCookies(cookies: CookieObject[]);
const cookies = manager.getCookies(): CookieObject[];
const cookie = manager.getCookie(name: string): CookieObject | undefined;
manager.setCookie(cookie: CookieObject);

// Headers
manager.updateHeaders(headers: SessionHeaders);
const headers = manager.getHeaders(): SessionHeaders;

// Storage
manager.updateLocalStorage(data: Record<string, string>);
const data = manager.getLocalStorage(): Record<string, string>;
manager.updateSessionStorage(data: Record<string, string>);
const data = manager.getSessionStorage(): Record<string, string>;

// Management
const current = manager.getCurrentSession(): SessionStorage | null;
await manager.deleteSession(identifier: string);
const sessions = manager.listSessions(): string[];
await manager.cleanupOldSessions(ageMs?: number);
manager.clearSession();
```

### MediaDownloader

```typescript
import { MediaDownloader } from '@inflact-scraper/content-library';

const downloader = new MediaDownloader(outputPath?: string);

downloader.onProgress(callback: (progress: DownloadProgress) => void);

// Download
await downloader.downloadFile(url: string, filename: string): Promise<string>;
await downloader.downloadPost(post: PostData, subdir?: string);
await downloader.downloadReel(reel: ReelData, subdir?: string);
await downloader.downloadStory(story: StoryData, subdir?: string);
await downloader.downloadProfilePicture(profile: ProfileData);

// Batch
await downloader.downloadPostBatch(posts: PostData[], subdir?: string);
await downloader.downloadReelBatch(reels: ReelData[], subdir?: string);

// Utilities
downloader.getOutputDirectory(): string;
const bytes = downloader.getDirectorySize(dir?: string): number;
downloader.formatSize(bytes: number): string;
downloader.cleanupOldFiles(olderThanDays?: number);
```

### RequestInterceptor

```typescript
import { RequestInterceptor } from '@inflact-scraper/content-library';

const interceptor = new RequestInterceptor(config?: Partial<RequestInterceptorConfig>);

await interceptor.initialize(page: Page);

// Get Data
const requests = interceptor.getCapturedRequests(): CapturedAPIRequest[];
const request = interceptor.getCapturedRequest(id: string): CapturedAPIRequest | undefined;
const latest = interceptor.getLatestCapturedRequest(): CapturedAPIRequest | undefined;
const filtered = interceptor.getCapturedRequestsByUrl(pattern: RegExp | string): CapturedAPIRequest[];

// Extract
const tokens = interceptor.extractAllTokens(): { token?: string; signature?: string };

// Statistics
const stats = interceptor.getStatistics();

// Cleanup
interceptor.clearCapturedRequests();
```

## Utility Functions

### Helpers

```typescript
import {
  getRandomUserAgent,
  getUserAgent,
  getAllUserAgents,
  generateRequestId,
  generateSessionId,
  safeJsonParse,
  safeJsonStringify,
  deepClone,
  urlMatches,
  extractDomain,
  createFormData,
  waitFor,
  normalizeHeaders,
  INFLACT_ENDPOINTS,
  INTERCEPTOR_PATTERNS,
} from '@inflact-scraper/content-library';
```

### Errors & Retry

```typescript
import {
  InflactError,
  ErrorCode,
  classifyError,
  retry,
  sleep,
  withTimeout,
  isRecoverableError,
} from '@inflact-scraper/content-library';

// Usage
try {
  await withTimeout(promise, 5000, 'Timed out');
} catch (error) {
  if (error instanceof InflactError) {
    console.error(error.code, error.message);
  }
}

// With retry
const result = await retry(
  async () => service.fetchProfile('instagram'),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  }
);
```

### Logger

```typescript
import { Logger } from '@inflact-scraper/content-library';

const logger = new Logger('ModuleName', 'info');

logger.debug('Debug message', { optional: 'data' });
logger.info('Info message', { optional: 'data' });
logger.warn('Warning message', { optional: 'data' });
logger.error('Error message', { optional: 'data' });

const entries = logger.getLogs();
logger.clearLogs();
```

### Configuration

```typescript
import {
  ENV_CONFIG,
  loadEnv,
  ensureDirectories,
} from '@inflact-scraper/content-library';

loadEnv('.env');
ensureDirectories();

console.log(ENV_CONFIG.BROWSER_HEADLESS);
console.log(ENV_CONFIG.INFLACT_URL);
```

## Type Definitions

All types are exported from main module:

```typescript
import {
  // Session
  SessionStorage,
  CookieObject,
  SessionHeaders,

  // Requests
  InterceptedRequest,
  InterceptedResponse,
  CapturedAPIRequest,

  // Data
  ProfileData,
  PostData,
  ReelData,
  StoryData,
  APIResponse,

  // Configuration
  BrowserSessionConfig,
  RequestInterceptorConfig,

  // Errors
  ErrorContext,
  RetryStrategy,

  // Logging
  LogEntry,
} from '@inflact-scraper/content-library';
```

---

For more details, see [README.md](./README.md) and [examples/](./examples/).
