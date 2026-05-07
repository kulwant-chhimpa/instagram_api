import { config } from "./config";

export interface InflactHeaderOverrides {
  cookie?: string;
  xClientToken?: string;
  xClientSignature?: string;
  userAgent?: string;
  origin?: string;
  referer?: string;
}

export interface HashtagInput {
  type: "URL" | "KEYWORD";
  value: string;
  language?: string;
}

export interface HashtagSuggestion {
  tag: string;
}

export interface HashtagResponse {
  ok: boolean;
  provider: "inflact";
  type: "URL" | "KEYWORD";
  query: string;
  selected: string[];
  hashtags: HashtagSuggestion[];
  rawHashtagCount: number;
  upstreamStatus: number;
  error?: string;
  details?: string;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizeTag(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function collectTags(value: unknown, output: string[]): void {
  if (typeof value === "string") {
    const candidates = value.match(/#[a-zA-Z0-9_]+/g);
    if (Array.isArray(candidates)) {
      output.push(...candidates);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        const maybeTag = normalizeTag(item);
        if (maybeTag.length > 1) {
          output.push(maybeTag);
        }
        continue;
      }

      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        const direct = asString(itemObj.tag) ?? asString(itemObj.hashtag) ?? asString(itemObj.value) ?? asString(itemObj.keyword);
        if (direct) {
          const maybeTag = normalizeTag(direct);
          if (maybeTag.length > 1) {
            output.push(maybeTag);
          }
        }
      }

      collectTags(item, output);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectTags(nested, output);
    }
  }
}

function uniqTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => tag.toLowerCase())
    .map((tag) => normalizeTag(tag))
    .filter((tag) => /^#[a-z0-9_]{2,100}$/.test(tag));

  return Array.from(new Set(normalized));
}

function buildHeaders(overrides?: InflactHeaderOverrides): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "*/*",
    "Accept-Language": "en-GB,en;q=0.9",
    "Content-Type": "application/json",
    Origin: overrides?.origin || config.inflactOrigin,
    Referer: overrides?.referer || config.inflactReferer,
    "User-Agent": overrides?.userAgent || config.inflactUserAgent,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  const cookie = overrides?.cookie || config.inflactCookie;
  const clientToken = overrides?.xClientToken || config.inflactClientToken;
  const clientSignature =
    overrides?.xClientSignature || config.inflactClientSignature;

  if (cookie) {
    headers.Cookie = cookie;
  }

  if (clientToken) {
    headers["X-Client-Token"] = clientToken;
  }

  if (clientSignature) {
    headers["X-Client-Signature"] = clientSignature;
  }

  return headers;
}

function cloudflareBlocked(status: number, text: string): boolean {
  if (status !== 403) {
    return false;
  }

  return text.includes("Just a moment") || text.includes("challenges.cloudflare.com");
}

export async function fetchInflactHashtags(
  input: HashtagInput,
  overrides?: InflactHeaderOverrides
): Promise<HashtagResponse> {
  const body: Record<string, string> = {
    type: input.type,
    value: input.value,
  };

  if (input.type === "URL") {
    body.language = input.language || "en";
  }

  const response = await fetch(config.inflactApiUrl, {
    method: "POST",
    headers: buildHeaders(overrides),
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      provider: "inflact",
      type: input.type,
      query: input.value,
      selected: [],
      hashtags: [],
      rawHashtagCount: 0,
      upstreamStatus: response.status,
      error: cloudflareBlocked(response.status, text)
        ? "Cloudflare challenge blocked the request"
        : "Upstream request failed",
      details: cloudflareBlocked(response.status, text)
        ? "Use fresh browser-generated cf_clearance and X-Client headers, then retry quickly."
        : text.slice(0, 400),
    };
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep parsed as null; extractor will return no tags
  }

  const rawTags: string[] = [];
  collectTags(parsed, rawTags);
  const unique = uniqTags(rawTags);

  return {
    ok: true,
    provider: "inflact",
    type: input.type,
    query: input.value,
    selected: unique.slice(0, 30),
    hashtags: unique.map((tag) => ({ tag })),
    rawHashtagCount: unique.length,
    upstreamStatus: response.status,
  };
}
