import axios, { AxiosInstance, AxiosError } from 'axios';
import { ClientConfig } from '../types';
import { Logger } from '../utils/logger';
import { RetryHandler } from '../utils/retry';
import {
  B402Error,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  PaymentNotFoundError,
  ValidationError,
} from '../errors';

/**
 * HTTP service for API communication
 */
export class HttpService {
  private readonly client: AxiosInstance;
  private readonly retryHandler: RetryHandler;

  constructor(
    private readonly config: ClientConfig,
    private readonly logger: Logger
  ) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-SDK-Version': '1.0.0',
        'User-Agent': 'b402-payment-sdk/1.0.0',
      },
    });

    this.retryHandler = new RetryHandler(config.retries, logger);
    this.setupInterceptors();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, data?: any): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  async put<T>(path: string, data?: any): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    return this.retryHandler.execute(async () => {
      try {
        this.logger.debug(`${method} ${path}`, { data });

        const response = await this.client.request<T>({
          method,
          url: path,
          data,
        });

        this.logger.debug(`${method} ${path} - Success`, {
          status: response.status,
        });

        return response.data;
      } catch (error) {
        throw this.handleError(error as AxiosError);
      }
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        this.logger.debug('HTTP Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error: any) => {
        this.logger.error('HTTP Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => {
        this.logger.debug('HTTP Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: any) => {
        this.logger.error('HTTP Response Error', {
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (!error.response) {
      return new NetworkError('Network error occurred', error);
    }

    const { status, data } = error.response;
    const errorData = data as any;

    switch (status) {
      case 401:
      case 403:
        return new AuthenticationError(
          'Authentication failed. Check your API key.',
          error
        );
      case 429:
        const retryAfter = error.response.headers['retry-after'];
        return new RateLimitError(
          'Rate limit exceeded',
          parseInt(retryAfter) || 60,
          error
        );
      case 404:
        return new PaymentNotFoundError(
          errorData?.message || 'Resource not found',
          error
        );
      case 400:
        return new ValidationError(
          errorData?.message || 'Invalid request parameters',
          error
        );
      default:
        return new B402Error(
          errorData?.code || 'UNKNOWN_ERROR',
          errorData?.message || 'An unexpected error occurred',
          error
        );
    }
  }
}
