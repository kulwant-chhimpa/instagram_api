import { config } from "./config";
import type { InstagramPostEngagementResponse } from "./instagram";

interface CachedPostEngagements {
  username: string;
  data: InstagramPostEngagementResponse;
  cachedAt: number;
}

const memoryCache = new Map<string, CachedPostEngagements>();

function getTtlMs(): number {
  return config.cacheTtlHours * 60 * 60 * 1000;
}

function isExpired(entry: CachedPostEngagements): boolean {
  return Date.now() - entry.cachedAt > getTtlMs();
}

export function getCachedPostEngagements(
  username: string
): InstagramPostEngagementResponse | null {
  const cached = memoryCache.get(username);
  if (!cached) {
    return null;
  }

  if (isExpired(cached)) {
    memoryCache.delete(username);
    return null;
  }

  return cached.data;
}

export function setCachedPostEngagements(
  username: string,
  data: InstagramPostEngagementResponse
): void {
  memoryCache.set(username, {
    username,
    data,
    cachedAt: Date.now(),
  });
}