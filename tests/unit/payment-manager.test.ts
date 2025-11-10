import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentManager } from '../../src/managers/payment';
import { HttpService } from '../../src/services/http';
import { WebSocketService } from '../../src/services/websocket';
import { CacheService } from '../../src/services/cache';
import { Logger } from '../../src/utils/logger';
import { ValidationError, InvalidAddressError } from '../../src/errors';
import {
  CreatePaymentParams,
  Payment,
  PaymentStatus,
  PaymentEvent,
} from '../../src/types';

describe('PaymentManager', () => {
  let paymentManager: PaymentManager;
  let mockHttp: any;
  let mockWs: any;
  let mockCache: any;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockWs = {
      subscribe: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
    };

    mockLogger = new Logger('error');
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});

    paymentManager = new PaymentManager(
      mockHttp,
      mockWs,
      mockCache,
      mockLogger
    );
  });

  describe('create', () => {
    const validParams: CreatePaymentParams = {
      amount: '10.5',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    it('should create payment with valid parameters', async () => {
      const mockPayment: Payment = {
        id: 'pay_123',
        status: 'pending',
        amount: '10.5',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        paymentUrl: 'https://pay.b402layer.io/pay_123',
        expiresAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockPayment);

      const result = await paymentManager.create(validParams);

      expect(result).toEqual(mockPayment);
      expect(mockHttp.post).toHaveBeenCalledWith('/payments', validParams);
      expect(mockLogger.info).toHaveBeenCalledWith('Payment created', {
        paymentId: 'pay_123',
      });
    });

    it('should throw ValidationError for invalid amount (negative)', async () => {
      const params = { ...validParams, amount: '-10' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
      await expect(paymentManager.create(params)).rejects.toThrow(
        'Amount must be a positive number'
      );
    });

    it('should throw ValidationError for invalid amount (zero)', async () => {
      const params = { ...validParams, amount: '0' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for invalid amount (empty)', async () => {
      const params = { ...validParams, amount: '' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for missing currency', async () => {
      const params = { ...validParams, currency: '' as any };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
      await expect(paymentManager.create(params)).rejects.toThrow(
        'Currency is required'
      );
    });

    it('should throw ValidationError for unsupported currency', async () => {
      const params = { ...validParams, currency: 'ETH' as any };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
      await expect(paymentManager.create(params)).rejects.toThrow(
        'Unsupported currency: ETH'
      );
    });

    it('should accept all supported currencies', async () => {
      const mockPayment: Payment = {
        id: 'pay_123',
        status: 'pending',
        amount: '10.5',
        currency: 'BNB',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        paymentUrl: 'https://pay.b402layer.io/pay_123',
        expiresAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockPayment);

      const currencies = ['BNB', 'USDT', 'USDC', 'BUSD'] as const;

      for (const currency of currencies) {
        const params = { ...validParams, currency };
        await expect(paymentManager.create(params)).resolves.toBeDefined();
      }
    });

    it('should throw ValidationError for missing recipient', async () => {
      const params = { ...validParams, recipient: '' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        ValidationError
      );
      await expect(paymentManager.create(params)).rejects.toThrow(
        'Recipient address is required'
      );
    });

    it('should throw InvalidAddressError for invalid recipient address', async () => {
      const params = { ...validParams, recipient: 'invalid-address' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        InvalidAddressError
      );
      await expect(paymentManager.create(params)).rejects.toThrow(
        'Invalid recipient address'
      );
    });

    it('should throw InvalidAddressError for address with wrong length', async () => {
      const params = { ...validParams, recipient: '0x123' };

      await expect(paymentManager.create(params)).rejects.toThrow(
        InvalidAddressError
      );
    });

    it('should throw InvalidAddressError for address without 0x prefix', async () => {
      const params = {
        ...validParams,
        recipient: '742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      await expect(paymentManager.create(params)).rejects.toThrow(
        InvalidAddressError
      );
    });

    it('should accept valid address with mixed case', async () => {
      const mockPayment: Payment = {
        id: 'pay_123',
        status: 'pending',
        amount: '10.5',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        paymentUrl: 'https://pay.b402layer.io/pay_123',
        expiresAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockPayment);

      const params = {
        ...validParams,
        recipient: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      };

      await expect(paymentManager.create(params)).resolves.toBeDefined();
    });

    it('should include optional metadata in request', async () => {
      const mockPayment: Payment = {
        id: 'pay_123',
        status: 'pending',
        amount: '10.5',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        paymentUrl: 'https://pay.b402layer.io/pay_123',
        expiresAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        metadata: { orderId: '123' },
      };

      mockHttp.post.mockResolvedValue(mockPayment);

      const params = {
        ...validParams,
        metadata: { orderId: '123' },
      };

      await paymentManager.create(params);

      expect(mockHttp.post).toHaveBeenCalledWith('/payments', params);
    });
  });

  describe('getStatus', () => {
    it('should return cached status if available', async () => {
      const mockStatus: PaymentStatus = {
        id: 'pay_123',
        state: 'confirmed',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockCache.get.mockReturnValue(mockStatus);

      const result = await paymentManager.getStatus('pay_123');

      expect(result).toEqual(mockStatus);
      expect(mockCache.get).toHaveBeenCalledWith('payment:status:pay_123');
      expect(mockHttp.get).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Returning cached status', {
        paymentId: 'pay_123',
      });
    });

    it('should fetch from API if not cached', async () => {
      const mockStatus: PaymentStatus = {
        id: 'pay_123',
        state: 'confirmed',
        txHash: '0xabc123',
        blockNumber: 12345,
        confirmations: 12,
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockCache.get.mockReturnValue(null);
      mockHttp.get.mockResolvedValue(mockStatus);

      const result = await paymentManager.getStatus('pay_123');

      expect(result).toEqual(mockStatus);
      expect(mockHttp.get).toHaveBeenCalledWith('/payments/pay_123/status');
      expect(mockCache.set).toHaveBeenCalledWith(
        'payment:status:pay_123',
        mockStatus,
        5000
      );
    });

    it('should cache status with 5 second TTL', async () => {
      const mockStatus: PaymentStatus = {
        id: 'pay_123',
        state: 'confirmed',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockCache.get.mockReturnValue(null);
      mockHttp.get.mockResolvedValue(mockStatus);

      await paymentManager.getStatus('pay_123');

      expect(mockCache.set).toHaveBeenCalledWith(
        'payment:status:pay_123',
        mockStatus,
        5000
      );
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      mockWs.subscribe.mockReturnValue(unsubscribe);

      const result = paymentManager.on('pay_123', callback);

      expect(mockWs.subscribe).toHaveBeenCalledWith(
        '/payments/pay_123/events',
        expect.any(Function)
      );
      expect(result).toBe(unsubscribe);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Registering payment event listener',
        { paymentId: 'pay_123' }
      );
    });

    it('should invoke callback when event received', () => {
      const callback = vi.fn();
      let eventHandler: any;

      mockWs.subscribe.mockImplementation((channel, handler) => {
        eventHandler = handler;
        return vi.fn();
      });

      paymentManager.on('pay_123', callback);

      const event: PaymentEvent = {
        paymentId: 'pay_123',
        status: 'confirmed',
        txHash: '0xabc123',
        timestamp: '2024-01-01T00:00:00Z',
      };

      eventHandler(event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(mockLogger.debug).toHaveBeenCalledWith('Payment event received', {
        paymentId: 'pay_123',
        status: 'confirmed',
      });
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      mockWs.subscribe.mockReturnValue(unsubscribe);

      const result = paymentManager.on('pay_123', callback);

      expect(typeof result).toBe('function');
      expect(result).toBe(unsubscribe);
    });
  });

  describe('cancel', () => {
    it('should cancel payment', async () => {
      mockHttp.post.mockResolvedValue({});

      await paymentManager.cancel('pay_123');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/payments/pay_123/cancel',
        {}
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Payment cancelled', {
        paymentId: 'pay_123',
      });
    });

    it('should invalidate cache after cancellation', async () => {
      mockHttp.post.mockResolvedValue({});

      await paymentManager.cancel('pay_123');

      expect(mockCache.delete).toHaveBeenCalledWith('payment:status:pay_123');
    });
  });

  describe('refund', () => {
    it('should refund payment without reason', async () => {
      const mockRefund = {
        id: 'ref_123',
        paymentId: 'pay_123',
        amount: '10.5',
        currency: 'USDT',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockRefund);

      const result = await paymentManager.refund('pay_123');

      expect(result).toEqual(mockRefund);
      expect(mockHttp.post).toHaveBeenCalledWith('/payments/pay_123/refund', {
        reason: undefined,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Refund initiated', {
        paymentId: 'pay_123',
        refundId: 'ref_123',
      });
    });

    it('should refund payment with reason', async () => {
      const mockRefund = {
        id: 'ref_123',
        paymentId: 'pay_123',
        amount: '10.5',
        currency: 'USDT',
        status: 'pending',
        reason: 'Customer request',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockRefund);

      const result = await paymentManager.refund('pay_123', 'Customer request');

      expect(result).toEqual(mockRefund);
      expect(mockHttp.post).toHaveBeenCalledWith('/payments/pay_123/refund', {
        reason: 'Customer request',
      });
    });
  });

  describe('list', () => {
    it('should list payments without filters', async () => {
      const mockPayments: Payment[] = [
        {
          id: 'pay_123',
          status: 'confirmed',
          amount: '10.5',
          currency: 'USDT',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          paymentUrl: 'https://pay.b402layer.io/pay_123',
          expiresAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockHttp.get.mockResolvedValue(mockPayments);

      const result = await paymentManager.list();

      expect(result).toEqual(mockPayments);
      expect(mockHttp.get).toHaveBeenCalledWith('/payments?');
    });

    it('should list payments with status filter', async () => {
      const mockPayments: Payment[] = [];
      mockHttp.get.mockResolvedValue(mockPayments);

      await paymentManager.list({ status: 'confirmed' });

      expect(mockHttp.get).toHaveBeenCalledWith('/payments?status=confirmed');
    });

    it('should list payments with currency filter', async () => {
      const mockPayments: Payment[] = [];
      mockHttp.get.mockResolvedValue(mockPayments);

      await paymentManager.list({ currency: 'USDT' });

      expect(mockHttp.get).toHaveBeenCalledWith('/payments?currency=USDT');
    });

    it('should list payments with date range filters', async () => {
      const mockPayments: Payment[] = [];
      mockHttp.get.mockResolvedValue(mockPayments);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      await paymentManager.list({ from, to });

      expect(mockHttp.get).toHaveBeenCalledWith(
        `/payments?from=${from.toISOString()}&to=${to.toISOString()}`
      );
    });

    it('should list payments with pagination', async () => {
      const mockPayments: Payment[] = [];
      mockHttp.get.mockResolvedValue(mockPayments);

      await paymentManager.list({ limit: 10, offset: 20 });

      expect(mockHttp.get).toHaveBeenCalledWith('/payments?limit=10&offset=20');
    });

    it('should list payments with all filters', async () => {
      const mockPayments: Payment[] = [];
      mockHttp.get.mockResolvedValue(mockPayments);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      await paymentManager.list({
        status: 'confirmed',
        currency: 'USDT',
        from,
        to,
        limit: 10,
        offset: 20,
      });

      const expectedUrl = `/payments?status=confirmed&currency=USDT&from=${from.toISOString()}&to=${to.toISOString()}&limit=10&offset=20`;
      expect(mockHttp.get).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('createBatch', () => {
    const validPayment1: CreatePaymentParams = {
      amount: '10.5',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    const validPayment2: CreatePaymentParams = {
      amount: '5.0',
      currency: 'BNB',
      recipient: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
    };

    it('should create batch payment with valid payments', async () => {
      const mockBatch = {
        id: 'batch_123',
        payments: [],
        totalAmount: '15.5',
        totalFee: '0.5',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockBatch);

      const result = await paymentManager.createBatch([
        validPayment1,
        validPayment2,
      ]);

      expect(result).toEqual(mockBatch);
      expect(mockHttp.post).toHaveBeenCalledWith('/payments/batch', {
        payments: [validPayment1, validPayment2],
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Batch payment created', {
        batchId: 'batch_123',
      });
    });

    it('should validate all payments before submission', async () => {
      const invalidPayment = {
        amount: '-10',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      await expect(
        paymentManager.createBatch([validPayment1, invalidPayment as any])
      ).rejects.toThrow(ValidationError);

      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should include index in validation error message', async () => {
      const invalidPayment = {
        amount: '-10',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      await expect(
        paymentManager.createBatch([validPayment1, invalidPayment as any])
      ).rejects.toThrow('Invalid payment at index 1');
    });

    it('should validate all payments even if first is invalid', async () => {
      const invalidPayment = {
        amount: '-10',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      await expect(
        paymentManager.createBatch([invalidPayment as any, validPayment1])
      ).rejects.toThrow('Invalid payment at index 0');
    });

    it('should handle empty batch array', async () => {
      const mockBatch = {
        id: 'batch_123',
        payments: [],
        totalAmount: '0',
        totalFee: '0',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockBatch);

      const result = await paymentManager.createBatch([]);

      expect(result).toEqual(mockBatch);
    });
  });
});
