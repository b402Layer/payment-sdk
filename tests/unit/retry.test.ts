import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryHandler } from '../../src/utils/retry';
import { Logger } from '../../src/utils/logger';
import { NetworkError, RateLimitError } from '../../src/errors';

describe('RetryHandler', () => {
  let logger: Logger;
  let retryHandler: RetryHandler;

  beforeEach(() => {
    logger = new Logger('error'); // Use error level to suppress logs during tests
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  describe('successful execution', () => {
    it('should execute function successfully on first attempt', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryHandler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should return the result from the function', async () => {
      retryHandler = new RetryHandler(3, logger);
      const expectedResult = { data: 'test' };
      const fn = vi.fn().mockResolvedValue(expectedResult);

      const result = await retryHandler.execute(fn);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry on NetworkError', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const result = await retryHandler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should retry on RateLimitError', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit', 1))
        .mockResolvedValue('success');

      const result = await retryHandler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx errors', async () => {
      retryHandler = new RetryHandler(3, logger);
      const error = new Error('Server error') as any;
      error.status = 500;
      
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await retryHandler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff between retries', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryHandler.execute(fn);
      const endTime = Date.now();

      // First retry: 1s, Second retry: 2s = 3s total minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum retry count', async () => {
      retryHandler = new RetryHandler(2, logger);
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      await expect(retryHandler.execute(fn)).rejects.toThrow('Network error');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw last error after all retries exhausted', async () => {
      retryHandler = new RetryHandler(2, logger);
      const error = new NetworkError('Final error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryHandler.execute(fn)).rejects.toThrow('Final error');
    });
  });

  describe('shouldRetry decision logic', () => {
    it('should not retry on client errors (4xx)', async () => {
      retryHandler = new RetryHandler(3, logger);
      const error = new Error('Bad request') as any;
      error.status = 400;
      
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryHandler.execute(fn)).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledOnce(); // No retries
    });

    it('should not retry on 404 errors', async () => {
      retryHandler = new RetryHandler(3, logger);
      const error = new Error('Not found') as any;
      error.status = 404;
      
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryHandler.execute(fn)).rejects.toThrow('Not found');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should retry on 429 (rate limit)', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit', 1))
        .mockResolvedValue('success');

      const result = await retryHandler.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on unknown errors without status', async () => {
      retryHandler = new RetryHandler(3, logger);
      const error = new Error('Unknown error');
      
      const fn = vi.fn().mockRejectedValue(error);

      await expect(retryHandler.execute(fn)).rejects.toThrow('Unknown error');
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('calculateDelay with Retry-After header support', () => {
    it('should use Retry-After value for RateLimitError', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit', 2))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryHandler.execute(fn);
      const endTime = Date.now();

      // Should wait 2 seconds (2000ms) as specified in retryAfter
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });

    it('should cap exponential backoff at 30 seconds', async () => {
      retryHandler = new RetryHandler(10, logger);
      const fn = vi.fn();
      
      // Mock to fail many times to test max delay
      for (let i = 0; i < 10; i++) {
        fn.mockRejectedValueOnce(new NetworkError('Network error'));
      }
      fn.mockResolvedValue('success');

      const startTime = Date.now();
      await retryHandler.execute(fn);
      const endTime = Date.now();

      // Even with many retries, individual delays should be capped at 30s
      // Total time should be less than if we used uncapped exponential backoff
      expect(endTime - startTime).toBeLessThan(300000); // Less than 5 minutes
    });

    it('should use exponential backoff for NetworkError', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryHandler.execute(fn);
      const endTime = Date.now();

      // First retry: 1s (2^0 * 1000), Second retry: 2s (2^1 * 1000)
      // Total: at least 3 seconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });
  });

  describe('logging', () => {
    it('should log retry attempts', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      await retryHandler.execute(fn);

      expect(logger.warn).toHaveBeenCalledWith(
        'Request failed, retrying',
        expect.objectContaining({
          attempt: 1,
          maxRetries: 3,
          error: 'Network error',
        })
      );
    });

    it('should include delay in log message', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      await retryHandler.execute(fn);

      expect(logger.warn).toHaveBeenCalledWith(
        'Request failed, retrying',
        expect.objectContaining({
          delay: expect.any(Number),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero retries', async () => {
      retryHandler = new RetryHandler(0, logger);
      const fn = vi.fn().mockRejectedValue(new NetworkError('Network error'));

      await expect(retryHandler.execute(fn)).rejects.toThrow('Network error');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should handle async functions that throw synchronously', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi.fn().mockImplementation(() => {
        throw new NetworkError('Sync error');
      });

      await expect(retryHandler.execute(fn)).rejects.toThrow('Sync error');
    });

    it('should handle functions that return rejected promises', async () => {
      retryHandler = new RetryHandler(3, logger);
      const fn = vi.fn().mockReturnValue(Promise.reject(new NetworkError('Rejected')));

      await expect(retryHandler.execute(fn)).rejects.toThrow('Rejected');
    });
  });
});
