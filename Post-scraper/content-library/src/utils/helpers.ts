/**
 * Utility functions for user agents, helpers, and constants
 */

import { v4 as uuidv4 } from 'uuid';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

/**
 * Get a random user agent
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get a specific user agent
 */
export function getUserAgent(index: number = 0): string {
  return USER_AGENTS[index % USER_AGENTS.length];
}

/**
 * Get all available user agents
 */
export function getAllUserAgents(): string[] {
  return [...USER_AGENTS];
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T = any>(json: string, fallback?: T): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback || null;
  }
}

/**
 * Safely stringify JSON
 */
export function safeJsonStringify(obj: any, fallback: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if URL matches pattern
 */
export function urlMatches(url: string, pattern: RegExp | string): boolean {
  if (typeof pattern === 'string') {
    return url.includes(pattern);
  }
  return pattern.test(url);
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Format FormData for logging
 */
export function formatFormData(formData: FormData): Record<string, any> {
  const result: Record<string, any> = {};
  formData.forEach((value, key) => {
    result[key] = value instanceof File ? `[File: ${value.name}]` : value;
  });
  return result;
}

/**
 * Create FormData from object
 */
export function createFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  }
  return formData;
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 30000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

/**
 * Flatten nested object for easier access
 */
export function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Extract headers from response-like object
 */
export function normalizeHeaders(headers: any): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
  } else if (typeof headers === 'object' && headers !== null) {
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = String(value);
    }
  }

  return result;
}

/**
 * API endpoint constants
 */
export const INFLACT_ENDPOINTS = {
  PROFILE: '/downloader/api/viewer/profile/',
  POSTS: '/downloader/api/viewer/posts/',
  REELS: '/downloader/api/viewer/reels/',
  STORIES: '/downloader/api/viewer/stories/',
};

/**
 * Request interceptor patterns
 */
export const INTERCEPTOR_PATTERNS = {
  API: '/downloader/api/viewer/',
  PROFILE: /\/downloader\/api\/viewer\/profile\//,
  POSTS: /\/downloader\/api\/viewer\/posts\//,
  REELS: /\/downloader\/api\/viewer\/reels\//,
  STORIES: /\/downloader\/api\/viewer\/stories\//,
};

/**
 * Browser stealth scripts to avoid detection
 */
export const STEALTH_SCRIPTS = {
  /**
   * Override navigator.webdriver
   */
  OVERRIDE_WEBDRIVER: `
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  `,

  /**
   * Fix chrome detection
   */
  FIX_CHROME_RUNTIME: `
    window.chrome = {
      runtime: {},
    };
  `,

  /**
   * Mask plugins
   */
  MASK_PLUGINS: `
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  `,

  /**
   * Mask languages
   */
  MASK_LANGUAGES: `
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  `,
};
