/**
 * Session storage manager - handles persistence and restoration of session data
 */

import * as fs from 'fs';
import * as path from 'path';
import Logger from '../utils/logger';
import { SessionStorage, CookieObject, SessionHeaders } from '../utils/types';
import { generateSessionId, safeJsonParse, safeJsonStringify } from '../utils/helpers';

export class SessionStorageManager {
  private logger: Logger;
  private sessionPath: string;
  private currentSession: SessionStorage | null = null;
  private sessionId: string;

  constructor(sessionPath: string = './data/sessions') {
    this.logger = new Logger('SessionStorage');
    this.sessionPath = sessionPath;
    this.sessionId = generateSessionId();

    this.ensureDirectory();
  }

  /**
   * Ensure session directory exists
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
      this.logger.debug(`Created session directory: ${this.sessionPath}`);
    }
  }

  /**
   * Get session file path
   */
  private getSessionFile(identifier: string): string {
    return path.join(this.sessionPath, `${identifier}.json`);
  }

  /**
   * Save session to disk
   */
  async saveSession(identifier: string, session: SessionStorage): Promise<void> {
    try {
      const filePath = this.getSessionFile(identifier);
      const data = safeJsonStringify(session);
      fs.writeFileSync(filePath, data, 'utf-8');
      this.logger.info(`Session saved: ${identifier}`, {
        cookies: session.cookies.length,
        headers: Object.keys(session.headers).length,
      });
    } catch (error) {
      this.logger.error(`Failed to save session: ${identifier}`, error);
      throw error;
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(identifier: string): Promise<SessionStorage | null> {
    try {
      const filePath = this.getSessionFile(identifier);

      if (!fs.existsSync(filePath)) {
        this.logger.debug(`Session file not found: ${filePath}`);
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const session = safeJsonParse<SessionStorage>(data);

      if (!session) {
        this.logger.warn(`Failed to parse session file: ${identifier}`);
        return null;
      }

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.logger.warn(`Session expired: ${identifier}`);
        return null;
      }

      this.logger.info(`Session loaded: ${identifier}`, {
        cookies: session.cookies.length,
        headers: Object.keys(session.headers).length,
      });

      this.currentSession = session;
      return session;
    } catch (error) {
      this.logger.error(`Failed to load session: ${identifier}`, error);
      return null;
    }
  }

  /**
   * Create a new session
   */
  createSession(userAgent: string): SessionStorage {
    const session: SessionStorage = {
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      headers: {},
      userAgent,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    this.currentSession = session;
    this.logger.debug('New session created');
    return session;
  }

  /**
   * Update session cookies
   */
  updateCookies(cookies: CookieObject[]): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.cookies = cookies;
    this.currentSession.timestamp = Date.now();

    this.logger.debug(`Updated session cookies: ${cookies.length}`);
  }

  /**
   * Add or update a single cookie
   */
  setCookie(cookie: CookieObject): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const existingIndex = this.currentSession.cookies.findIndex((c) => c.name === cookie.name);

    if (existingIndex >= 0) {
      this.currentSession.cookies[existingIndex] = cookie;
    } else {
      this.currentSession.cookies.push(cookie);
    }

    this.currentSession.timestamp = Date.now();
  }

  /**
   * Get all cookies
   */
  getCookies(): CookieObject[] {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    return [...this.currentSession.cookies];
  }

  /**
   * Get a specific cookie
   */
  getCookie(name: string): CookieObject | undefined {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    return this.currentSession.cookies.find((c) => c.name === name);
  }

  /**
   * Update session headers
   */
  updateHeaders(headers: SessionHeaders): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.headers = { ...this.currentSession.headers, ...headers };
    this.currentSession.timestamp = Date.now();

    this.logger.debug(`Updated session headers: ${Object.keys(headers).join(', ')}`);
  }

  /**
   * Get all headers
   */
  getHeaders(): SessionHeaders {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    return { ...this.currentSession.headers };
  }

  /**
   * Update localStorage
   */
  updateLocalStorage(data: Record<string, string>): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.localStorage = { ...this.currentSession.localStorage, ...data };
    this.currentSession.timestamp = Date.now();

    this.logger.debug(`Updated localStorage: ${Object.keys(data).length} items`);
  }

  /**
   * Get localStorage
   */
  getLocalStorage(): Record<string, string> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    return { ...this.currentSession.localStorage };
  }

  /**
   * Update sessionStorage
   */
  updateSessionStorage(data: Record<string, string>): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.sessionStorage = { ...this.currentSession.sessionStorage, ...data };
    this.currentSession.timestamp = Date.now();

    this.logger.debug(`Updated sessionStorage: ${Object.keys(data).length} items`);
  }

  /**
   * Get sessionStorage
   */
  getSessionStorage(): Record<string, string> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }
    return { ...this.currentSession.sessionStorage };
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionStorage | null {
    return this.currentSession;
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null;
    this.logger.debug('Session cleared');
  }

  /**
   * Delete session from disk
   */
  async deleteSession(identifier: string): Promise<void> {
    try {
      const filePath = this.getSessionFile(identifier);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.info(`Session deleted: ${identifier}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete session: ${identifier}`, error);
    }
  }

  /**
   * List all saved sessions
   */
  listSessions(): string[] {
    try {
      const files = fs.readdirSync(this.sessionPath);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch (error) {
      this.logger.error('Failed to list sessions', error);
      return [];
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(ageMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      const sessions = this.listSessions();

      for (const sessionId of sessions) {
        const filePath = this.getSessionFile(sessionId);
        const stat = fs.statSync(filePath);

        if (now - stat.mtimeMs > ageMs) {
          fs.unlinkSync(filePath);
          this.logger.info(`Cleaned up old session: ${sessionId}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old sessions', error);
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
