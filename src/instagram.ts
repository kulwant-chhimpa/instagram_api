/**
 * Instagram profile client for the Plixi demo dashboard.
 *
 * Fetches the public dashboard HTML directly and extracts the embedded
 * follower/following counts, then lets the route layer derive the image URL.
 */

const INSTAGRAM_API_URL = "https://www.instagram.com/api/v1/users/web_profile_info/?username=";

const INSTAGRAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-IG-App-ID": "936619743392459",
  Accept: "application/json, text/javascript, */*; q=0.01",
} as const;
export interface InstagramProfile {
  username: string;
  followers: number;
  following: number;
}

function parseCount(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractCount(html: string, field: "follower" | "following"): number | null {
  const patterns =
    field === "follower"
      ? [
          /const\s+get_follower\s*=\s*["']([^"']+)["']/i,
          /id=["']profile_followers["'][^>]*>\s*([^<]+)\s*</i,
          /"followers"\s*:\s*["']?([\d,]+)["']?/i,
        ]
      : [
          /const\s+get_following\s*=\s*["']([^"']+)["']/i,
          /id=["']profile_followings["'][^>]*>\s*([^<]+)\s*</i,
          /"following"\s*:\s*["']?([\d,]+)["']?/i,
        ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const parsed = parseCount(match?.[1]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export async function fetchInstagramProfile(
  username: string
): Promise<InstagramProfile | null> {
  const controller = new AbortController();
  const timeoutMs = 5000; // 5s timeout to avoid long hangs
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${INSTAGRAM_API_URL}${encodeURIComponent(username)}`;
    console.log(`[instagram] Requesting Instagram API: @${username}`);

    const response = await fetch(url, {
      method: "GET",
      headers: INSTAGRAM_HEADERS,
      signal: controller.signal,
    });

    if (response.status === 429) {
      console.warn(`[instagram] Rate limited when fetching @${username}`);
      return null;
    }

    if (response.status === 404) {
      console.log(`[instagram] Instagram returned 404 for @${username}`);
      return null;
    }

    if (!response.ok) {
      console.log(`[instagram] Unexpected status ${response.status} for @${username}`);
      return null;
    }

    const data = await response.json().catch(() => null);
    const user = data?.data?.user ?? data?.user;

    if (user && typeof user === "object") {
      const followers = user.edge_followed_by?.count ?? user.follower_count ?? null;
      const following = user.edge_follow?.count ?? user.following_count ?? null;

      if (typeof followers === "number" && typeof following === "number") {
        const profile: InstagramProfile = { username, followers, following };
        console.log(`[instagram] ✓ Fetched @${profile.username} — followers: ${profile.followers}`);
        return profile;
      }
    }

    // If the primary API response didn't contain counts (often due to blocking),
    // attempt mirror/fallback sources (dumpor/greatfon/plixi) and parse HTML/text.
    const mirrorSources = [
      `https://r.jina.ai/http://dumpor.io/v/${encodeURIComponent(username)}`,
      `https://r.jina.ai/http://dumpor.com/v/${encodeURIComponent(username)}`,
      `https://r.jina.ai/http://www.greatfon.com/v/${encodeURIComponent(username)}`,
      `https://demo.plixi.com/dashboard?username=${encodeURIComponent(username)}`,
    ];

    for (const src of mirrorSources) {
      try {
        const txtResp = await fetch(src, { headers: { Accept: "text/html,text/plain,*/*" } });
        if (!txtResp.ok) continue;
        const text = await txtResp.text();
        const followers = extractCount(text, "follower");
        const following = extractCount(text, "following");
        if (followers !== null && following !== null) {
          const profile: InstagramProfile = { username, followers, following };
          console.log(`[instagram] ✓ Fallback fetched @${profile.username} from ${src}`);
          return profile;
        }
      } catch (err) {
        console.warn(`[instagram] Mirror fetch failed for @${username} from ${src}:`, err);
      }
    }

    console.log(`[instagram] Unable to determine counts for @${username}`);
    return null;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(`[instagram] Request timed out for @${username}`);
      return null;
    }
    console.error(`[instagram] Error fetching @${username}:`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
