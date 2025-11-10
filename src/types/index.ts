/**
 * Log level for SDK logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Client configuration options
 */
export interface ClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Network to connect to */
  network: 'bnb-mainnet' | 'bnb-testnet';
  /** Custom API URL (optional) */
  apiUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Log level (default: 'info') */
  logLevel?: LogLevel;
  /** Cache TTL in milliseconds (default: 5000) */
  cacheTTL?: number;
  /** Maximum cache size (default: 100) */
  cacheMaxSize?: number;
}

/**
 * Internal client configuration with all required fields
 */
export interface ClientConfig extends Required<Omit<ClientOptions, 'cacheTTL' | 'cacheMaxSize'>> {
  cacheOptions: {
    ttl: number;
    maxSize: number;
  };
}

/**
 * Supported currencies
 */
export type Currency = 'BNB' | 'USDT' | 'USDC' | 'BUSD';

/**
 * Payment state
 */
export type PaymentState =
  | 'pending'
  | 'processing'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'refunded';

/**
 * Parameters for creating a payment
 */
export interface CreatePaymentParams {
  /** Payment amount as string */
  amount: string;
  /** Currency for the payment */
  currency: Currency;
  /** Recipient wallet address */
  recipient: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
  /** Expiration time in seconds */
  expiresIn?: number;
  /** Webhook URL for notifications */
  webhook?: string;
}

/**
 * Payment object
 */
export interface Payment {
  /** Unique payment identifier */
  id: string;
  /** Current payment status */
  status: PaymentState;
  /** Payment amount */
  amount: string;
  /** Payment currency */
  currency: string;
  /** Recipient address */
  recipient: string;
  /** Payer address (if payment initiated) */
  payer?: string;
  /** Transaction hash (if submitted to blockchain) */
  txHash?: string;
  /** Block number (if confirmed) */
  blockNumber?: number;
  /** Number of confirmations */
  confirmations?: number;
  /** Payment URL for manual completion */
  paymentUrl: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Payment status information
 */
export interface PaymentStatus {
  /** Payment identifier */
  id: string;
  /** Current state */
  state: PaymentState;
  /** Transaction hash */
  txHash?: string;
  /** Block number */
  blockNumber?: number;
  /** Number of confirmations */
  confirmations?: number;
  /** Status timestamp */
  timestamp: string;
}

/**
 * Payment event for real-time updates
 */
export interface PaymentEvent {
  /** Payment identifier */
  paymentId: string;
  /** Current status */
  status: PaymentState;
  /** Transaction hash */
  txHash?: string;
  /** Block number */
  blockNumber?: number;
  /** Number of confirmations */
  confirmations?: number;
  /** Event timestamp */
  timestamp: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Payment filters for listing
 */
export interface PaymentFilters {
  /** Filter by status */
  status?: PaymentState;
  /** Filter by currency */
  currency?: string;
  /** Start date */
  from?: Date;
  /** End date */
  to?: Date;
  /** Maximum results (default: 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Batch payment
 */
export interface BatchPayment {
  /** Batch identifier */
  id: string;
  /** Array of payments in the batch */
  payments: Payment[];
  /** Total amount */
  totalAmount: string;
  /** Total fee */
  totalFee: string;
  /** Batch status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Refund object
 */
export interface Refund {
  /** Refund identifier */
  id: string;
  /** Original payment identifier */
  paymentId: string;
  /** Refund amount */
  amount: string;
  /** Refund currency */
  currency: string;
  /** Refund status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Transaction hash */
  txHash?: string;
  /** Refund reason */
  reason?: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Webhook event types
 */
export type WebhookEvent =
  | 'payment.created'
  | 'payment.processing'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.refunded';

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Webhook endpoint URL (must be HTTPS) */
  url: string;
  /** Events to subscribe to */
  events: WebhookEvent[];
  /** Webhook signing secret (optional) */
  secret?: string;
}

/**
 * Webhook object
 */
export interface Webhook {
  /** Webhook identifier */
  id: string;
  /** Webhook URL */
  url: string;
  /** Subscribed events */
  events: WebhookEvent[];
  /** Signing secret */
  secret: string;
  /** Whether webhook is active */
  active: boolean;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Fee estimate
 */
export interface FeeEstimate {
  /** Gas fee */
  gasFee: string;
  /** Platform fee */
  platformFee: string;
  /** Total fee */
  totalFee: string;
  /** Fee currency */
  currency: string;
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: Record<string, any>;
}
