import { HttpService } from '../services/http';
import { WebSocketService } from '../services/websocket';
import { CacheService } from '../services/cache';
import { Logger } from '../utils/logger';
import {
  CreatePaymentParams,
  Payment,
  PaymentStatus,
  PaymentEvent,
  PaymentFilters,
  BatchPayment,
  Refund,
} from '../types';
import { ValidationError, InvalidAddressError } from '../errors';

/**
 * Payment manager for payment operations
 */
export class PaymentManager {
  constructor(
    private readonly http: HttpService,
    private readonly ws: WebSocketService,
    private readonly cache: CacheService,
    private readonly logger: Logger
  ) {}

  /**
   * Create a new payment request
   */
  async create(params: CreatePaymentParams): Promise<Payment> {
    this.logger.debug('Creating payment', { params });

    // Validate parameters
    this.validateCreateParams(params);

    // Make API request
    const response = await this.http.post<Payment>('/payments', params);

    this.logger.info('Payment created', { paymentId: response.id });
    return response;
  }

  /**
   * Get payment status
   */
  async getStatus(paymentId: string): Promise<PaymentStatus> {
    this.logger.debug('Getting payment status', { paymentId });

    // Check cache first
    const cacheKey = `payment:status:${paymentId}`;
    const cached = this.cache.get<PaymentStatus>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached status', { paymentId });
      return cached;
    }

    // Fetch from API
    const status = await this.http.get<PaymentStatus>(
      `/payments/${paymentId}/status`
    );

    // Cache the result
    this.cache.set(cacheKey, status, 5000); // 5 second TTL

    return status;
  }

  /**
   * Listen to payment events in real-time
   */
  on(paymentId: string, callback: (event: PaymentEvent) => void): () => void {
    this.logger.debug('Registering payment event listener', { paymentId });

    const unsubscribe = this.ws.subscribe(
      `/payments/${paymentId}/events`,
      (data: PaymentEvent) => {
        this.logger.debug('Payment event received', {
          paymentId,
          status: data.status,
        });
        callback(data);
      }
    );

    return unsubscribe;
  }

  /**
   * Cancel a pending payment
   */
  async cancel(paymentId: string): Promise<void> {
    this.logger.debug('Cancelling payment', { paymentId });

    await this.http.post(`/payments/${paymentId}/cancel`, {});

    // Invalidate cache
    this.cache.delete(`payment:status:${paymentId}`);

    this.logger.info('Payment cancelled', { paymentId });
  }

  /**
   * Refund a completed payment
   */
  async refund(paymentId: string, reason?: string): Promise<Refund> {
    this.logger.debug('Refunding payment', { paymentId, reason });

    const refund = await this.http.post<Refund>(
      `/payments/${paymentId}/refund`,
      { reason }
    );

    this.logger.info('Refund initiated', {
      paymentId,
      refundId: refund.id,
    });

    return refund;
  }

  /**
   * List payments with filters
   */
  async list(filters?: PaymentFilters): Promise<Payment[]> {
    this.logger.debug('Listing payments', { filters });

    const queryParams = this.buildQueryParams(filters);
    const payments = await this.http.get<Payment[]>(
      `/payments?${queryParams}`
    );

    return payments;
  }

  /**
   * Create batch payment
   */
  async createBatch(payments: CreatePaymentParams[]): Promise<BatchPayment> {
    this.logger.debug('Creating batch payment', {
      count: payments.length,
    });

    // Validate all payments
    payments.forEach((p, i) => {
      try {
        this.validateCreateParams(p);
      } catch (error) {
        throw new ValidationError(
          `Invalid payment at index ${i}: ${(error as Error).message}`
        );
      }
    });

    const batch = await this.http.post<BatchPayment>('/payments/batch', {
      payments,
    });

    this.logger.info('Batch payment created', { batchId: batch.id });
    return batch;
  }

  private validateCreateParams(params: CreatePaymentParams): void {
    if (!params.amount || parseFloat(params.amount) <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    if (!params.currency) {
      throw new ValidationError('Currency is required');
    }

    const supportedCurrencies = ['BNB', 'USDT', 'USDC', 'BUSD'];
    if (!supportedCurrencies.includes(params.currency)) {
      throw new ValidationError(
        `Unsupported currency: ${params.currency}. Supported: ${supportedCurrencies.join(', ')}`
      );
    }

    if (!params.recipient) {
      throw new ValidationError('Recipient address is required');
    }

    if (!this.isValidAddress(params.recipient)) {
      throw new InvalidAddressError(
        `Invalid recipient address: ${params.recipient}`
      );
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private buildQueryParams(filters?: PaymentFilters): string {
    if (!filters) return '';

    const params = new (globalThis as any).URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.currency) params.append('currency', filters.currency);
    if (filters.from) params.append('from', filters.from.toISOString());
    if (filters.to) params.append('to', filters.to.toISOString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return params.toString();
  }
}
