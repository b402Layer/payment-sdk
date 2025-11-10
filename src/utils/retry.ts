import { Logger } from './logger';
import { NetworkError, RateLimitError } from '../errors';

/**
 * Retry handler with exponential backoff
 */
export class RetryHandler {
  constructor(
    private readonly maxRetries: number,
    private readonly logger: Logger
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx except 429)
        if (!this.shouldRetry(error as Error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, error as Error);

        this.logger.warn('Request failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          delay,
          error: (error as Error).message,
        });

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: Error): boolean {
    // Retry on network errors
    if (error instanceof NetworkError) {
      return true;
    }

    // Retry on rate limit errors
    if (error instanceof RateLimitError) {
      return true;
    }

    // Retry on 5xx errors
    if ('status' in error && typeof (error as any).status === 'number') {
      return (error as any).status >= 500;
    }

    return false;
  }

  private calculateDelay(attempt: number, error: Error): number {
    // Use Retry-After header for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
