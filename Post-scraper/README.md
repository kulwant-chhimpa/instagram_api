# Instagram Post Engagement Scraper

Standalone Express app that proxies SocialInsider's free Instagram analytics API and returns a normalized response.

## What it serves

- `GET /health`
- `GET /api/instagram/posts?username=<username>`
- `POST /api/instagram/hashtags`

The endpoint returns the SocialInsider analytics payload in a stable JSON shape, including followers, engagement metrics, and the top posts array.

Hashtag endpoint request body:

```json
{
	"type": "URL",
	"value": "https://www.instagram.com/p/XXXXXXXX/",
	"language": "en",
	"inflactHeaders": {
		"cookie": "cf_clearance=...",
		"xClientToken": "...",
		"xClientSignature": "..."
	}
}
```

- `type` supports `URL` and `KEYWORD`.
- `inflactHeaders` is optional, but often required to pass Cloudflare checks.

## Run locally

```bash
cd Post-scraper
npm install
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | | Server port, defaults to `3001` |
| `POST_SCRAPER_PORT` | | Alternative port override |
| `POST_SCRAPER_CACHE_TTL_HOURS` | | In-memory cache TTL in hours, defaults to `24` |
| `SOCIALINSIDER_API_URL` | | Override the SocialInsider API endpoint, defaults to `https://free-tools.socialinsider.io/api` |
| `SOCIALINSIDER_TIMEZONE` | | Timezone sent to SocialInsider, defaults to `Asia/Kolkata` |
| `SOCIALINSIDER_TOOL` | | SocialInsider tool name, defaults to `free_social_media_analytics` |
| `SOCIALINSIDER_DASHBOARD_VERSION` | | Dashboard version sent to SocialInsider, defaults to `1` |
| `INFLACT_API_URL` | | Hashtag API URL, defaults to `https://inflact.com/hg/hashtag/search/` |
| `INFLACT_ORIGIN` | | Origin header for Inflact requests, defaults to `https://inflact.com` |
| `INFLACT_REFERER` | | Referer header for Inflact requests |
| `INFLACT_USER_AGENT` | | User-Agent used for Inflact requests |
| `INFLACT_COOKIE` | | Optional cookie fallback (for Cloudflare-protected requests) |
| `INFLACT_CLIENT_TOKEN` | | Optional `X-Client-Token` fallback |
| `INFLACT_CLIENT_SIGNATURE` | | Optional `X-Client-Signature` fallback |

## Azure App Service

Set the App Service source directory to `Post-scraper/` and use:

```bash
npm run build
npm start
```

## Notes

- This folder is self-contained so it can be deployed separately from the profile scraper.
- Shared username validation and response shaping follow the same conventions as the profile service.
- The public response includes a flattened analytics summary plus a `formatted` block for display-friendly metric values.