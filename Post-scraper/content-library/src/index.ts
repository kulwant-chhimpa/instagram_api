/**
 * Inflact Service - Main orchestrator combining all modules
 */

import Logger from './utils/logger';
import { SessionStorageManager } from './storage/session-storage';
import { BrowserSessionManager } from './browser/session-manager';
import { APIExecutor } from './api/executor';
import { DataParser } from './parsers/data-parser';
import { MediaDownloader } from './downloaders/media-downloader';
import { BrowserSessionConfig, ProfileData, PostData, ReelData, StoryData, APIResponse } from './utils/types';
import { ENV_CONFIG, loadEnv, ensureDirectories } from './utils/config';

export class InflactService {
  private logger: Logger;
  private sessionStorage: SessionStorageManager;
  private browserSession: BrowserSessionManager | null = null;
  private apiExecutor: APIExecutor | null = null;
  private dataParser: DataParser;
  private mediaDownloader: MediaDownloader;

  constructor(
    sessionPath: string = ENV_CONFIG.SESSION_DATA_PATH,
    mediaDownloadPath: string = ENV_CONFIG.MEDIA_OUTPUT_PATH
  ) {
    this.logger = new Logger('InflactService');
    this.sessionStorage = new SessionStorageManager(sessionPath);
    this.dataParser = new DataParser();
    this.mediaDownloader = new MediaDownloader(mediaDownloadPath);

    this.logger.info('Inflact Service initialized');
  }

  /**
   * Initialize browser session
   */
  async initializeBrowser(config?: BrowserSessionConfig): Promise<void> {
    try {
      this.logger.info('Initializing browser session...');

      this.browserSession = new BrowserSessionManager(this.sessionStorage, {
        ...config,
        inflactUrl: ENV_CONFIG.INFLACT_URL,
      });

      await this.browserSession.initialize();

      this.apiExecutor = new APIExecutor(
        this.sessionStorage,
        ENV_CONFIG.INFLACT_URL,
        ENV_CONFIG.API_RETRY_ATTEMPTS
      );

      if (this.browserSession.getPage()) {
        this.apiExecutor.setPageContext(this.browserSession.getPage()!);
      }

      this.logger.info('Browser session initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser session', error);
      throw error;
    }
  }

  /**
   * Load existing session from disk
   */
  async loadSession(sessionId: string, config?: BrowserSessionConfig): Promise<boolean> {
    try {
      const session = await this.sessionStorage.loadSession(sessionId);

      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`);
        return false;
      }

      this.browserSession = new BrowserSessionManager(this.sessionStorage, {
        ...config,
        inflactUrl: ENV_CONFIG.INFLACT_URL,
      });

      // Still need browser for some operations
      await this.browserSession.launch();
      await this.browserSession.createPage();
      await this.browserSession.restoreSessionCookies();

      this.apiExecutor = new APIExecutor(
        this.sessionStorage,
        ENV_CONFIG.INFLACT_URL,
        ENV_CONFIG.API_RETRY_ATTEMPTS
      );

      this.logger.info(`Session loaded: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to load session', error);
      return false;
    }
  }

  /**
   * Fetch profile data
   */
  async fetchProfile(username: string): Promise<APIResponse<ProfileData>> {
    if (!this.apiExecutor) {
      throw new Error('API executor not initialized');
    }

    const response = await this.apiExecutor.fetchProfile(username);

    if (response.success && response.data) {
      response.data = this.dataParser.parseProfile(response.data) || response.data;
    }

    return response;
  }

  /**
   * Fetch posts
   */
  async fetchPosts(
    username: string,
    cursor: string = '',
    parseData: boolean = true
  ): Promise<APIResponse<PostData[]>> {
    if (!this.apiExecutor) {
      throw new Error('API executor not initialized');
    }

    const response = await this.apiExecutor.fetchPosts(username, cursor);

    if (response.success && response.data && parseData) {
      response.data = this.dataParser.parsePosts(response.data);
    }

    return response;
  }

  /**
   * Fetch reels
   */
  async fetchReels(
    username: string,
    cursor: string = '',
    parseData: boolean = true
  ): Promise<APIResponse<ReelData[]>> {
    if (!this.apiExecutor) {
      throw new Error('API executor not initialized');
    }

    const response = await this.apiExecutor.fetchReels(username, cursor);

    if (response.success && response.data && parseData) {
      response.data = this.dataParser.parseReels(response.data);
    }

    return response;
  }

  /**
   * Fetch stories
   */
  async fetchStories(
    username: string,
    parseData: boolean = true
  ): Promise<APIResponse<StoryData[]>> {
    if (!this.apiExecutor) {
      throw new Error('API executor not initialized');
    }

    const response = await this.apiExecutor.fetchStories(username);

    if (response.success && response.data && parseData) {
      response.data = this.dataParser.parseStories(response.data);
    }

    return response;
  }

  /**
   * Fetch profile with all data
   */
  async fetchProfileComplete(username: string): Promise<{
    profile: ProfileData | null;
    posts: PostData[];
    reels: ReelData[];
    stories: StoryData[];
  }> {
    try {
      this.logger.info(`Fetching complete profile data for: ${username}`);

      const [profileRes, postsRes, reelsRes, storiesRes] = await Promise.all([
        this.fetchProfile(username),
        this.fetchPosts(username),
        this.fetchReels(username),
        this.fetchStories(username),
      ]);

      return {
        profile: profileRes.data || null,
        posts: postsRes.data || [],
        reels: reelsRes.data || [],
        stories: storiesRes.data || [],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch complete profile: ${username}`, error);
      throw error;
    }
  }

  /**
   * Download profile media
   */
  async downloadProfile(profile: ProfileData, includeMedia: boolean = false): Promise<void> {
    try {
      if (includeMedia) {
        await this.mediaDownloader.downloadProfilePicture(profile);
      }

      // Save profile metadata
      const metadataPath = `${this.mediaDownloader.getOutputDirectory()}/profile_${profile.username}`;
      this.logger.info(`Profile metadata saved: ${metadataPath}`);
    } catch (error) {
      this.logger.error(`Failed to download profile: ${profile.username}`, error);
      throw error;
    }
  }

  /**
   * Download posts
   */
  async downloadPosts(posts: PostData[], username: string): Promise<void> {
    try {
      await this.mediaDownloader.downloadPostBatch(posts, username);
      this.logger.info(`Downloaded ${posts.length} posts`);
    } catch (error) {
      this.logger.error('Failed to download posts', error);
      throw error;
    }
  }

  /**
   * Download reels
   */
  async downloadReels(reels: ReelData[], username: string): Promise<void> {
    try {
      await this.mediaDownloader.downloadReelBatch(reels, username);
      this.logger.info(`Downloaded ${reels.length} reels`);
    } catch (error) {
      this.logger.error('Failed to download reels', error);
      throw error;
    }
  }

  /**
   * Save session
   */
  async saveSession(identifier: string = this.sessionStorage.getSessionId()): Promise<void> {
    try {
      const session = this.sessionStorage.getCurrentSession();

      if (!session) {
        throw new Error('No active session to save');
      }

      await this.sessionStorage.saveSession(identifier, session);
      this.logger.info(`Session saved: ${identifier}`);
    } catch (error) {
      this.logger.error('Failed to save session', error);
      throw error;
    }
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(): Promise<void> {
    try {
      if (!this.browserSession) {
        throw new Error('Browser session not initialized');
      }

      await this.browserSession.refreshTokens();
      this.logger.info('Session tokens refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh session', error);
      throw error;
    }
  }

  /**
   * Close service
   */
  async close(): Promise<void> {
    try {
      if (this.browserSession) {
        await this.browserSession.close();
      }

      this.logger.info('Inflact Service closed');
    } catch (error) {
      this.logger.error('Error closing service', error);
      throw error;
    }
  }

  /**
   * Get media downloader
   */
  getMediaDownloader(): MediaDownloader {
    return this.mediaDownloader;
  }

  /**
   * Get data parser
   */
  getDataParser(): DataParser {
    return this.dataParser;
  }

  /**
   * Get session storage
   */
  getSessionStorage(): SessionStorageManager {
    return this.sessionStorage;
  }

  /**
   * Get browser session
   */
  getBrowserSession(): BrowserSessionManager | null {
    return this.browserSession;
  }

  /**
   * Get API executor
   */
  getAPIExecutor(): APIExecutor | null {
    return this.apiExecutor;
  }
}

// Export all modules
export * from './utils/types';
export * from './utils/logger';
export * from './utils/config';
export * from './utils/errors';
export * from './utils/helpers';
export * from './storage/session-storage';
export * from './browser/session-manager';
export * from './api/executor';
export * from './parsers/data-parser';
export * from './downloaders/media-downloader';
export * from './interceptors/request-interceptor';
