/**
 * Cloudflare Worker - Instagram Profile Proxy
 * 
 * This worker acts as a proxy for Instagram API requests.
 * It fetches public profile data and caches responses using Cloudflare KV.
 * 
 * Deploy with:
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler publish
 * 
 * Environment: Create a KV namespace called "INSTAGRAM_CACHE"
 */

export default {
  async fetch(request, env) {
    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse username from query string
    const url = new URL(request.url);
    const username = url.searchParams.get("username");

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Missing username parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate username format
    const normalized = username.toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check KV cache first
    const cacheKey = `instagram:${normalized}`;
    const cached = await env.INSTAGRAM_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[CF Worker] Cache hit for @${normalized}`);
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // 1 hour browser cache
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`[CF Worker] Cache miss for @${normalized}, fetching from Instagram`);

    try {
      // Fetch from Instagram's public API
      const igResponse = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${normalized}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            Referer: "https://www.instagram.com/",
          },
        }
      );

      // Handle 429 rate limit with retry
      if (igResponse.status === 429) {
        console.warn(`[CF Worker] Rate limited (429) for @${normalized}`);
        return new Response(
          JSON.stringify({
            error: "Instagram rate limiting - please try again in a few minutes",
            exists: false,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!igResponse.ok) {
        if (igResponse.status === 404) {
          return new Response(
            JSON.stringify({ exists: false }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Instagram API returned ${igResponse.status}`);
      }

      const data = await igResponse.json();

      // Extract profile information
      if (!data.user) {
        return new Response(
          JSON.stringify({ exists: false }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const profile = {
        exists: true,
        username: data.user.username,
        profilePicUrl: data.user.profile_pic_url_hd || data.user.profile_pic_url,
        followers: data.user.follower_count || 0,
        following: data.user.following_count || 0,
      };

      // Cache for 24 hours in KV
      await env.INSTAGRAM_CACHE.put(cacheKey, JSON.stringify(profile), {
        expirationTtl: 24 * 60 * 60, // 24 hours
      });

      // Return with cache headers
      return new Response(JSON.stringify(profile), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // 1 hour browser cache
          "X-Cache": "MISS",
        },
      });
    } catch (error) {
      console.error(`[CF Worker] Error fetching @${normalized}:`, error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch profile from Instagram",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
