/**
 * Instagram profile client.
 *
 * Fetches the public Instagram profile API directly and returns the
 * follower/following counts needed by the profile route.
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

interface InstagramApiUser {
  edge_followed_by?: { count?: number };
  edge_follow?: { count?: number };
  follower_count?: number;
  following_count?: number;
}

interface InstagramApiResponse {
  data?: { user?: InstagramApiUser };
  user?: InstagramApiUser;
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

    const data = (await response.json().catch(() => null)) as InstagramApiResponse | null;
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
