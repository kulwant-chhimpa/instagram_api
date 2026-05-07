/**
 * API Executor - handles API requests using captured session data
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Page } from 'playwright';
import Logger from '../utils/logger';
import { SessionStorageManager } from '../storage/session-storage';
import { APIResponse, ProfileData, PostData, ReelData, StoryData } from '../utils/types';
import { retry, sleep } from '../utils/errors';
import { INFLACT_ENDPOINTS, createFormData } from '../utils/helpers';

export class APIExecutor {
  private logger: Logger;
  private httpClient: AxiosInstance;
  private sessionStorage: SessionStorageManager;
  private page: Page | null = null;
  private baseUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(
    sessionStorageManager: SessionStorageManager,
    baseUrl: string = 'https://inflact.com',
    retryAttempts: number = 3
  ) {
    this.logger = new Logger('APIExecutor');
    this.sessionStorage = sessionStorageManager;
    this.baseUrl = baseUrl;
    this.retryAttempts = retryAttempts;

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on error status
    });
  }

  /**
   * Set the page context for browser-based execution
   */
  setPageContext(page: Page): void {
    this.page = page;
  }

  /**
   * Build request headers from session
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.sessionStorage.getCurrentSession()?.userAgent || 'Mozilla/5.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    const sessionHeaders = this.sessionStorage.getHeaders();
    if (sessionHeaders['x-client-token']) {
      headers['x-client-token'] = sessionHeaders['x-client-token'];
    }
    if (sessionHeaders['x-client-signature']) {
      headers['x-client-signature'] = sessionHeaders['x-client-signature'];
    }

    return headers;
  }

  /**
   * Build cookies header from session
   */
  private buildCookieHeader(): string {
    const cookies = this.sessionStorage.getCookies();
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  /**
   * Execute a request inside browser context
   */
  async executeInBrowserContext<T = any>(
    url: string,
    method: string = 'POST',
    body?: FormData | Record<string, any>
  ): Promise<APIResponse<T>> {
    if (!this.page) {
      throw new Error('Page context not set');
    }

    try {
      this.logger.info(`Executing in browser: ${method} ${url}`);

      const result = await this.page.evaluate(
        async (executeUrl, executeMethod, executeBody) => {
          try {
            const options: RequestInit = {
              method: executeMethod,
              credentials: 'include',
            };

            if (executeBody) {
              if (executeBody instanceof FormData) {
                options.body = executeBody;
              } else {
                options.headers = {
                  'Content-Type': 'application/x-www-form-urlencoded',
                };
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(executeBody)) {
                  params.append(key, String(value));
                }
                options.body = params.toString();
              }
            }

            const response = await fetch(executeUrl, options);
            const data = await response.json();

            return {
              success: response.ok,
              status: response.status,
              data,
            };
          } catch (error: any) {
            return {
              success: false,
              error: error.message,
            };
          }
        },
        url,
        method,
        body
      );

      if (!result.success) {
        throw new Error(result.error || 'Browser execution failed');
      }

      this.logger.info(`Browser execution successful: ${method} ${url}`);

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.logger.error(`Browser execution failed: ${method} ${url}`, error);
      return {
        success: false,
        error: (error as Error).message,
        data: null,
      };
    }
  }

  /**
   * Execute HTTP request with session credentials
   */
  async executeRequest<T = any>(
    endpoint: string,
    method: string = 'POST',
    data?: any,
    config: Partial<AxiosRequestConfig> = {}
  ): Promise<APIResponse<T>> {
    const fullUrl = `${this.baseUrl}${endpoint}`;

    return retry(
      async () => {
        try {
          this.logger.info(`Executing request: ${method} ${endpoint}`);

          const headers = this.buildHeaders();
          const cookies = this.buildCookieHeader();

          const requestConfig: AxiosRequestConfig = {
            method,
            url: fullUrl,
            headers: {
              ...headers,
              'Cookie': cookies,
              ...config.headers,
            },
            ...config,
          };

          if (data) {
            requestConfig.data = data;
          }

          const response = await this.httpClient(requestConfig);

          if (!response.status || response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          this.logger.info(`Request successful: ${method} ${endpoint}`, {
            status: response.status,
          });

          return {
            success: true,
            data: response.data,
            rawResponse: response,
          };
        } catch (error) {
          this.logger.error(`Request failed: ${method} ${endpoint}`, error);
          throw error;
        }
      },
      {
        maxAttempts: this.retryAttempts,
        initialDelay: this.retryDelay,
        maxDelay: 30000,
        backoffMultiplier: 2,
      }
    ).catch((error) => ({
      success: false,
      error: (error as Error).message,
      data: null,
    }));
  }

  /**
   * Fetch profile data
   */
  async fetchProfile(username: string): Promise<APIResponse<ProfileData>> {
    const formData = createFormData({ url: username });

    const response = await this.executeRequest<any>(
      INFLACT_ENDPOINTS.PROFILE,
      'POST',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.success || !response.data) {
      return response;
    }

    // Parse profile data
    const profileData = this.parseProfileResponse(response.data);

    return {
      ...response,
      data: profileData,
    };
  }

  /**
   * Fetch posts data
   */
  async fetchPosts(username: string, cursor: string = ''): Promise<APIResponse<PostData[]>> {
    const formData = createFormData({ url: username, cursor });

    const response = await this.executeRequest<any>(
      INFLACT_ENDPOINTS.POSTS,
      'POST',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.success || !response.data) {
      return response;
    }

    // Parse posts data
    const posts = this.parsePostsResponse(response.data);

    return {
      ...response,
      data: posts,
      cursor: response.data.cursor,
      hasMore: response.data.hasMore ?? posts.length > 0,
    };
  }

  /**
   * Fetch reels data
   */
  async fetchReels(username: string, cursor: string = ''): Promise<APIResponse<ReelData[]>> {
    const formData = createFormData({ url: username, cursor });

    const response = await this.executeRequest<any>(
      INFLACT_ENDPOINTS.REELS,
      'POST',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.success || !response.data) {
      return response;
    }

    // Parse reels data
    const reels = this.parseReelsResponse(response.data);

    return {
      ...response,
      data: reels,
      cursor: response.data.cursor,
      hasMore: response.data.hasMore ?? reels.length > 0,
    };
  }

  /**
   * Fetch stories data
   */
  async fetchStories(username: string): Promise<APIResponse<StoryData[]>> {
    const formData = createFormData({ url: username });

    const response = await this.executeRequest<any>(
      INFLACT_ENDPOINTS.STORIES,
      'POST',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.success || !response.data) {
      return response;
    }

    // Parse stories data
    const stories = this.parseStoriesResponse(response.data);

    return {
      ...response,
      data: stories,
    };
  }

  /**
   * Parse profile response
   */
  private parseProfileResponse(data: any): ProfileData {
    return {
      id: data.id || data.pk || '',
      username: data.username || '',
      fullName: data.full_name || data.fullName || '',
      biography: data.biography || data.bio || '',
      profilePicUrl: data.profile_pic_url || data.profilePicUrl || '',
      followerCount: parseInt(data.follower_count || data.followers || 0, 10),
      followingCount: parseInt(data.following_count || data.following || 0, 10),
      postCount: parseInt(data.post_count || data.posts || 0, 10),
      isPrivate: data.is_private || data.private || false,
      isVerified: data.is_verified || data.verified || false,
      businessCategoryName: data.business_category_name,
      url: data.url,
      rawData: data,
    };
  }

  /**
   * Parse posts response
   */
  private parsePostsResponse(data: any): PostData[] {
    const items = data.items || data.data || [];
    return items.map((item: any) => this.parsePostItem(item));
  }

  /**
   * Parse reels response
   */
  private parseReelsResponse(data: any): ReelData[] {
    const items = data.items || data.data || [];
    return items.map((item: any) => ({
      ...this.parsePostItem(item),
      type: 'video' as const,
      viewCount: parseInt(item.view_count || item.views || 0, 10),
    }));
  }

  /**
   * Parse stories response
   */
  private parseStoriesResponse(data: any): StoryData[] {
    const items = data.items || data.data || [];
    return items.map((item: any) => ({
      id: item.id || item.pk || '',
      image: item.image_versions2?.candidates?.[0]?.url || item.image_url || '',
      video: item.video_url || item.videos?.[0]?.url,
      timestamp: parseInt(item.taken_at || Date.now() / 1000, 10) * 1000,
      owner: {
        id: item.user?.pk || item.user?.id || '',
        username: item.user?.username || '',
      },
      hasExpired: item.has_expiration || false,
      rawData: item,
    }));
  }

  /**
   * Parse individual post item
   */
  private parsePostItem(item: any): PostData {
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];

    // Handle carousel
    if (item.carousel_media || item.media_list) {
      const media = item.carousel_media || item.media_list;
      media.forEach((m: any) => {
        if (m.image_versions2?.candidates?.[0]) {
          imageUrls.push(m.image_versions2.candidates[0].url);
        }
        if (m.video_url) {
          videoUrls.push(m.video_url);
        }
      });
    } else {
      // Single image
      if (item.image_versions2?.candidates?.[0]) {
        imageUrls.push(item.image_versions2.candidates[0].url);
      }
      // Single video
      if (item.video_url) {
        videoUrls.push(item.video_url);
      }
    }

    let postType: 'image' | 'carousel' | 'video' = 'image';
    if (item.media_type === 8 || (item.carousel_media && item.carousel_media.length > 0)) {
      postType = 'carousel';
    } else if (videoUrls.length > 0) {
      postType = 'video';
    }

    return {
      id: item.id || item.pk || '',
      shortcode: item.shortcode || item.code || '',
      caption: item.caption?.text || item.caption || '',
      imageUrl: imageUrls[0],
      imageUrls,
      videoUrl: videoUrls[0],
      videoUrls,
      likeCount: parseInt(item.like_count || item.likes || 0, 10),
      commentCount: parseInt(item.comment_count || item.comments || 0, 10),
      viewCount: parseInt(item.view_count || item.views || 0, 10),
      owner: {
        id: item.user?.pk || item.user?.id || item.owner?.pk || '',
        username: item.user?.username || item.owner?.username || '',
      },
      timestamp: parseInt(item.taken_at || Date.now() / 1000, 10) * 1000,
      type: postType,
      rawData: item,
    };
  }

  /**
   * Fetch with pagination support
   */
  async fetchWithPagination<T extends { cursor?: string; hasMore?: boolean }>(
    fetchFn: (cursor: string) => Promise<APIResponse<T[]>>,
    maxPages: number = 5
  ): Promise<T[]> {
    const allResults: T[] = [];
    let cursor = '';
    let pageCount = 0;

    while (pageCount < maxPages) {
      const response = await fetchFn(cursor);

      if (!response.success || !response.data) {
        this.logger.warn(`Pagination stopped at page ${pageCount}`);
        break;
      }

      allResults.push(...response.data);
      pageCount++;

      if (!response.hasMore || !response.cursor) {
        break;
      }

      cursor = response.cursor;
      await sleep(500); // Be respectful with requests
    }

    this.logger.info(`Fetched data across ${pageCount} pages: ${allResults.length} items`);
    return allResults;
  }
}
