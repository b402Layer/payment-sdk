import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'crypto';
import { B402Client } from '../../src/client';

describe('Webhook Flow Integration', () => {
  let client: B402Client;
  let createdWebhookIds: string[] = [];

  beforeAll(() => {
    const apiKey = process.env.B402_TEST_API_KEY || 'test-api-key';
    client = new B402Client({
      apiKey,
      network: 'bnb-testnet',
      logLevel: 'debug',
    });
  });

  afterAll(async () => {
    // Cleanup created webhooks
    for (const webhookId of createdWebhookIds) {
      try {
        await client.webhook.delete(webhookId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    await client.destroy();
  });

  it('should create a webhook', async () => {
    const webhook = await client.webhook.create({
      url: 'https://example.com/webhook',
      events: ['payment.created', 'payment.confirmed'],
    });

    expect(webhook).toBeDefined();
    expect(webhook.id).toBeDefined();
    expect(webhook.url).toBe('https://example.com/webhook');
    expect(webhook.events).toEqual(['payment.created', 'payment.confirmed']);
    expect(webhook.secret).toBeDefined();
    expect(webhook.active).toBe(true);
    expect(webhook.createdAt).toBeDefined();

    createdWebhookIds.push(webhook.id);
  });

  it('should list webhooks', async () => {
    const webhooks = await client.webhook.list();

    expect(Array.isArray(webhooks)).toBe(true);
    expect(webhooks.length).toBeGreaterThanOrEqual(0);

    if (webhooks.length > 0) {
      const webhook = webhooks[0];
      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBeDefined();
      expect(webhook.events).toBeDefined();
      expect(Array.isArray(webhook.events)).toBe(true);
    }
  });

  it('should verify webhook signature', () => {
    const payload = JSON.stringify({
      type: 'payment.confirmed',
      data: {
        paymentId: 'pay_123',
        status: 'confirmed',
      },
    });
    const secret = 'test_secret_key';

    // Compute signature using the same method as the webhook manager
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const validSignature = hmac.digest('hex');

    const isValid = client.webhook.verify(payload, validSignature, secret);
    expect(isValid).toBe(true);
  });

  it('should reject invalid webhook signature', () => {
    const payload = JSON.stringify({
      type: 'payment.confirmed',
      data: {
        paymentId: 'pay_123',
        status: 'confirmed',
      },
    });
    const secret = 'test_secret_key';
    const invalidSignature = 'invalid_signature_12345';

    const isValid = client.webhook.verify(payload, invalidSignature, secret);
    expect(isValid).toBe(false);
  });

  it('should delete a webhook', async () => {
    const webhook = await client.webhook.create({
      url: 'https://example.com/webhook-to-delete',
      events: ['payment.created'],
    });

    await expect(client.webhook.delete(webhook.id)).resolves.not.toThrow();

    // Remove from cleanup list since we already deleted it
    createdWebhookIds = createdWebhookIds.filter((id) => id !== webhook.id);
  });

  it('should handle webhook creation with all event types', async () => {
    const webhook = await client.webhook.create({
      url: 'https://example.com/webhook-all-events',
      events: [
        'payment.created',
        'payment.processing',
        'payment.confirmed',
        'payment.failed',
        'payment.expired',
        'payment.refunded',
      ],
    });

    expect(webhook).toBeDefined();
    expect(webhook.events).toHaveLength(6);

    createdWebhookIds.push(webhook.id);
  });
});
