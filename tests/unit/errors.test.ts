import { describe, it, expect } from 'vitest';
import {
  B402Error,
  PaymentNotFoundError,
  InsufficientFundsError,
  InvalidAddressError,
  PaymentExpiredError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
} from '../../src/errors';

describe('Error Classes', () => {
  describe('B402Error', () => {
    it('should create error with code and message', () => {
      const error = new B402Error('TEST_ERROR', 'Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('B402Error');
    });

    it('should include original error', () => {
      const originalError = new Error('Original error');
      const error = new B402Error('TEST_ERROR', 'Test error', originalError);
      
      expect(error.originalError).toBe(originalError);
    });

    it('should serialize to JSON', () => {
      const error = new B402Error('TEST_ERROR', 'Test error');
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'B402Error');
      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('stack');
    });
  });

  describe('PaymentNotFoundError', () => {
    it('should create with correct code', () => {
      const error = new PaymentNotFoundError('Payment not found');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('PAYMENT_NOT_FOUND');
      expect(error.name).toBe('PaymentNotFoundError');
    });
  });

  describe('InsufficientFundsError', () => {
    it('should create with correct code', () => {
      const error = new InsufficientFundsError('Insufficient funds');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('INSUFFICIENT_FUNDS');
      expect(error.name).toBe('InsufficientFundsError');
    });
  });

  describe('InvalidAddressError', () => {
    it('should create with correct code', () => {
      const error = new InvalidAddressError('Invalid address');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('INVALID_ADDRESS');
      expect(error.name).toBe('InvalidAddressError');
    });
  });

  describe('PaymentExpiredError', () => {
    it('should create with correct code', () => {
      const error = new PaymentExpiredError('Payment expired');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('PAYMENT_EXPIRED');
      expect(error.name).toBe('PaymentExpiredError');
    });
  });

  describe('NetworkError', () => {
    it('should create with correct code', () => {
      const error = new NetworkError('Network error');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('ValidationError', () => {
    it('should create with correct code', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with correct code', () => {
      const error = new AuthenticationError('Authentication failed');
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('RateLimitError', () => {
    it('should create with correct code and retryAfter', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      
      expect(error).toBeInstanceOf(B402Error);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.name).toBe('RateLimitError');
      expect(error.retryAfter).toBe(60);
    });
  });
});
