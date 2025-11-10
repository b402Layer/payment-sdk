import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtilsManager } from '../../src/managers/utils';
import { InvalidAddressError } from '../../src/errors';

describe('UtilsManager', () => {
  let utilsManager: UtilsManager;
  let mockHttp: any;
  let mockLogger: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
    };
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    utilsManager = new UtilsManager(mockHttp, mockLogger);
  });

  describe('estimateFee', () => {
    it('should return fee estimate for valid parameters', async () => {
      const mockEstimate = {
        gasFee: '0.001',
        platformFee: '0.05',
        totalFee: '0.051',
        currency: 'USDT',
      };

      mockHttp.get.mockResolvedValue(mockEstimate);

      const result = await utilsManager.estimateFee('10.5', 'USDT');

      expect(result).toEqual(mockEstimate);
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/utils/estimate-fee?amount=10.5&currency=USDT'
      );
    });

    it('should handle different currencies', async () => {
      const mockEstimate = {
        gasFee: '0.0001',
        platformFee: '0.01',
        totalFee: '0.0101',
        currency: 'BNB',
      };

      mockHttp.get.mockResolvedValue(mockEstimate);

      const result = await utilsManager.estimateFee('1.0', 'BNB');

      expect(result).toEqual(mockEstimate);
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/utils/estimate-fee?amount=1.0&currency=BNB'
      );
    });
  });

  describe('validateAddress', () => {
    it('should return true for valid address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const result = utilsManager.validateAddress(validAddress);
      expect(result).toBe(true);
    });

    it('should return true for valid lowercase address', () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb';
      const result = utilsManager.validateAddress(validAddress);
      expect(result).toBe(true);
    });

    it('should return true for valid uppercase address', () => {
      const validAddress = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB';
      const result = utilsManager.validateAddress(validAddress);
      expect(result).toBe(true);
    });

    it('should return false for address without 0x prefix', () => {
      const invalidAddress = '742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const result = utilsManager.validateAddress(invalidAddress);
      expect(result).toBe(false);
    });

    it('should return false for address with wrong length', () => {
      const invalidAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0b';
      const result = utilsManager.validateAddress(invalidAddress);
      expect(result).toBe(false);
    });

    it('should return false for address with invalid characters', () => {
      const invalidAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg';
      const result = utilsManager.validateAddress(invalidAddress);
      expect(result).toBe(false);
    });

    it('should return false for zero address', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const result = utilsManager.validateAddress(zeroAddress);
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = utilsManager.validateAddress('');
      expect(result).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const result1 = utilsManager.validateAddress(null as any);
      const result2 = utilsManager.validateAddress(undefined as any);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('toChecksumAddress', () => {
    it('should convert lowercase address to checksum format', () => {
      const lowercaseAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb';
      const result = utilsManager.toChecksumAddress(lowercaseAddress);
      
      // Should return a valid address with mixed case
      expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result).not.toBe(lowercaseAddress);
      expect(result.toLowerCase()).toBe(lowercaseAddress);
    });

    it('should handle already checksummed address', () => {
      const checksumAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const result = utilsManager.toChecksumAddress(checksumAddress);
      
      expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should throw InvalidAddressError for invalid address', () => {
      const invalidAddress = 'not-an-address';
      
      expect(() => {
        utilsManager.toChecksumAddress(invalidAddress);
      }).toThrow(InvalidAddressError);
    });

    it('should throw InvalidAddressError for zero address', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      
      expect(() => {
        utilsManager.toChecksumAddress(zeroAddress);
      }).toThrow(InvalidAddressError);
    });

    it('should throw InvalidAddressError for address with wrong length', () => {
      const shortAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0b';
      
      expect(() => {
        utilsManager.toChecksumAddress(shortAddress);
      }).toThrow(InvalidAddressError);
    });
  });
});
