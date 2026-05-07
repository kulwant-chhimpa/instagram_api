/**
 * Request interceptor - captures and processes API requests
 */

import { Page, Route } from 'playwright';
import Logger from '../utils/logger';
import { CapturedAPIRequest, InterceptedRequest, InterceptedResponse, RequestInterceptorConfig } from '../utils/types';
import { generateRequestId, urlMatches, normalizeHeaders, safeJsonParse } from '../utils/helpers';

export class RequestInterceptor {
  private logger: Logger;
  private capturedRequests: Map<string, CapturedAPIRequest> = new Map();
  private config: RequestInterceptorConfig;
  private page: Page | null = null;

  constructor(config: Partial<RequestInterceptorConfig> = {}) {
    this.logger = new Logger('RequestInterceptor');
    this.config = {
      targetpattern: '/downloader/api/viewer/',
      captureHeaders: true,
      captureBody: true,
      captureResponse: true,
      maxCaptureSize: 10 * 1024 * 1024, // 10MB
      ...config,
    };
  }

  /**
   * Initialize interceptor for a page
   */
  async initialize(page: Page): Promise<void> {
    this.page = page;

    // Intercept all requests
    await page.route('**/*', async (route: Route) => {
      try {
        const request = route.request();
        const url = request.url();

        // Check if this request matches our target pattern
        if (urlMatches(url, this.config.targetpattern)) {
          await this.captureRequest(request);
        }

        // Continue the request
        await route.continue();
      } catch (error) {
        this.logger.error('Error in request interceptor', error);
        await route.abort();
      }
    });

    // Intercept responses
    page.on('response', async (response) => {
      try {
        const url = response.url();

        if (urlMatches(url, this.config.targetpattern)) {
          await this.captureResponse(response);
        }
      } catch (error) {
        this.logger.error('Error capturing response', error);
      }
    });

    this.logger.info('Request interceptor initialized');
  }

  /**
   * Capture request details
   */
  private async captureRequest(request: any): Promise<void> {
    const requestId = generateRequestId();

    try {
      const interceptedRequest: InterceptedRequest = {
        id: requestId,
        url: request.url(),
        method: request.method(),
        headers: this.config.captureHeaders ? normalizeHeaders(request.allHeaders()) : {},
        cookies: [],
        timestamp: Date.now(),
      };

      // Try to capture body
      if (this.config.captureBody) {
        try {
          const postData = request.postData();
          if (postData) {
            interceptedRequest.body = postData;
          }
        } catch {
          // Some requests don't have bodies
        }
      }

      const captured: CapturedAPIRequest = {
        request: interceptedRequest,
      };

      // Extract tokens if present
      const xClientToken = interceptedRequest.headers['x-client-token'];
      const xClientSignature = interceptedRequest.headers['x-client-signature'];

      if (xClientToken) {
        captured.extractedToken = xClientToken;
        this.logger.debug('Extracted x-client-token');
      }

      if (xClientSignature) {
        captured.extractedSignature = xClientSignature;
        this.logger.debug('Extracted x-client-signature');
      }

      this.capturedRequests.set(requestId, captured);

      this.logger.debug(`Captured request: ${interceptedRequest.method} ${interceptedRequest.url}`, {
        id: requestId,
        headers: Object.keys(interceptedRequest.headers).length,
      });
    } catch (error) {
      this.logger.error(`Failed to capture request`, error);
    }
  }

  /**
   * Capture response details
   */
  private async captureResponse(response: any): Promise<void> {
    try {
      const url = response.url();
      const status = response.status();

      // Find matching request
      const matchingCapture = Array.from(this.capturedRequests.values()).find((c) => c.request.url === url);

      if (!matchingCapture) {
        return;
      }

      const interceptedResponse: InterceptedResponse = {
        id: generateRequestId(),
        url,
        status,
        statusText: response.statusText(),
        headers: normalizeHeaders(response.allHeaders ? response.allHeaders() : response.headers()),
        body: null,
        timestamp: Date.now(),
      };

      // Try to capture body
      if (this.config.captureResponse) {
        try {
          const contentType = interceptedResponse.headers['content-type'] || '';

          if (contentType.includes('application/json')) {
            const text = await response.text();
            if (text.length < this.config.maxCaptureSize!) {
              interceptedResponse.body = safeJsonParse(text);
            }
          } else if (contentType.includes('text')) {
            const text = await response.text();
            if (text.length < this.config.maxCaptureSize!) {
              interceptedResponse.body = text;
            }
          }
        } catch {
          // Response body might not be readable
        }
      }

      matchingCapture.response = interceptedResponse;

      this.logger.debug(`Captured response: ${status} ${url}`, {
        size: JSON.stringify(interceptedResponse).length,
      });
    } catch (error) {
      this.logger.error('Failed to capture response', error);
    }
  }

  /**
   * Get all captured requests
   */
  getCapturedRequests(): CapturedAPIRequest[] {
    return Array.from(this.capturedRequests.values());
  }

  /**
   * Get a specific captured request by ID
   */
  getCapturedRequest(id: string): CapturedAPIRequest | undefined {
    return this.capturedRequests.get(id);
  }

  /**
   * Get the latest captured request
   */
  getLatestCapturedRequest(): CapturedAPIRequest | undefined {
    const requests = Array.from(this.capturedRequests.values());
    return requests.length > 0 ? requests[requests.length - 1] : undefined;
  }

  /**
   * Get captured requests by URL pattern
   */
  getCapturedRequestsByUrl(pattern: RegExp | string): CapturedAPIRequest[] {
    return Array.from(this.capturedRequests.values()).filter((c) =>
      urlMatches(c.request.url, pattern)
    );
  }

  /**
   * Extract tokens from all captured requests
   */
  extractAllTokens(): { token?: string; signature?: string } {
    const requests = Array.from(this.capturedRequests.values());

    for (const captured of requests.reverse()) {
      if (captured.extractedToken || captured.extractedSignature) {
        return {
          token: captured.extractedToken,
          signature: captured.extractedSignature,
        };
      }
    }

    return {};
  }

  /**
   * Clear captured requests
   */
  clearCapturedRequests(): void {
    this.capturedRequests.clear();
    this.logger.debug('Cleared all captured requests');
  }

  /**
   * Get statistics about captured requests
   */
  getStatistics(): Record<string, any> {
    const requests = Array.from(this.capturedRequests.values());
    const withToken = requests.filter((r) => r.extractedToken).length;
    const withSignature = requests.filter((r) => r.extractedSignature).length;
    const withResponse = requests.filter((r) => r.response).length;

    return {
      totalCaptured: requests.length,
      withToken,
      withSignature,
      withResponse,
      averageResponseTime: this.calculateAverageResponseTime(),
    };
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    const requests = Array.from(this.capturedRequests.values()).filter((r) => r.response);

    if (requests.length === 0) return 0;

    const totalDuration = requests.reduce((sum, r) => {
      if (!r.response) return sum;
      return sum + (r.response.timestamp - r.request.timestamp);
    }, 0);

    return Math.round(totalDuration / requests.length);
  }
}
