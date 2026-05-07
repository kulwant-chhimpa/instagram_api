import { config } from "./config";

export interface MetricDisplay {
  value: number;
  formatted: string;
  abbreviated: string;
}

export interface TopPostAnalytics {
  caption: string | null;
  likeCount: number | null;
  createdAt: string | null;
  engagementRate: number | null;
  mediaType: string | null;
  profileName: string | null;
  profileFollowers: number | null;
  imageUrl: string | null;
  permalink: string | null;
  impressionsRate: number | null;
}

export interface InstagramPostEngagementResponse {
  exists: boolean;
  username: string;
  profileId: string;
  profileName: string;
  imageUrl: string;
  profilePictureUrl: string;
  followers: number;
  engagementRate: number;
  likes: number;
  comments: number;
  engagement: number;
  views: number;
  posts: number;
  averagePostPerDay: number;
  averageEngagementPerPost: number;
  averageViewsPerPost: number;
  topPosts: TopPostAnalytics[];
  formatted: {
    followers: MetricDisplay;
    engagementRate: MetricDisplay;
    likes: MetricDisplay;
    comments: MetricDisplay;
    engagement: MetricDisplay;
    views: MetricDisplay;
    averageEngagementPerPost: MetricDisplay;
    averageViewsPerPost: MetricDisplay;
  };
  analytics: {
    profilePictureUrl: string;
    followers: MetricDisplay;
    engagementRate: MetricDisplay;
    likes: MetricDisplay;
    comments: MetricDisplay;
    engagement: MetricDisplay;
    views: MetricDisplay;
    posts: number;
    averagePostPerDay: number;
    averageEngagementPerPost: MetricDisplay;
    averageViewsPerPost: MetricDisplay;
    topPosts: TopPostAnalytics[];
  };
}

type SocialInsiderMetric = Record<string, unknown> & {
  value?: unknown;
  string?: unknown;
  abbr_string_1f?: unknown;
  abbr_string_2f?: unknown;
  abbr_string_3f?: unknown;
  string_1f?: unknown;
  string_2f?: unknown;
  string_3f?: unknown;
};

type SocialInsiderTopPost = Record<string, unknown> & {
  caption?: unknown;
  like_count?: unknown;
  si_created_time?: unknown;
  created_time?: unknown;
  si_post_engagement_rate?: unknown;
  si_media_type?: unknown;
  media_type?: unknown;
  si_profile_info?: {
    name?: unknown;
    followers_count?: unknown;
    si_picture?: unknown;
  };
  si_picture?: unknown;
  si_permalink?: unknown;
  si_impressions_rate?: unknown;
};

type SocialInsiderResponse = Record<string, unknown> & {
  username?: unknown;
  profile_id?: unknown;
  profile_name?: unknown;
  profile_image?: unknown;
  profile_followers?: SocialInsiderMetric;
  engagement_rate?: SocialInsiderMetric;
  likes?: SocialInsiderMetric;
  comments?: SocialInsiderMetric;
  engagement?: SocialInsiderMetric;
  views?: SocialInsiderMetric;
  posts?: unknown;
  average_post_per_day?: unknown;
  average_engagement_per_post?: SocialInsiderMetric;
  average_views_per_post?: SocialInsiderMetric;
  top_posts?: SocialInsiderTopPost[];
};

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^@/, "");
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._]{1,30}$/.test(username);
}

function firstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return null;
}

function firstNumber(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function toDisplayMetric(metric: SocialInsiderMetric | undefined): MetricDisplay | null {
  const value = firstNumber(metric?.value, metric?.string, metric?.string_1f, metric?.string_2f, metric?.string_3f);
  if (value === null) {
    return null;
  }

  return {
    value,
    formatted: firstString(metric?.string, metric?.string_1f, metric?.string_2f, metric?.string_3f, String(value)) ?? String(value),
    abbreviated:
      firstString(metric?.abbr_string_1f, metric?.abbr_string_2f, metric?.abbr_string_3f, metric?.string_1f, String(value)) ??
      String(value),
  };
}

function toTopPost(post: SocialInsiderTopPost): TopPostAnalytics {
  const profileInfo = post.si_profile_info;

  return {
    caption: firstString(post.caption),
    likeCount: firstNumber(post.like_count),
    createdAt: firstString(post.si_created_time, post.created_time),
    engagementRate: firstNumber(post.si_post_engagement_rate),
    mediaType: firstString(post.si_media_type, post.media_type),
    profileName: firstString(profileInfo?.name),
    profileFollowers: firstNumber(profileInfo?.followers_count),
    imageUrl: firstString(post.si_picture, profileInfo?.si_picture),
    permalink: firstString(post.si_permalink),
    impressionsRate: firstNumber(post.si_impressions_rate),
  };
}

function buildHandleUrl(username: string): string {
  return `https://www.instagram.com/${encodeURIComponent(username)}`;
}

async function readSocialInsiderResponse(username: string): Promise<SocialInsiderResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const payload = {
      id: 1,
      method: "ig_tools.free_tools",
      params: {
        handle: buildHandleUrl(username),
        timezone: config.socialInsiderTimezone,
        tool: config.socialInsiderTool,
        auth: {
          dashboardVersion: config.socialInsiderDashboardVersion,
        },
      },
    };

    const response = await fetch(config.socialInsiderApiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[post-scraper] SocialInsider returned ${response.status} for @${username}`
      );
      return null;
    }

    const data = (await response.json().catch(() => null)) as SocialInsiderResponse | null;
    if (!data || typeof data !== "object") {
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[post-scraper] Error fetching SocialInsider data for @${username}:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPostEngagements(
  username: string
): Promise<InstagramPostEngagementResponse | null> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    return null;
  }

  const data = await readSocialInsiderResponse(normalized);
  if (!data) {
    return null;
  }

  const followers = toDisplayMetric(data.profile_followers);
  const engagementRate = toDisplayMetric(data.engagement_rate);
  const likes = toDisplayMetric(data.likes);
  const comments = toDisplayMetric(data.comments);
  const engagement = toDisplayMetric(data.engagement);
  const views = toDisplayMetric(data.views);
  const averageEngagementPerPost = toDisplayMetric(data.average_engagement_per_post);
  const averageViewsPerPost = toDisplayMetric(data.average_views_per_post);

  if (
    !followers ||
    !engagementRate ||
    !likes ||
    !comments ||
    !engagement ||
    !views ||
    !averageEngagementPerPost ||
    !averageViewsPerPost
  ) {
    return null;
  }

  const topPosts = Array.isArray(data.top_posts)
    ? data.top_posts.map(toTopPost)
    : [];

  return {
    exists: true,
    username: firstString(data.username, normalized) ?? normalized,
    profileId: firstString(data.profile_id, normalized) ?? normalized,
    profileName: firstString(data.profile_name, data.username, normalized) ?? normalized,
    imageUrl: firstString(data.profile_image) ?? "",
    profilePictureUrl: firstString(data.profile_image) ?? "",
    followers: followers.value,
    engagementRate: engagementRate.value,
    likes: likes.value,
    comments: comments.value,
    engagement: engagement.value,
    views: views.value,
    posts: firstNumber(data.posts) ?? topPosts.length,
    averagePostPerDay: firstNumber(data.average_post_per_day) ?? 0,
    averageEngagementPerPost: averageEngagementPerPost.value,
    averageViewsPerPost: averageViewsPerPost.value,
    topPosts,
    formatted: {
      followers,
      engagementRate,
      likes,
      comments,
      engagement,
      views,
      averageEngagementPerPost,
      averageViewsPerPost,
    },
    analytics: {
      profilePictureUrl: firstString(data.profile_image) ?? "",
      followers,
      engagementRate,
      likes,
      comments,
      engagement,
      views,
      posts: firstNumber(data.posts) ?? topPosts.length,
      averagePostPerDay: firstNumber(data.average_post_per_day) ?? 0,
      averageEngagementPerPost,
      averageViewsPerPost,
      topPosts,
    },
  };
}