/**
 * Express route handler for GET /api/instagram?username=<username>
 */

import { Router, Request, Response } from "express";
import { fetchInstagramProfile } from "./instagram";
import { uploadProfilePic } from "./storage";
import { getCached, setCache } from "./cache";

const router = Router();

// DEBUG endpoint: /api/debug/cache — manually set cache for testing
router.post("/debug/cache", async (req: Request, res: Response) => {
  try {
    const { username, profilePic, followers, following } = req.body;
    if (!username || !profilePic) {
      return res.status(400).json({
        error: "Required fields: username, profilePic",
      });
    }
    
    await setCache({
      username: username.toLowerCase(),
      profilePic,
      followers: followers || 0,
      following: following || 0,
      cachedAt: Date.now(),
    });
    
    console.log(`[debug] Manually cached @${username}`);
    return res.json({ ok: true, message: `Cached @${username}` });
  } catch (err) {
    console.error("[debug] Cache error:", err);
    return res.status(500).json({ error: "Cache error" });
  }
});

router.get("/instagram", async (req: Request, res: Response) => {
  try {
    // ── Validate input ──────────────────────────────────────────────────
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({
        error: "Missing required query parameter: username",
      });
    }

    const username = rawUsername.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9._]{1,30}$/.test(username)) {
      return res.status(400).json({
        error:
          "Invalid username. Use 1-30 characters: letters, numbers, periods, underscores.",
      });
    }

    // ── Check cache ─────────────────────────────────────────────────────
    console.log(`[route] Checking cache for @${username}`);
    const cached = await getCached(username);
    if (cached) {
      console.log(`[cache hit] @${username}`);
      return res.json({
        exists: true,
        username: cached.username,
        profilePic: cached.profilePic,
        followers: cached.followers,
        following: cached.following,
      });
    }
    console.log(`[cache miss] @${username}, fetching from Instagram`);

    // ── Fetch from Instagram ────────────────────────────────────────────
    const profile = await fetchInstagramProfile(username);

    if (!profile) {
      return res.json({ exists: false });
    }

    // ── Upload profile picture to Supabase ──────────────────────────────
    let publicPicUrl = profile.profilePicUrlHd;
    try {
      console.log(`[route] Uploading picture for @${username} to Supabase...`);
      publicPicUrl = await uploadProfilePic(username, profile.profilePicUrlHd);
      console.log(`[storage] Successfully uploaded @${username} to Supabase`);
    } catch (err) {
      console.warn(
        `[storage] Upload failed, falling back to Instagram URL:`,
        err instanceof Error ? err.message : err
      );
      // Fallback to Instagram URL if upload fails
      publicPicUrl = profile.profilePicUrlHd;
    }

    // ── Cache the result ────────────────────────────────────────────────
    await setCache({
      username: profile.username,
      profilePic: publicPicUrl,
      followers: profile.followers,
      following: profile.following,
      cachedAt: Date.now(),
    });

    // ── Respond ─────────────────────────────────────────────────────────
    return res.json({
      exists: true,
      username: profile.username,
      profilePic: publicPicUrl,
      followers: profile.followers,
      following: profile.following,
    });
  } catch (err) {
    console.error("Unhandled error in /api/instagram:", err);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
    });
  }
});

export default router;
