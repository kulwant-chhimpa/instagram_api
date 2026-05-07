import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(
    process.env.POST_SCRAPER_PORT || process.env.PORT || "3001",
    10
  ),
  cacheTtlHours: parseInt(
    process.env.POST_SCRAPER_CACHE_TTL_HOURS || "24",
    10
  ),
  socialInsiderApiUrl:
    process.env.SOCIALINSIDER_API_URL || "https://free-tools.socialinsider.io/api",
  socialInsiderTimezone: process.env.SOCIALINSIDER_TIMEZONE || "Asia/Kolkata",
  socialInsiderTool:
    process.env.SOCIALINSIDER_TOOL || "free_social_media_analytics",
  socialInsiderDashboardVersion: parseInt(
    process.env.SOCIALINSIDER_DASHBOARD_VERSION || "1",
    10
  ),
  inflactApiUrl:
    process.env.INFLACT_API_URL || "https://inflact.com/hg/hashtag/search/",
  inflactOrigin: process.env.INFLACT_ORIGIN || "https://inflact.com",
  inflactReferer:
    process.env.INFLACT_REFERER ||
    "https://inflact.com/tools/instagram-hashtag-generator/",
  inflactUserAgent:
    process.env.INFLACT_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
  inflactCookie: process.env.INFLACT_COOKIE || "",
  inflactClientToken: process.env.INFLACT_CLIENT_TOKEN || "",
  inflactClientSignature: process.env.INFLACT_CLIENT_SIGNATURE || "",
} as const;