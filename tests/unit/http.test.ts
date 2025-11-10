import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { HttpService } from '../../src/services/http';
import { Logger } from '../../src/utils/logger';
import { ClientConfig } from '../../src/types';
import {
  NetworkError,
  AuthenticationError,
  RateLimitError,
  PaymentNotFoundError,
  ValidationError,
  B402Error,
} from '../../src/errors';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('HttpService', () => {
  let httpService: HttpService;
  let logger: Logger;
  let config: ClientConfig;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup logger
    logger = new Logger('error');
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    // Setup config
    config = {
      apiKey: 'test-api-key',
      network: 'bnb-testnet',
      apiUrl: 'https://api-testnet.b402layer.io',
      timeout: 30000,
      retries: 3,
      logLevel: 'error',
      cacheOptions: {
        ttl: 5000,
        maxSize: 100,
      },
    };

    // Setup mock axios instance
    mockAxiosInstance = {
      request: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create HTTP service
    httpService = new HttpService(config, logger);
  });

  describe('initialization', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api-testnet.b402layer.io',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
          'X-SDK-Version': '1.0.0',
          'User-Agent': 'b402-payment-sdk/1.0.0',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: { id: '123', status: 'success' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        data: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should return typed response', async () => {
      interface TestResponse {
        id: string;
        name: string;
      }
      const mockResponse = { data: { id: '123', name: 'test' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.get<TestResponse>('/test');

      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const requestData = { amount: '10.5', currency: 'USDT' };
      const mockResponse = { data: { id: 'pay_123', status: 'pending' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.post('/payments', requestData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/payments',
        data: requestData,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should make POST request without data', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.post('/cancel');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/cancel',
        data: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const requestData = { status: 'active' };
      const mockResponse = { data: { id: '123', status: 'active' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.put('/webhooks/123', requestData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/webhooks/123',
        data: requestData,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await httpService.delete('/webhooks/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/webhooks/123',
        data: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('error handling and transformation', () => {
    it('should throw NetworkError when no response', async () => {
      const error = new Error('Network error') as any;
      error.isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(NetworkError);
      await expect(httpService.get('/test')).rejects.toThrow(
        'Network error occurred'
      );
    });

    it('should throw AuthenticationError on 401', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(
        AuthenticationError
      );
      await expect(httpService.get('/test')).rejects.toThrow(
        'Authentication failed. Check your API key.'
      );
    });

    it('should throw AuthenticationError on 403', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw RateLimitError on 429', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Too many requests' },
          headers: { 'retry-after': '60' },
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(RateLimitError);
      
      try {
        await httpService.get('/test');
      } catch (e: any) {
        expect(e.retryAfter).toBe(60);
      }
    });

    it('should use default retry-after when header missing', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Too many requests' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      try {
        await httpService.get('/test');
      } catch (e: any) {
        expect(e.retryAfter).toBe(60);
      }
    });

    it('should throw PaymentNotFoundError on 404', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Payment not found' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(
        PaymentNotFoundError
      );
      await expect(httpService.get('/test')).rejects.toThrow(
        'Payment not found'
      );
    });

    it('should use default message for 404 when not provided', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow('Resource not found');
    });

    it('should throw ValidationError on 400', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid parameters' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(ValidationError);
      await expect(httpService.get('/test')).rejects.toThrow(
        'Invalid parameters'
      );
    });

    it('should use default message for 400 when not provided', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {},
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(
        'Invalid request parameters'
      );
    });

    it('should throw B402Error for other status codes', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { code: 'SERVER_ERROR', message: 'Internal server error' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(B402Error);
      await expect(httpService.get('/test')).rejects.toThrow(
        'Internal server error'
      );
    });

    it('should use default error code and message when not provided', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      try {
        await httpService.get('/test');
      } catch (e: any) {
        expect(e.code).toBe('UNKNOWN_ERROR');
        expect(e.message).toBe('An unexpected error occurred');
      }
    });
  });

  describe('retry logic integration', () => {
    it('should retry on network errors', async () => {
      const networkError = new Error('Network error') as any;
      networkError.isAxiosError = true;
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ data: { success: true } });

      const result = await httpService.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on 400 errors', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Bad request' },
          headers: {},
        },
      } as any;
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(httpService.get('/test')).rejects.toThrow(ValidationError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 errors', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Server error' },
          headers: {},
        },
      } as any;
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: { success: true } });

      const result = await httpService.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });
  });

  describe('rate limiting handling', () => {
    it('should handle rate limit with retry-after header', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: { 'retry-after': '2' },
        },
      } as any;

      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ data: { success: true } });

      const startTime = Date.now();
      const result = await httpService.get('/test');
      const endTime = Date.now();

      expect(result).toEqual({ success: true });
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });

    it('should parse retry-after header correctly', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {},
          headers: { 'retry-after': '5' },
        },
      } as any;

      mockAxiosInstance.request.mockRejectedValue(rateLimitError);

      try {
        await httpService.get('/test');
      } catch (e: any) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect(e.retryAfter).toBe(5);
      }
    });
  });

  describe('logging', () => {
    it('should log debug messages for requests', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { success: true } });

      await httpService.get('/test');

      expect(logger.debug).toHaveBeenCalledWith('GET /test', { data: undefined });
    });

    it('should log debug messages for successful responses', async () => {
      mockAxiosInstance.request.mockResolvedValue({ 
        data: { success: true },
        status: 200,
      });

      await httpService.get('/test');

      expect(logger.debug).toHaveBeenCalledWith('GET /test - Success', {
        status: 200,
      });
    });

    it('should log request data for POST requests', async () => {
      const requestData = { amount: '10.5' };
      mockAxiosInstance.request.mockResolvedValue({ data: { success: true } });

      await httpService.post('/payments', requestData);

      expect(logger.debug).toHaveBeenCalledWith('POST /payments', {
        data: requestData,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty response data', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: null });

      const result = await httpService.get('/test');

      expect(result).toBeNull();
    });

    it('should handle undefined response data', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: undefined });

      const result = await httpService.get('/test');

      expect(result).toBeUndefined();
    });

    it('should handle large response payloads', async () => {
      const largeData = new Array(1000).fill({ id: '123', data: 'test' });
      mockAxiosInstance.request.mockResolvedValue({ data: largeData });

      const result = await httpService.get('/test');

      expect(result).toEqual(largeData);
      expect(result).toHaveLength(1000);
    });

    it('should handle concurrent requests', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { success: true } });

      const promises = [
        httpService.get('/test1'),
        httpService.get('/test2'),
        httpService.post('/test3', { data: 'test' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });
});
