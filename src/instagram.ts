/**
 * Instagram public web endpoint client.
 *
 * Uses browser-accurate headers to query Instagram's internal API
 * without authentication, cookies, or Graph API access.
 * Optional proxy support for bypassing IP blocks.
 */

import { config } from "./config";
import { ProxyAgent } from "undici";

export interface InstagramProfile {
  username: string;
  profilePicUrlHd: string;
  followers: number;
  following: number;
}

// Browser-accurate headers — mirrors a real Chrome request to instagram.com
const INSTAGRAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.instagram.com/",
  "X-IG-App-ID": "936619743392459",
  "X-ASBD-ID": "129477",
  "X-IG-WWW-Claim": "0",
  "X-Requested-With": "XMLHttpRequest",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Ch-Ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

/**
 * Fetch a public Instagram profile by username with retry logic.
 * Returns profile data or null if the user doesn't exist / is private / error.
 * Retries on 429 (rate limit) with exponential backoff.
 * Supports proxy via PROXY_URL environment variable.
 */
export async function fetchInstagramProfile(
  username: string,
  retries: number = 3
): Promise<InstagramProfile | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  // Disable cert verification globally when using proxy (for self-signed certs)
  if (config.proxyUrl && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log("[instagram] Disabled TLS cert verification for proxy");
  }

  // Build fetch options with optional proxy
  const buildFetchOptions = (): RequestInit & { dispatcher?: any } => {
    const options: RequestInit & { dispatcher?: any } = {
      method: "GET",
      headers: INSTAGRAM_HEADERS,
      redirect: "follow",
    };

    // Add dispatcher (undici proxy agent) if configured
    if (config.proxyUrl) {
      try {
        const dispatcher = new ProxyAgent(config.proxyUrl);
        options.dispatcher = dispatcher;
        console.log("[instagram] Using undici ProxyAgent:", config.proxyUrl.split("@")[1] || "configured");
      } catch (err) {
        console.warn("[instagram] Failed to create proxy dispatcher:", err);
      }
    }

    return options;
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, buildFetchOptions());

      // 404 = user doesn't exist
      if (response.status === 404) {
        console.log(`[instagram] User not found: @${username}`);
        return null;
      }

      // 429 = rate limited, retry with backoff
      if (response.status === 429) {
        if (attempt < retries) {
          const delayMs = Math.pow(2, attempt) * 1000; // exponential backoff: 2s, 4s, 8s
          console.warn(
            `[instagram] Rate limited (429) for @${username}. Retry ${attempt}/${retries} after ${delayMs}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        console.error(
          `[instagram] Rate limited (429) for @${username} after ${retries} retries`
        );
        return null;
      }

      // Any other non-200 is treated as a failure
      if (!response.ok) {
        console.error(
          `[instagram] API returned ${response.status} for @${username}`
        );
        return null;
      }

      let data: any;
      try {
        data = await response.json();
      } catch (err) {
        console.error(`[instagram] Failed to parse response for @${username}:`, err);
        return null;
      }

      const user = data?.data?.user;

      if (!user) {
        console.log(
          `[instagram] No user data for @${username}. Response keys:`,
          Object.keys(data || {})
        );
        return null;
      }

      const profile = {
        username: user.username,
        profilePicUrlHd:
          user.profile_pic_url_hd || user.profile_pic_url || "",
        followers: user.edge_followed_by?.count ?? 0,
        following: user.edge_follow?.count ?? 0,
      };

      console.log(
        `[instagram] ✓ Fetched @${user.username} — followers: ${user.edge_followed_by?.count || 0}`
      );
      return profile;
    } catch (err) {
      console.error(`[instagram] Error fetching @${username} (attempt ${attempt}/${retries}):`, err);
      if (attempt < retries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`[instagram] Failed to fetch @${username} after ${retries} attempts`);
  return null;
}
