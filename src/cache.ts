/**
 * Two-tier cache: in-memory (fast) backed by Supabase Postgres (persistent).
 *
 * - In-memory cache provides instant responses for hot usernames.
 * - Supabase table `instagram_cache` survives restarts.
 * - TTL is configurable via CACHE_TTL_HOURS (default 24h).
 */

import { getSupabaseClient } from "./supabase";
import { config } from "./config";

export interface CachedProfile {
  username: string;
  profilePic: string;
  followers: number;
  following: number;
  cachedAt: number; // Unix timestamp ms
}

// ── In-memory cache ──────────────────────────────────────────────────────────

const memoryCache = new Map<string, CachedProfile>();

function getTtlMs(): number {
  return config.cacheTtlHours * 60 * 60 * 1000;
}

function isExpired(entry: CachedProfile): boolean {
  return Date.now() - entry.cachedAt > getTtlMs();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Try to retrieve a cached profile. Checks memory first, then Supabase.
 */
export async function getCached(
  username: string
): Promise<CachedProfile | null> {
  // 1. Memory cache
  const mem = memoryCache.get(username);
  if (mem && !isExpired(mem)) {
    return mem;
  }
  if (mem) {
    memoryCache.delete(username); // expired
  }

  // 2. Supabase cache table
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("instagram_cache")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !data) return null;

    const entry: CachedProfile = {
      username: data.username,
      profilePic: data.profile_pic,
      followers: data.followers,
      following: data.following,
      cachedAt: new Date(data.cached_at).getTime(),
    };

    if (isExpired(entry)) {
      // Don't delete — let the upsert overwrite on next fetch
      return null;
    }

    // Warm memory cache
    memoryCache.set(username, entry);
    return entry;
  } catch (err) {
    console.error("Cache read error:", err);
    return null; // fail-open: cache miss → fresh fetch
  }
}

/**
 * Store a profile in both memory and Supabase.
 */
export async function setCache(profile: CachedProfile): Promise<void> {
  // 1. Memory
  memoryCache.set(profile.username, profile);

  // 2. Supabase — upsert
  try {
    const supabase = getSupabaseClient();
    await supabase.from("instagram_cache").upsert(
      {
        username: profile.username,
        profile_pic: profile.profilePic,
        followers: profile.followers,
        following: profile.following,
        cached_at: new Date(profile.cachedAt).toISOString(),
      },
      { onConflict: "username" }
    );
  } catch (err) {
    console.error("Cache write error:", err);
    // Non-fatal — memory cache still works
  }
}
