/**
 * Core type definitions for the Inflact Browser Session Extractor
 */

export interface CookieObject {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface SessionHeaders {
  'x-client-signature'?: string;
  'x-client-token'?: string;
  [key: string]: string | undefined;
}

export interface SessionStorage {
  cookies: CookieObject[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  headers: SessionHeaders;
  userAgent: string;
  timestamp: number;
  expiresAt?: number;
}

export interface InterceptedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string | string[]>;
  body?: string | FormData | Record<string, any>;
  cookies: CookieObject[];
  timestamp: number;
}

export interface InterceptedResponse {
  id: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export interface CapturedAPIRequest {
  request: InterceptedRequest;
  response?: InterceptedResponse;
  extractedToken?: string;
  extractedSignature?: string;
  error?: string;
}

export interface ProfileData {
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

export interface PostData {
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
  owner: {
    id: string;
    username: string;
  };
  timestamp: number;
  type: 'image' | 'carousel' | 'video';
  rawData?: any;
}

export interface ReelData extends PostData {
  type: 'video';
  viewCount: number;
  playCount?: number;
}

export interface StoryData {
  id: string;
  image: string;
  video?: string;
  timestamp: number;
  owner: {
    id: string;
    username: string;
  };
  hasExpired: boolean;
  rawData?: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
  cursor?: string;
  hasMore?: boolean;
  rawResponse?: any;
}

export interface BrowserSessionConfig {
  headless?: boolean;
  slowmo?: number;
  timeout?: number;
  inflactUrl?: string;
  proxyServer?: string;
  userAgent?: string;
  persistSession?: boolean;
  sessionPath?: string;
  rotateUserAgents?: boolean;
}

export interface RequestInterceptorConfig {
  targetpattern: RegExp | string;
  captureHeaders?: boolean;
  captureBody?: boolean;
  captureResponse?: boolean;
  maxCaptureSize?: number;
}

export interface ErrorContext {
  operation: string;
  timestamp: number;
  error: Error;
  context?: Record<string, any>;
}

export interface RetryStrategy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: any;
}
