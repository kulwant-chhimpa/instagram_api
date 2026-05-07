/**
 * Browser session manager - handles browser lifecycle and context management
 */

import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import Logger from '../utils/logger';
import { SessionStorageManager } from '../storage/session-storage';
import { RequestInterceptor } from '../interceptors/request-interceptor';
import { BrowserSessionConfig, SessionHeaders, CookieObject } from '../utils/types';
import {
  getRandomUserAgent,
  STEALTH_SCRIPTS,
  waitFor,
  sleep,
} from '../utils/helpers';
import { withTimeout, InflactError, ErrorCode } from '../utils/errors';

export class BrowserSessionManager {
  private logger: Logger;
  private config: Required<BrowserSessionConfig>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionStorage: SessionStorageManager;
  private interceptor: RequestInterceptor;
  private isInitialized: boolean = false;

  constructor(sessionStorageManager: SessionStorageManager, config: BrowserSessionConfig = {}) {
    this.logger = new Logger('BrowserSessionManager');
    this.sessionStorage = sessionStorageManager;
    this.interceptor = new RequestInterceptor();

    this.config = {
      headless: config.headless ?? true,
      slowmo: config.slowmo ?? 100,
      timeout: config.timeout ?? 30000,
      inflactUrl: config.inflactUrl ?? 'https://inflact.com',
      proxyServer: config.proxyServer,
      userAgent: config.userAgent || getRandomUserAgent(),
      persistSession: config.persistSession ?? true,
      sessionPath: config.sessionPath || './data/sessions',
      rotateUserAgents: config.rotateUserAgents ?? false,
    };

    this.logger.info('Browser session manager initialized', { config: this.config });
  }

  /**
   * Launch browser and context
   */
  async launch(): Promise<void> {
    try {
      this.logger.info('Launching browser...');

      const launchOptions: any = {
        headless: this.config.headless,
        slowMo: this.config.slowmo,
      };

      if (this.config.proxyServer) {
        launchOptions.proxy = {
          server: this.config.proxyServer,
        };

        if (this.config.proxyUsername) {
          launchOptions.proxy.username = this.config.proxyUsername;
          launchOptions.proxy.password = this.config.proxyPassword;
        }
      }

      this.browser = await chromium.launch(launchOptions);
      this.logger.info('Browser launched successfully');

      // Create context with stealth measures
      await this.createContext();
    } catch (error) {
      this.logger.error('Failed to launch browser', error);
      throw new InflactError(ErrorCode.BROWSER_ERROR, 'Failed to launch browser', {
        originalError: error,
      });
    }
  }

  /**
   * Create browser context with stealth measures
   */
  private async createContext(): Promise<void> {
    try {
      if (!this.browser) {
        throw new Error('Browser not launched');
      }

      this.logger.info('Creating browser context...');

      const contextOptions: any = {
        userAgent: this.config.userAgent,
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      };

      this.context = await this.browser.newContext(contextOptions);

      // Apply stealth techniques
      await this.applyStealthMeasures();

      this.logger.info('Browser context created');
    } catch (error) {
      this.logger.error('Failed to create browser context', error);
      throw error;
    }
  }

  /**
   * Apply stealth measures to avoid detection
   */
  private async applyStealthMeasures(): Promise<void> {
    if (!this.context) return;

    try {
      // Initialize page for stealth scripts
      const initPage = await this.context.newPage();

      // Apply all stealth scripts
      await initPage.addInitScript(STEALTH_SCRIPTS.OVERRIDE_WEBDRIVER);
      await initPage.addInitScript(STEALTH_SCRIPTS.FIX_CHROME_RUNTIME);
      await initPage.addInitScript(STEALTH_SCRIPTS.MASK_PLUGINS);
      await initPage.addInitScript(STEALTH_SCRIPTS.MASK_LANGUAGES);

      await initPage.close();
      this.logger.debug('Stealth measures applied');
    } catch (error) {
      this.logger.warn('Failed to apply some stealth measures', error);
    }
  }

  /**
   * Create new page with interceptor
   */
  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    try {
      const page = await this.context.newPage();

      // Set viewport and defaults
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.setDefaultTimeout(this.config.timeout);
      await page.setDefaultNavigationTimeout(this.config.timeout);

      // Initialize request interceptor
      await this.interceptor.initialize(page);

      this.page = page;
      this.logger.info('Page created and interceptor initialized');
      return page;
    } catch (error) {
      this.logger.error('Failed to create page', error);
      throw error;
    }
  }

  /**
   * Navigate to Inflact and wait for initialization
   */
  async navigateToInflact(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.info(`Navigating to ${this.config.inflactUrl}...`);

      await withTimeout(
        this.page.goto(this.config.inflactUrl, { waitUntil: 'domcontentloaded' }),
        this.config.timeout,
        'Navigation timeout'
      );

      // Wait for page to settle
      await sleep(2000);

      this.logger.info('Successfully navigated to Inflact');
    } catch (error) {
      this.logger.error('Failed to navigate to Inflact', error);
      throw error;
    }
  }

  /**
   * Wait for dynamic content to load and headers to be generated
   */
  async waitForDynamicContent(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.info('Waiting for dynamic content and headers to be generated...');

      // Wait for API requests to be captured
      await withTimeout(
        waitFor(
          () => {
            const stats = this.interceptor.getStatistics();
            return stats.totalCaptured > 0 && stats.withToken > 0;
          },
          this.config.timeout,
          500
        ),
        this.config.timeout,
        'Timeout waiting for API requests'
      );

      this.logger.info('Dynamic content loaded and headers captured');

      // Wait a bit more to ensure everything is ready
      await sleep(1000);
    } catch (error) {
      this.logger.warn('Timeout waiting for dynamic content, but proceeding...', error);
    }
  }

  /**
   * Extract and save session data
   */
  async extractSessionData(): Promise<void> {
    if (!this.page || !this.context) {
      throw new Error('Page or context not initialized');
    }

    try {
      this.logger.info('Extracting session data...');

      // Extract cookies
      const cookies = await this.context.cookies();
      const cookieObjects: CookieObject[] = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as any,
      }));

      this.sessionStorage.updateCookies(cookieObjects);

      // Extract localStorage
      const localStorageData = await this.page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key) || '';
          }
        }
        return data;
      });

      this.sessionStorage.updateLocalStorage(localStorageData);

      // Extract sessionStorage
      const sessionStorageData = await this.page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            data[key] = sessionStorage.getItem(key) || '';
          }
        }
        return data;
      });

      this.sessionStorage.updateSessionStorage(sessionStorageData);

      // Extract intercepted tokens/headers
      const tokens = this.interceptor.extractAllTokens();
      if (tokens.token || tokens.signature) {
        const headers: SessionHeaders = {};
        if (tokens.token) {
          headers['x-client-token'] = tokens.token;
        }
        if (tokens.signature) {
          headers['x-client-signature'] = tokens.signature;
        }
        this.sessionStorage.updateHeaders(headers);
      }

      this.logger.info('Session data extracted', {
        cookies: cookieObjects.length,
        localStorage: Object.keys(localStorageData).length,
        sessionStorage: Object.keys(sessionStorageData).length,
      });
    } catch (error) {
      this.logger.error('Failed to extract session data', error);
      throw error;
    }
  }

  /**
   * Restore session cookies
   */
  async restoreSessionCookies(): Promise<void> {
    if (!this.context) {
      throw new Error('Context not initialized');
    }

    try {
      const cookies = this.sessionStorage.getCookies();

      if (cookies.length > 0) {
        await this.context.addCookies(cookies as Cookie[]);
        this.logger.info(`Restored ${cookies.length} cookies`);
      }
    } catch (error) {
      this.logger.error('Failed to restore session cookies', error);
      throw error;
    }
  }

  /**
   * Refresh tokens by reloading page
   */
  async refreshTokens(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.info('Refreshing tokens...');

      this.interceptor.clearCapturedRequests();
      await this.page.reload({ waitUntil: 'domcontentloaded' });

      await sleep(2000);

      // Wait for new API requests
      await waitFor(
        () => {
          const stats = this.interceptor.getStatistics();
          return stats.totalCaptured > 0;
        },
        this.config.timeout,
        500
      );

      // Extract new tokens
      await this.extractSessionData();

      this.logger.info('Tokens refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw error;
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T = any>(pageFunction: string | (() => T), ...args: any[]): Promise<T> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    return this.page.evaluate(pageFunction, ...args);
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get request interceptor
   */
  getInterceptor(): RequestInterceptor {
    return this.interceptor;
  }

  /**
   * Get session storage manager
   */
  getSessionStorage(): SessionStorageManager {
    return this.sessionStorage;
  }

  /**
   * Close page
   */
  async closePage(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
        this.logger.info('Page closed');
      } catch (error) {
        this.logger.warn('Error closing page', error);
      }
      this.page = null;
    }
  }

  /**
   * Close context
   */
  async closeContext(): Promise<void> {
    if (this.context) {
      try {
        await this.context.close();
        this.logger.info('Context closed');
      } catch (error) {
        this.logger.warn('Error closing context', error);
      }
      this.context = null;
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    try {
      await this.closePage();
      await this.closeContext();

      if (this.browser) {
        await this.browser.close();
        this.logger.info('Browser closed');
      }

      this.browser = null;
      this.isInitialized = false;
    } catch (error) {
      this.logger.error('Error closing browser', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.page && !!this.context && !!this.browser;
  }

  /**
   * Full initialization flow
   */
  async initialize(): Promise<void> {
    try {
      await this.launch();
      await this.createPage();
      await this.navigateToInflact();
      await this.waitForDynamicContent();
      await this.extractSessionData();

      this.isInitialized = true;

      this.logger.info('Browser session fully initialized');
    } catch (error) {
      this.logger.error('Initialization failed', error);
      await this.close();
      throw error;
    }
  }
}
