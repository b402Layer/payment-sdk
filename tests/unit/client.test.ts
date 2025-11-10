import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { B402Client } from '../../src/client';
import { ValidationError, AuthenticationError } from '../../src/errors';

describe('B402Client', () => {
  describe('constructor', () => {
    it('should create client with valid configuration', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      expect(client).toBeInstanceOf(B402Client);
      expect(client.payment).toBeDefined();
      expect(client.webhook).toBeDefined();
      expect(client.utils).toBeDefined();
    });

    it('should create client with mainnet configuration', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-mainnet',
      });

      expect(client).toBeInstanceOf(B402Client);
    });

    it('should throw ValidationError when apiKey is missing', () => {
      expect(() => {
        new B402Client({
          apiKey: '',
          network: 'bnb-testnet',
        });
      }).toThrow(ValidationError);

      expect(() => {
        new B402Client({
          apiKey: '',
          network: 'bnb-testnet',
        });
      }).toThrow('API key is required');
    });

    it('should throw ValidationError when apiKey is undefined', () => {
      expect(() => {
        new B402Client({
          apiKey: undefined as any,
          network: 'bnb-testnet',
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError when network is missing', () => {
      expect(() => {
        new B402Client({
          apiKey: 'test-api-key',
          network: undefined as any,
        });
      }).toThrow(ValidationError);

      expect(() => {
        new B402Client({
          apiKey: 'test-api-key',
          network: undefined as any,
        });
      }).toThrow('Network is required');
    });

    it('should throw ValidationError for invalid network', () => {
      expect(() => {
        new B402Client({
          apiKey: 'test-api-key',
          network: 'invalid-network' as any,
        });
      }).toThrow(ValidationError);

      expect(() => {
        new B402Client({
          apiKey: 'test-api-key',
          network: 'ethereum-mainnet' as any,
        });
      }).toThrow(/Invalid network/);
    });

    it('should apply default timeout value', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const config = (client as any).config;
      expect(config.timeout).toBe(30000);
    });

    it('should apply custom timeout value', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        timeout: 60000,
      });

      const config = (client as any).config;
      expect(config.timeout).toBe(60000);
    });

    it('should apply default retries value', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const config = (client as any).config;
      expect(config.retries).toBe(3);
    });

    it('should apply custom retries value', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        retries: 5,
      });

      const config = (client as any).config;
      expect(config.retries).toBe(5);
    });

    it('should apply default log level', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const config = (client as any).config;
      expect(config.logLevel).toBe('info');
    });

    it('should apply custom log level', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        logLevel: 'debug',
      });

      const config = (client as any).config;
      expect(config.logLevel).toBe('debug');
    });

    it('should use default API URL for testnet', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const config = (client as any).config;
      expect(config.apiUrl).toBe('https://api-testnet.b402layer.io');
    });

    it('should use default API URL for mainnet', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-mainnet',
      });

      const config = (client as any).config;
      expect(config.apiUrl).toBe('https://api.b402layer.io');
    });

    it('should use custom API URL when provided', () => {
      const customUrl = 'https://custom-api.example.com';
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        apiUrl: customUrl,
      });

      const config = (client as any).config;
      expect(config.apiUrl).toBe(customUrl);
    });

    it('should apply default cache options', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const config = (client as any).config;
      expect(config.cacheOptions.ttl).toBe(5000);
      expect(config.cacheOptions.maxSize).toBe(100);
    });

    it('should apply custom cache TTL', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        cacheTTL: 10000,
      });

      const config = (client as any).config;
      expect(config.cacheOptions.ttl).toBe(10000);
    });

    it('should apply custom cache max size', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        cacheMaxSize: 200,
      });

      const config = (client as any).config;
      expect(config.cacheOptions.maxSize).toBe(200);
    });

    it('should initialize all managers', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      expect(client.payment).toBeDefined();
      expect(client.payment.create).toBeInstanceOf(Function);
      expect(client.payment.getStatus).toBeInstanceOf(Function);
      expect(client.payment.cancel).toBeInstanceOf(Function);
      expect(client.payment.refund).toBeInstanceOf(Function);
      expect(client.payment.list).toBeInstanceOf(Function);
      expect(client.payment.createBatch).toBeInstanceOf(Function);
      expect(client.payment.on).toBeInstanceOf(Function);

      expect(client.webhook).toBeDefined();
      expect(client.webhook.create).toBeInstanceOf(Function);
      expect(client.webhook.list).toBeInstanceOf(Function);
      expect(client.webhook.delete).toBeInstanceOf(Function);
      expect(client.webhook.verify).toBeInstanceOf(Function);

      expect(client.utils).toBeDefined();
      expect(client.utils.estimateFee).toBeInstanceOf(Function);
      expect(client.utils.validateAddress).toBeInstanceOf(Function);
      expect(client.utils.toChecksumAddress).toBeInstanceOf(Function);
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', async () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      await expect(client.destroy()).resolves.not.toThrow();
    });

    it('should close WebSocket connections', async () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const wsService = (client as any).wsService;
      const closeAllSpy = vi.spyOn(wsService, 'closeAll');

      await client.destroy();

      expect(closeAllSpy).toHaveBeenCalled();
    });

    it('should clear cache', async () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
      });

      const cacheService = (client as any).cacheService;
      const clearSpy = vi.spyOn(cacheService, 'clear');

      await client.destroy();

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('configuration merging', () => {
    it('should merge partial configuration with defaults', () => {
      const client = new B402Client({
        apiKey: 'test-api-key',
        network: 'bnb-testnet',
        timeout: 45000,
      });

      const config = (client as any).config;
      expect(config.apiKey).toBe('test-api-key');
      expect(config.network).toBe('bnb-testnet');
      expect(config.timeout).toBe(45000);
      expect(config.retries).toBe(3); // default
      expect(config.logLevel).toBe('info'); // default
    });

    it('should handle all custom options', () => {
      const client = new B402Client({
        apiKey: 'custom-key',
        network: 'bnb-mainnet',
        apiUrl: 'https://custom.api.com',
        timeout: 60000,
        retries: 5,
        logLevel: 'debug',
        cacheTTL: 10000,
        cacheMaxSize: 200,
      });

      const config = (client as any).config;
      expect(config.apiKey).toBe('custom-key');
      expect(config.network).toBe('bnb-mainnet');
      expect(config.apiUrl).toBe('https://custom.api.com');
      expect(config.timeout).toBe(60000);
      expect(config.retries).toBe(5);
      expect(config.logLevel).toBe('debug');
      expect(config.cacheOptions.ttl).toBe(10000);
      expect(config.cacheOptions.maxSize).toBe(200);
    });
  });
});
