/**
 * b402Layer Payment SDK
 *
 * Official TypeScript/JavaScript SDK for integrating b402Layer payment infrastructure
 * into your applications and AI agents.
 *
 * @packageDocumentation
 */

// Main client
export { B402Client } from './client';

// Type definitions
export type {
  ClientOptions,
  ClientConfig,
  LogLevel,
  Currency,
  PaymentState,
  CreatePaymentParams,
  Payment,
  PaymentStatus,
  PaymentEvent,
  PaymentFilters,
  BatchPayment,
  Refund,
  WebhookEvent,
  WebhookConfig,
  Webhook,
  FeeEstimate,
  ErrorResponse,
} from './types';

// Error classes
export {
  B402Error,
  PaymentNotFoundError,
  InsufficientFundsError,
  InvalidAddressError,
  PaymentExpiredError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
} from './errors';
