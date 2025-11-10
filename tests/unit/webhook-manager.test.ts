import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { WebhookManager } from '../../src/managers/webhook';
import { ValidationError } from '../../src/errors';

describe('WebhookManager', () => {
  let webhookManager: WebhookManager;
  let mockHttp: any;
  let mockLogger: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    };
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    webhookManager = new WebhookManager(mockHttp, mockLogger);
  });

  describe('create', () => {
    it('should create webhook with valid HTTPS URL', async () => {
      const mockWebhook = {
        id: 'wh_123',
        url: 'https://example.com/webhook',
        events: ['payment.created', 'payment.confirmed'],
        secret: 'whsec_abc123',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockWebhook);

      const result = await webhookManager.create({
        url: 'https://example.com/webhook',
        events: ['payment.created', 'payment.confirmed'],
      });

      expect(result).toEqual(mockWebhook);
      expect(mockHttp.post).toHaveBeenCalledWith('/webhooks', {
        url: 'https://example.com/webhook',
        events: ['payment.created', 'payment.confirmed'],
      });
    });

    it('should throw ValidationError for non-HTTPS URL', async () => {
      await expect(
        webhookManager.create({
          url: 'http://example.com/webhook',
          events: ['payment.created'],
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        webhookManager.create({
          url: 'http://example.com/webhook',
          events: ['payment.created'],
        })
      ).rejects.toThrow('Webhook URL must be a valid HTTPS endpoint');
    });

    it('should throw ValidationError for invalid URL', async () => {
      await expect(
        webhookManager.create({
          url: 'not-a-url',
          events: ['payment.created'],
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when no events provided', async () => {
      await expect(
        webhookManager.create({
          url: 'https://example.com/webhook',
          events: [],
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        webhookManager.create({
          url: 'https://example.com/webhook',
          events: [],
        })
      ).rejects.toThrow('At least one event type is required');
    });

    it('should include optional secret in request', async () => {
      const mockWebhook = {
        id: 'wh_123',
        url: 'https://example.com/webhook',
        events: ['payment.created'],
        secret: 'custom_secret',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockHttp.post.mockResolvedValue(mockWebhook);

      await webhookManager.create({
        url: 'https://example.com/webhook',
        events: ['payment.created'],
        secret: 'custom_secret',
      });

      expect(mockHttp.post).toHaveBeenCalledWith('/webhooks', {
        url: 'https://example.com/webhook',
        events: ['payment.created'],
        secret: 'custom_secret',
      });
    });
  });

  describe('list', () => {
    it('should return list of webhooks', async () => {
      const mockWebhooks = [
        {
          id: 'wh_123',
          url: 'https://example.com/webhook1',
          events: ['payment.created'],
          secret: 'whsec_abc',
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'wh_456',
          url: 'https://example.com/webhook2',
          events: ['payment.confirmed'],
          secret: 'whsec_def',
          active: true,
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      mockHttp.get.mockResolvedValue(mockWebhooks);

      const result = await webhookManager.list();

      expect(result).toEqual(mockWebhooks);
      expect(mockHttp.get).toHaveBeenCalledWith('/webhooks');
    });

    it('should return empty array when no webhooks exist', async () => {
      mockHttp.get.mockResolvedValue([]);

      const result = await webhookManager.list();

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete webhook by ID', async () => {
      mockHttp.delete.mockResolvedValue(undefined);

      await webhookManager.delete('wh_123');

      expect(mockHttp.delete).toHaveBeenCalledWith('/webhooks/wh_123');
      expect(mockLogger.info).toHaveBeenCalledWith('Webhook deleted', {
        webhookId: 'wh_123',
      });
    });
  });

  describe('verify', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ event: 'payment.created', data: {} });
      const secret = 'test_secret';
      
      // Compute expected signature using the same method
      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const validSignature = hmac.digest('hex');

      const result = webhookManager.verify(payload, validSignature, secret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ event: 'payment.created', data: {} });
      const secret = 'test_secret';
      const invalidSignature = 'invalid_signature_12345';

      const result = webhookManager.verify(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('should return false for signature with different secret', () => {
      const payload = JSON.stringify({ event: 'payment.created', data: {} });
      const secret1 = 'test_secret_1';
      const secret2 = 'test_secret_2';
      
      const hmac = createHmac('sha256', secret1);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const result = webhookManager.verify(payload, signature, secret2);

      expect(result).toBe(false);
    });

    it('should return false for signature with different payload', () => {
      const payload1 = JSON.stringify({ event: 'payment.created', data: {} });
      const payload2 = JSON.stringify({ event: 'payment.confirmed', data: {} });
      const secret = 'test_secret';
      
      const hmac = createHmac('sha256', secret);
      hmac.update(payload1);
      const signature = hmac.digest('hex');

      const result = webhookManager.verify(payload2, signature, secret);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const result = webhookManager.verify('', '', '');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
