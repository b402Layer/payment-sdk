/**
 * Base error class for all SDK errors
 */
export class B402Error extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'B402Error';
    Object.setPrototypeOf(this, B402Error.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      stack: this.stack,
    };
  }
}

/**
 * Payment not found error
 */
export class PaymentNotFoundError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('PAYMENT_NOT_FOUND', message, originalError);
    this.name = 'PaymentNotFoundError';
    Object.setPrototypeOf(this, PaymentNotFoundError.prototype);
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('INSUFFICIENT_FUNDS', message, originalError);
    this.name = 'InsufficientFundsError';
    Object.setPrototypeOf(this, InsufficientFundsError.prototype);
  }
}

/**
 * Invalid address error
 */
export class InvalidAddressError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('INVALID_ADDRESS', message, originalError);
    this.name = 'InvalidAddressError';
    Object.setPrototypeOf(this, InvalidAddressError.prototype);
  }
}

/**
 * Payment expired error
 */
export class PaymentExpiredError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('PAYMENT_EXPIRED', message, originalError);
    this.name = 'PaymentExpiredError';
    Object.setPrototypeOf(this, PaymentExpiredError.prototype);
  }
}

/**
 * Network error
 */
export class NetworkError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('NETWORK_ERROR', message, originalError);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('VALIDATION_ERROR', message, originalError);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends B402Error {
  constructor(message: string, originalError?: Error) {
    super('AUTHENTICATION_ERROR', message, originalError);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends B402Error {
  constructor(
    message: string,
    public readonly retryAfter: number,
    originalError?: Error
  ) {
    super('RATE_LIMIT_ERROR', message, originalError);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
