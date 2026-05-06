/**
 * Instagram profile client for the Plixi demo dashboard.
 *
 * Fetches the public dashboard HTML directly and extracts the embedded
 * follower/following counts, then lets the route layer derive the image URL.
 */

const INSTAGRAM_DASHBOARD_URL = "https://demo.plixi.com/dashboard?username=";

const INSTAGRAM_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
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
  try {
    const url = `${INSTAGRAM_DASHBOARD_URL}${encodeURIComponent(username)}`;
    console.log(`[instagram] Requesting dashboard HTML: @${username}`);

    const response = await fetch(url, {
      method: "GET",
      headers: INSTAGRAM_HEADERS,
    });

    if (!response.ok) {
      console.log(`[instagram] Dashboard request failed for @${username}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const followers = extractCount(html, "follower");
    const following = extractCount(html, "following");

    if (followers === null || following === null) {
      console.log(`[instagram] User not found or counts missing: @${username}`);
      return null;
    }

    const profile: InstagramProfile = {
      username,
      followers,
      following,
    };

    console.log(
      `[instagram] ✓ Fetched @${profile.username} — followers: ${profile.followers}`
    );
    return profile;
  } catch (err) {
    console.error(
      `[instagram] Error fetching @${username} from Plixi dashboard:`,
      err
    );
    return null;
  }
}
