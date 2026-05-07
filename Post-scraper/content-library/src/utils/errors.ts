/**
 * Error handling and retry logic utilities
 */

import Logger from './logger';
import { RetryStrategy } from './types';

const logger = new Logger('ErrorHandler');

export class InflactError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'InflactError';
  }
}

export enum ErrorCode {
  CLOUDFLARE_CHALLENGE = 'CLOUDFLARE_CHALLENGE',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_SESSION = 'INVALID_SESSION',
  RATE_LIMITED = 'RATE_LIMITED',
  MISSING_COOKIES = 'MISSING_COOKIES',
  TIMEOUT = 'TIMEOUT',
  MALFORMED_JSON = 'MALFORMED_JSON',
  BROWSER_ERROR = 'BROWSER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SIGNATURE_ERROR = 'SIGNATURE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Determine error type from response or error object
 */
export function classifyError(error: any): ErrorCode {
  if (!error) return ErrorCode.UNKNOWN;

  const message = error.message || error.toString();
  const status = error.status || error.statusCode;

  if (message.includes('Cloudflare')) {
    return ErrorCode.CLOUDFLARE_CHALLENGE;
  }
  if (message.includes('token') || message.includes('signature')) {
    return ErrorCode.EXPIRED_TOKEN;
  }
  if (message.includes('session') || status === 401) {
    return ErrorCode.INVALID_SESSION;
  }
  if (status === 429) {
    return ErrorCode.RATE_LIMITED;
  }
  if (message.includes('cookie')) {
    return ErrorCode.MISSING_COOKIES;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCode.TIMEOUT;
  }
  if (message.includes('JSON')) {
    return ErrorCode.MALFORMED_JSON;
  }
  if (message.includes('browser')) {
    return ErrorCode.BROWSER_ERROR;
  }
  if (message.includes('network') || status === 0) {
    return ErrorCode.NETWORK_ERROR;
  }

  return ErrorCode.UNKNOWN;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  }
): Promise<T> {
  let lastError: any;
  let delay = strategy.initialDelay;

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${strategy.maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;
      const errorCode = classifyError(error);

      logger.warn(`Attempt ${attempt} failed: ${errorCode}`, {
        message: (error as Error).message,
        attempt,
      });

      if (attempt < strategy.maxAttempts) {
        logger.debug(`Retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * strategy.backoffMultiplier, strategy.maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Timeout promise - rejects if operation takes too long
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new InflactError(ErrorCode.TIMEOUT, timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Check if error is recoverable (retry-able)
 */
export function isRecoverableError(error: any): boolean {
  const code = classifyError(error);
  const recoverableCodes = [
    ErrorCode.CLOUDFLARE_CHALLENGE,
    ErrorCode.EXPIRED_TOKEN,
    ErrorCode.TIMEOUT,
    ErrorCode.RATE_LIMITED,
  ];
  return recoverableCodes.includes(code);
}
