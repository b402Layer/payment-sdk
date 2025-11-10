import { createHmac } from 'crypto';
import { HttpService } from '../services/http';
import { Logger } from '../utils/logger';
import { WebhookConfig, Webhook } from '../types';
import { ValidationError } from '../errors';

/**
 * Webhook manager for webhook operations
 */
export class WebhookManager {
  constructor(
    private readonly http: HttpService,
    private readonly logger: Logger
  ) {}

  /**
   * Create a new webhook endpoint
   */
  async create(config: WebhookConfig): Promise<Webhook> {
    this.logger.debug('Creating webhook', { url: config.url });

    // Validate webhook URL
    if (!this.isValidHttpsUrl(config.url)) {
      throw new ValidationError('Webhook URL must be a valid HTTPS endpoint');
    }

    // Validate events
    if (!config.events || config.events.length === 0) {
      throw new ValidationError('At least one event type is required');
    }

    const webhook = await this.http.post<Webhook>('/webhooks', config);

    this.logger.info('Webhook created', { webhookId: webhook.id });
    return webhook;
  }

  /**
   * List all webhooks
   */
  async list(): Promise<Webhook[]> {
    this.logger.debug('Listing webhooks');
    return await this.http.get<Webhook[]>('/webhooks');
  }

  /**
   * Delete a webhook
   */
  async delete(webhookId: string): Promise<void> {
    this.logger.debug('Deleting webhook', { webhookId });
    await this.http.delete(`/webhooks/${webhookId}`);
    this.logger.info('Webhook deleted', { webhookId });
  }

  /**
   * Verify webhook signature
   */
  verify(payload: string, signature: string, secret: string): boolean {
    this.logger.debug('Verifying webhook signature');

    try {
      const expectedSignature = this.computeSignature(payload, secret);
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      this.logger.error('Webhook verification failed', { error });
      return false;
    }
  }

  /**
   * Compute HMAC-SHA256 signature
   */
  private computeSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  private isValidHttpsUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
