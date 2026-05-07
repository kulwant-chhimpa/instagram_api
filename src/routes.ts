/**
 * Express route handler for Instagram API
 * 
 * Endpoints:
 * - GET /api/instagram?username=<username> - Get profile data
 * - POST /api/request - Form submission endpoint, returns profile data
 */

import { Router, Request, Response } from "express";
import { fetchInstagramProfile } from "./instagram";
import { getCached, setCache } from "./cache";
import { isFixtureMode, getFixture } from "./fixtures";

const router = Router();

// Debug: report fixture mode status
router.get("/debug/fixtures", (_req: Request, res: Response) => {
  try {
    return res.json({ fixtureMode: isFixtureMode(), FIXTURE_MODE: process.env.FIXTURE_MODE ?? null });
  } catch (err) {
    return res.status(500).json({ error: "debug error" });
  }
});

// DEBUG endpoint: /api/debug/cache — manually set cache for testing
router.post("/debug/cache", async (req: Request, res: Response) => {
  try {
    const { username, imageUrl, profilePic, followers, following } = req.body;
    if (!username) {
      return res.status(400).json({
        error: "Required field: username",
      });
    }

    const normalized = username.toLowerCase();
    const resolvedImageUrl =
      imageUrl ||
      profilePic ||
      `https://images.pathsocial.com/api/instagram/${normalized}`;
    
    await setCache({
      username: normalized,
      profilePic: resolvedImageUrl,
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

// Helper function to get profile and return formatted response + status
async function getProfileData(username: string) {
  // Normalize username
  const normalized = username.trim().toLowerCase().replace(/^@/, "");
  // Fixture / CI mode: deterministic responses for tests and offline runs
  if (isFixtureMode()) {
    const fx = getFixture(normalized);
    if (fx) {
      return {
        status: 200,
        body: {
          exists: true,
          username: fx.username,
          imageUrl: fx.imageUrl,
          followers: fx.followers,
          following: fx.following,
        },
      };
    }

    // In fixture mode unknown users return exists: false with 200 (matches old tests)
    return { status: 200, body: { exists: false } };
  }

  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    return {
      status: 400,
      body: {
        exists: false,
        error: "Invalid username. Use 1-30 characters: letters, numbers, periods, underscores.",
      },
    };
  }

  // Check cache
  console.log(`[route] Checking cache for @${normalized}`);
  const cached = await getCached(normalized);
  if (cached) {
    console.log(`[cache hit] @${normalized}`);
    return {
      status: 200,
      body: {
        exists: true,
        username: cached.username,
        imageUrl: cached.profilePic,
        followers: cached.followers,
        following: cached.following,
      },
    };
  }
  console.log(`[cache miss] @${normalized}, fetching from Instagram`);

  // Fetch from Instagram
  const profile = await fetchInstagramProfile(normalized);
  if (!profile) {
    // Not found or error from upstream — respond 404 for not found
    return { status: 404, body: { exists: false } };
  }

  const imageUrl = `https://images.pathsocial.com/api/instagram/${normalized}`;

  // Cache the result
  await setCache({
    username: normalized,
    profilePic: imageUrl,
    followers: profile.followers,
    following: profile.following,
    cachedAt: Date.now(),
  });

  return {
    status: 200,
    body: {
      exists: true,
      username: normalized,
      imageUrl,
      followers: profile.followers,
      following: profile.following,
    },
  };
}

// POST endpoint for form submissions
router.post("/request", async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({
        error: "Missing required field: username",
        exists: false,
      });
    }

    const result = await getProfileData(username);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[request] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
      exists: false,
    });
  }
});

router.get("/instagram", async (req: Request, res: Response) => {
  try {
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({
        error: "Missing required query parameter: username",
      });
    }

    const result = await getProfileData(rawUsername);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Unhandled error in /api/instagram:", err);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
    });
  }
});

export default router;
