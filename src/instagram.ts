/**
 * Instagram profile client via Cloudflare Worker proxy.
 *
 * Routes all Instagram requests through a Cloudflare Worker.
 * The Worker handles:
 * - Requests to Instagram's public API
 * - Caching in Cloudflare KV (24h TTL)
 * - Returns profile data without needing expensive residential proxies
 */

import { config } from "./config";

export interface InstagramProfile {
  username: string;
  profilePicUrlHd: string;
  followers: number;
  following: number;
}

/**
 * Fetch Instagram profile via Cloudflare Worker.
 * Worker URL should be set in CF_WORKER_URL environment variable.
 * Worker handles all Instagram API calls with built-in caching.
 */
export async function fetchInstagramProfile(
  username: string
): Promise<InstagramProfile | null> {
  // Get Worker URL from config
  const workerUrl = config.cfWorkerUrl;
  if (!workerUrl) {
    console.error("[instagram] CF_WORKER_URL not configured");
    return null;
  }

  try {
    const url = `${workerUrl}?username=${encodeURIComponent(username)}`;
    console.log(`[instagram] Requesting from Cloudflare Worker: @${username}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    // 404 = user doesn't exist
    if (response.status === 404 || !response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!data.exists) {
        console.log(`[instagram] User not found: @${username}`);
        return null;
      }
      throw new Error(`Worker returned ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!data.exists) {
      console.log(`[instagram] User not found: @${username}`);
      return null;
    }

    const profile: InstagramProfile = {
      username: String(data.username || ""),
      profilePicUrlHd: String(data.profilePicUrl || ""),
      followers: Number(data.followers || 0),
      following: Number(data.following || 0),
    };

    console.log(
      `[instagram] ✓ Fetched @${profile.username} — followers: ${profile.followers}`
    );
    return profile;
  } catch (err) {
    console.error(
      `[instagram] Error fetching @${username} from Cloudflare Worker:`,
      err
    );
    return null;
  }
}
