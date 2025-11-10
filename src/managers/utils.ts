import { keccak_256 } from '@noble/hashes/sha3';
import { HttpService } from '../services/http';
import { Logger } from '../utils/logger';
import { FeeEstimate } from '../types';
import { InvalidAddressError } from '../errors';

/**
 * Utils manager for utility operations
 */
export class UtilsManager {
  constructor(
    private readonly http: HttpService,
    private readonly logger: Logger
  ) {}

  /**
   * Estimate transaction fee
   */
  async estimateFee(amount: string, currency: string): Promise<FeeEstimate> {
    this.logger.debug('Estimating fee', { amount, currency });

    const estimate = await this.http.get<FeeEstimate>(
      `/utils/estimate-fee?amount=${amount}&currency=${currency}`
    );

    return estimate;
  }

  /**
   * Validate a wallet address
   */
  validateAddress(address: string): boolean {
    this.logger.debug('Validating address', { address });

    // Check format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return false;
    }

    // Check for zero address
    if (address === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    // Validate checksum if present
    if (this.hasChecksum(address)) {
      return this.validateChecksum(address);
    }

    return true;
  }

  /**
   * Convert address to checksummed format
   */
  toChecksumAddress(address: string): string {
    if (!this.validateAddress(address)) {
      throw new InvalidAddressError(`Invalid address: ${address}`);
    }

    const addr = address.toLowerCase().replace('0x', '');
    const hash = this.keccak256(addr);

    let checksummed = '0x';
    for (let i = 0; i < addr.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksummed += addr[i].toUpperCase();
      } else {
        checksummed += addr[i];
      }
    }

    return checksummed;
  }

  private hasChecksum(address: string): boolean {
    const addr = address.replace('0x', '');
    return addr !== addr.toLowerCase() && addr !== addr.toUpperCase();
  }

  private validateChecksum(address: string): boolean {
    try {
      const checksummed = this.toChecksumAddress(address);
      return checksummed === address;
    } catch {
      return false;
    }
  }

  private keccak256(data: string): string {
    const bytes = new (globalThis as any).TextEncoder().encode(data);
    const hash = keccak_256(bytes);
    return Array.from(hash as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
