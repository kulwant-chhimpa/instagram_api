/**
 * Data parser - normalizes and validates API responses
 */

import Logger from '../utils/logger';
import { ProfileData, PostData, ReelData, StoryData } from '../utils/types';

export class DataParser {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DataParser');
  }

  /**
   * Parse and validate profile data
   */
  parseProfile(data: any): ProfileData | null {
    try {
      if (!data || (!data.id && !data.pk)) {
        this.logger.warn('Invalid profile data: missing ID');
        return null;
      }

      const profile: ProfileData = {
        id: String(data.id || data.pk || ''),
        username: String(data.username || '').toLowerCase(),
        fullName: String(data.full_name || data.fullName || ''),
        biography: String(data.biography || data.bio || ''),
        profilePicUrl: String(data.profile_pic_url || data.profilePicUrl || ''),
        followerCount: this.parseInt(data.follower_count || data.followers || 0),
        followingCount: this.parseInt(data.following_count || data.following || 0),
        postCount: this.parseInt(data.post_count || data.posts || 0),
        isPrivate: Boolean(data.is_private || data.private),
        isVerified: Boolean(data.is_verified || data.verified),
        businessCategoryName: data.business_category_name,
        url: data.url,
        rawData: data,
      };

      this.logger.debug(`Parsed profile: ${profile.username}`);
      return profile;
    } catch (error) {
      this.logger.error('Failed to parse profile data', error);
      return null;
    }
  }

  /**
   * Parse and validate posts
   */
  parsePosts(items: any[]): PostData[] {
    if (!Array.isArray(items)) {
      this.logger.warn('Posts data is not an array');
      return [];
    }

    return items
      .map((item) => this.parsePost(item))
      .filter((post): post is PostData => post !== null);
  }

  /**
   * Parse and validate individual post
   */
  parsePost(item: any): PostData | null {
    try {
      if (!item || (!item.id && !item.pk)) {
        return null;
      }

      const imageUrls = this.extractImageUrls(item);
      const videoUrls = this.extractVideoUrls(item);

      let type: 'image' | 'carousel' | 'video' = 'image';
      if (item.media_type === 8 || item.carousel_media) {
        type = 'carousel';
      } else if (videoUrls.length > 0) {
        type = 'video';
      }

      const post: PostData = {
        id: String(item.id || item.pk || ''),
        shortcode: String(item.code || item.shortcode || ''),
        caption: this.extractCaption(item),
        imageUrl: imageUrls[0],
        imageUrls,
        videoUrl: videoUrls[0],
        videoUrls,
        likeCount: this.parseInt(item.like_count || item.likes || 0),
        commentCount: this.parseInt(item.comment_count || item.comments || 0),
        viewCount: this.parseInt(item.view_count || item.views || 0),
        owner: this.extractOwner(item),
        timestamp: this.parseTimestamp(item.taken_at || item.timestamp),
        type,
        rawData: item,
      };

      return post;
    } catch (error) {
      this.logger.debug('Failed to parse post item', error);
      return null;
    }
  }

  /**
   * Parse and validate reels
   */
  parseReels(items: any[]): ReelData[] {
    if (!Array.isArray(items)) {
      this.logger.warn('Reels data is not an array');
      return [];
    }

    return items
      .map((item) => {
        const post = this.parsePost(item);
        if (!post) return null;

        const reel: ReelData = {
          ...post,
          type: 'video',
          viewCount: this.parseInt(item.view_count || item.views || 0),
          playCount: this.parseInt(item.play_count || item.playCount || 0),
        };

        return reel;
      })
      .filter((reel): reel is ReelData => reel !== null);
  }

  /**
   * Parse and validate stories
   */
  parseStories(items: any[]): StoryData[] {
    if (!Array.isArray(items)) {
      this.logger.warn('Stories data is not an array');
      return [];
    }

    return items
      .map((item) => {
        try {
          if (!item || (!item.id && !item.pk)) {
            return null;
          }

          const story: StoryData = {
            id: String(item.id || item.pk || ''),
            image: this.extractImageUrl(item),
            video: this.extractVideoUrl(item),
            timestamp: this.parseTimestamp(item.taken_at || item.timestamp),
            owner: this.extractOwner(item),
            hasExpired: Boolean(item.has_expiration || false),
            rawData: item,
          };

          return story;
        } catch (error) {
          this.logger.debug('Failed to parse story item', error);
          return null;
        }
      })
      .filter((story): story is StoryData => story !== null);
  }

  /**
   * Extract image URL from item
   */
  private extractImageUrl(item: any): string {
    if (item.image_versions2?.candidates?.[0]?.url) {
      return item.image_versions2.candidates[0].url;
    }
    if (item.image_url) {
      return item.image_url;
    }
    if (item.display_url) {
      return item.display_url;
    }
    return '';
  }

  /**
   * Extract all image URLs from item
   */
  private extractImageUrls(item: any): string[] {
    const urls: string[] = [];

    // Single image
    const singleUrl = this.extractImageUrl(item);
    if (singleUrl) {
      urls.push(singleUrl);
    }

    // Carousel media
    if (item.carousel_media && Array.isArray(item.carousel_media)) {
      for (const media of item.carousel_media) {
        const url = this.extractImageUrl(media);
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    return urls;
  }

  /**
   * Extract video URL from item
   */
  private extractVideoUrl(item: any): string {
    if (item.video_url) {
      return item.video_url;
    }
    if (item.videos?.[0]?.url) {
      return item.videos[0].url;
    }
    return '';
  }

  /**
   * Extract all video URLs from item
   */
  private extractVideoUrls(item: any): string[] {
    const urls: string[] = [];

    // Single video
    const singleUrl = this.extractVideoUrl(item);
    if (singleUrl) {
      urls.push(singleUrl);
    }

    // Carousel media
    if (item.carousel_media && Array.isArray(item.carousel_media)) {
      for (const media of item.carousel_media) {
        const url = this.extractVideoUrl(media);
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    return urls;
  }

  /**
   * Extract caption from item
   */
  private extractCaption(item: any): string {
    if (item.caption?.text) {
      return item.caption.text;
    }
    if (item.caption) {
      return typeof item.caption === 'string' ? item.caption : '';
    }
    return '';
  }

  /**
   * Extract owner information
   */
  private extractOwner(
    item: any
  ): {
    id: string;
    username: string;
  } {
    const owner = item.user || item.owner || {};
    return {
      id: String(owner.pk || owner.id || ''),
      username: String(owner.username || '').toLowerCase(),
    };
  }

  /**
   * Parse timestamp
   */
  private parseTimestamp(timestamp: any): number {
    if (!timestamp) {
      return Date.now();
    }

    const num = parseInt(timestamp, 10);

    // If timestamp is in seconds (Instagram format), convert to milliseconds
    if (num < 10000000000) {
      return num * 1000;
    }

    // Already in milliseconds
    return num;
  }

  /**
   * Safe integer parsing
   */
  private parseInt(value: any, radix: number = 10): number {
    const num = Number.parseInt(String(value), radix);
    return Number.isNaN(num) ? 0 : num;
  }

  /**
   * Validate parsed data for quality
   */
  validatePostData(post: PostData): boolean {
    // Must have ID
    if (!post.id) return false;

    // Must have owner
    if (!post.owner || !post.owner.username) return false;

    // Must have at least a caption or media URL
    if (!post.caption && !post.imageUrl && !post.videoUrl) return false;

    return true;
  }

  /**
   * Validate parsed profile
   */
  validateProfile(profile: ProfileData): boolean {
    if (!profile.id || !profile.username) return false;
    return true;
  }
}
