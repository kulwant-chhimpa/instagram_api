import { Request, Response, Router } from "express";
import { getCachedPostEngagements, setCachedPostEngagements } from "./cache";
import {
  fetchPostEngagements,
  isValidUsername,
  normalizeUsername,
} from "./instagram";
import {
  fetchInflactHashtags,
  type HashtagInput,
  type InflactHeaderOverrides,
} from "./inflact";

const router = Router();

router.post("/instagram/hashtags", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      type?: "URL" | "KEYWORD";
      value?: string;
      language?: string;
      inflactHeaders?: InflactHeaderOverrides;
    };

    if (!body?.type || (body.type !== "URL" && body.type !== "KEYWORD")) {
      return res.status(400).json({
        error: "Invalid type. Allowed values: URL, KEYWORD.",
      });
    }

    if (!body?.value || typeof body.value !== "string") {
      return res.status(400).json({
        error: "Missing required field: value",
      });
    }

    if (body.type === "URL") {
      try {
        const parsed = new URL(body.value);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("Invalid URL protocol");
        }
      } catch {
        return res.status(400).json({
          error: "For type URL, value must be a valid URL.",
        });
      }
    }

    const input: HashtagInput = {
      type: body.type,
      value: body.value,
      language: body.language,
    };

    const result = await fetchInflactHashtags(input, body.inflactHeaders);
    if (!result.ok) {
      return res.status(502).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("[post-scraper] Hashtag route error:", error);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
    });
  }
});

router.get("/instagram/posts", async (req: Request, res: Response) => {
  try {
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({
        error: "Missing required query parameter: username",
      });
    }

    const normalized = normalizeUsername(rawUsername);
    if (!isValidUsername(normalized)) {
      return res.status(400).json({
        error:
          "Invalid username. Use 1-30 characters: letters, numbers, periods, underscores.",
      });
    }

    const cached = getCachedPostEngagements(normalized);
    if (cached) {
      return res.json(cached);
    }

    const result = await fetchPostEngagements(normalized);
    if (!result) {
      return res.json({ exists: false });
    }

    setCachedPostEngagements(normalized, result);
    return res.json(result);
  } catch (error) {
    console.error("[post-scraper] Unhandled error:", error);
    return res.status(500).json({
      error: "Internal server error. Please try again later.",
      exists: false,
    });
  }
});

export default router;