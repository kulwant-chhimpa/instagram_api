/**
 * Media downloader - handles downloading images, videos, and metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosProgressEvent } from 'axios';
import Logger from '../utils/logger';
import { PostData, ReelData, StoryData, ProfileData } from '../utils/types';

interface DownloadProgress {
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

export class MediaDownloader {
  private logger: Logger;
  private outputPath: string;
  private progressCallbacks: ProgressCallback[] = [];

  constructor(outputPath: string = './downloads') {
    this.logger = new Logger('MediaDownloader');
    this.outputPath = outputPath;
    this.ensureOutputDirectory();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
      this.logger.debug(`Created output directory: ${this.outputPath}`);
    }
  }

  /**
   * Register progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Emit progress event
   */
  private emitProgress(progress: DownloadProgress): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error) {
        this.logger.warn('Progress callback error', error);
      }
    }
  }

  /**
   * Download file from URL
   */
  async downloadFile(url: string, filename: string): Promise<string> {
    try {
      if (!url) {
        this.logger.warn(`Skipping empty URL`);
        return '';
      }

      const filepath = path.join(this.outputPath, filename);

      // Create subdirectory if needed
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.logger.debug(`Downloading: ${url} -> ${filename}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
          const progress: DownloadProgress = {
            filename,
            loaded: progressEvent.loaded || 0,
            total: progressEvent.total || 0,
            percentage: progressEvent.total
              ? Math.round(((progressEvent.loaded || 0) / progressEvent.total) * 100)
              : 0,
          };
          this.emitProgress(progress);
        },
      });

      fs.writeFileSync(filepath, Buffer.from(response.data));
      this.logger.info(`Downloaded: ${filename}`, {
        size: response.data.length,
      });

      return filepath;
    } catch (error) {
      this.logger.error(`Failed to download: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Download post media and metadata
   */
  async downloadPost(post: PostData, subdir: string = ''): Promise<void> {
    try {
      const postDir = path.join(this.outputPath, subdir, `post_${post.id}`);

      if (!fs.existsSync(postDir)) {
        fs.mkdirSync(postDir, { recursive: true });
      }

      // Download images
      if (post.imageUrls && post.imageUrls.length > 0) {
        for (let i = 0; i < post.imageUrls.length; i++) {
          const url = post.imageUrls[i];
          const filename = `post_${post.id}/image_${i + 1}.jpg`;

          try {
            await this.downloadFile(url, path.join(subdir, filename));
          } catch (error) {
            this.logger.warn(`Failed to download image ${i + 1}`, error);
          }
        }
      }

      // Download videos
      if (post.videoUrls && post.videoUrls.length > 0) {
        for (let i = 0; i < post.videoUrls.length; i++) {
          const url = post.videoUrls[i];
          const filename = `post_${post.id}/video_${i + 1}.mp4`;

          try {
            await this.downloadFile(url, path.join(subdir, filename));
          } catch (error) {
            this.logger.warn(`Failed to download video ${i + 1}`, error);
          }
        }
      }

      // Save metadata
      const metadataPath = path.join(postDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(post, null, 2), 'utf-8');

      this.logger.info(`Post downloaded: ${post.id}`);
    } catch (error) {
      this.logger.error(`Failed to download post: ${post.id}`, error);
      throw error;
    }
  }

  /**
   * Download reel
   */
  async downloadReel(reel: ReelData, subdir: string = ''): Promise<void> {
    try {
      const reelDir = path.join(this.outputPath, subdir, `reel_${reel.id}`);

      if (!fs.existsSync(reelDir)) {
        fs.mkdirSync(reelDir, { recursive: true });
      }

      // Download video
      if (reel.videoUrl) {
        const filename = `reel_${reel.id}/video.mp4`;

        try {
          await this.downloadFile(reel.videoUrl, path.join(subdir, filename));
        } catch (error) {
          this.logger.warn('Failed to download reel video', error);
        }
      }

      // Download thumbnail
      if (reel.imageUrl) {
        const filename = `reel_${reel.id}/thumbnail.jpg`;

        try {
          await this.downloadFile(reel.imageUrl, path.join(subdir, filename));
        } catch (error) {
          this.logger.warn('Failed to download reel thumbnail', error);
        }
      }

      // Save metadata
      const metadataPath = path.join(reelDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(reel, null, 2), 'utf-8');

      this.logger.info(`Reel downloaded: ${reel.id}`);
    } catch (error) {
      this.logger.error(`Failed to download reel: ${reel.id}`, error);
      throw error;
    }
  }

  /**
   * Download story
   */
  async downloadStory(story: StoryData, subdir: string = ''): Promise<void> {
    try {
      const storyDir = path.join(this.outputPath, subdir, `story_${story.id}`);

      if (!fs.existsSync(storyDir)) {
        fs.mkdirSync(storyDir, { recursive: true });
      }

      // Download image
      if (story.image) {
        const filename = `story_${story.id}/image.jpg`;

        try {
          await this.downloadFile(story.image, path.join(subdir, filename));
        } catch (error) {
          this.logger.warn('Failed to download story image', error);
        }
      }

      // Download video
      if (story.video) {
        const filename = `story_${story.id}/video.mp4`;

        try {
          await this.downloadFile(story.video, path.join(subdir, filename));
        } catch (error) {
          this.logger.warn('Failed to download story video', error);
        }
      }

      // Save metadata
      const metadataPath = path.join(storyDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(story, null, 2), 'utf-8');

      this.logger.info(`Story downloaded: ${story.id}`);
    } catch (error) {
      this.logger.error(`Failed to download story: ${story.id}`, error);
      throw error;
    }
  }

  /**
   * Download profile picture
   */
  async downloadProfilePicture(profile: ProfileData): Promise<void> {
    try {
      if (!profile.profilePicUrl) {
        this.logger.warn(`No profile picture URL for ${profile.username}`);
        return;
      }

      const profileDir = path.join(this.outputPath, `profile_${profile.username}`);

      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      const filename = path.join(`profile_${profile.username}`, 'profile_pic.jpg');
      await this.downloadFile(profile.profilePicUrl, filename);

      this.logger.info(`Profile picture downloaded: ${profile.username}`);
    } catch (error) {
      this.logger.error(`Failed to download profile picture: ${profile.username}`, error);
      throw error;
    }
  }

  /**
   * Download batch of posts
   */
  async downloadPostBatch(posts: PostData[], subdir: string = ''): Promise<void> {
    this.logger.info(`Starting batch download: ${posts.length} posts`);

    for (let i = 0; i < posts.length; i++) {
      try {
        await this.downloadPost(posts[i], subdir);
        this.logger.debug(`Downloaded post ${i + 1}/${posts.length}`);
      } catch (error) {
        this.logger.warn(`Failed to download post ${i + 1}`, error);
      }
    }

    this.logger.info(`Batch download completed`);
  }

  /**
   * Download batch of reels
   */
  async downloadReelBatch(reels: ReelData[], subdir: string = ''): Promise<void> {
    this.logger.info(`Starting batch download: ${reels.length} reels`);

    for (let i = 0; i < reels.length; i++) {
      try {
        await this.downloadReel(reels[i], subdir);
        this.logger.debug(`Downloaded reel ${i + 1}/${reels.length}`);
      } catch (error) {
        this.logger.warn(`Failed to download reel ${i + 1}`, error);
      }
    }

    this.logger.info(`Batch download completed`);
  }

  /**
   * Get output directory
   */
  getOutputDirectory(): string {
    return this.outputPath;
  }

  /**
   * Get directory size
   */
  getDirectorySize(dir: string = this.outputPath): number {
    let size = 0;

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          size += this.getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to calculate directory size', error);
    }

    return size;
  }

  /**
   * Format directory size
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Clean up old files (older than specified days)
   */
  cleanupOldFiles(olderThanDays: number = 7): void {
    try {
      const now = Date.now();
      const ageMs = olderThanDays * 24 * 60 * 60 * 1000;

      const walkDir = (dir: string): void => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            walkDir(filePath);
          } else if (now - stat.mtimeMs > ageMs) {
            fs.unlinkSync(filePath);
            this.logger.debug(`Deleted old file: ${file}`);
          }
        }
      };

      walkDir(this.outputPath);
      this.logger.info(`Cleanup completed: removed files older than ${olderThanDays} days`);
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }
}
