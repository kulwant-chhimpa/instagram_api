/**
 * Configuration management and environment loading
 */

import * as fs from 'fs';
import * as path from 'path';

export const ENV_CONFIG = {
  // Browser Settings
  BROWSER_HEADLESS: process.env.BROWSER_HEADLESS === 'true',
  BROWSER_SLOWMO: parseInt(process.env.BROWSER_SLOWMO || '100', 10),
  BROWSER_TIMEOUT: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
  INFLACT_URL: process.env.INFLACT_URL || 'https://inflact.com',

  // Session Storage
  SESSION_DATA_PATH: process.env.SESSION_DATA_PATH || './data/sessions',
  ENABLE_SESSION_PERSISTENCE: process.env.ENABLE_SESSION_PERSISTENCE !== 'false',

  // API Configuration
  API_RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10),
  API_RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  API_MAX_CONCURRENT_REQUESTS: parseInt(process.env.API_MAX_CONCURRENT_REQUESTS || '5', 10),

  // Proxy Settings
  PROXY_URL: process.env.PROXY_URL,
  PROXY_USERNAME: process.env.PROXY_USERNAME,
  PROXY_PASSWORD: process.env.PROXY_PASSWORD,

  // User Agent
  ROTATE_USER_AGENTS: process.env.ROTATE_USER_AGENTS === 'true',

  // Logging
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',

  // Media
  DOWNLOAD_MEDIA: process.env.DOWNLOAD_MEDIA === 'true',
  MEDIA_OUTPUT_PATH: process.env.MEDIA_OUTPUT_PATH || './downloads',

  // Performance
  ENABLE_CACHE: process.env.ENABLE_CACHE !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10),
  MAX_BROWSER_POOL_SIZE: parseInt(process.env.MAX_BROWSER_POOL_SIZE || '3', 10),
};

/**
 * Ensure required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [
    ENV_CONFIG.SESSION_DATA_PATH,
    path.dirname(ENV_CONFIG.LOG_FILE),
    ENV_CONFIG.MEDIA_OUTPUT_PATH,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Load environment variables from .env file
 */
export function loadEnv(envPath: string = '.env'): void {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=').trim();

        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to load .env file from ${envPath}`, error);
  }
}
