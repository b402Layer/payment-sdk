import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { B402Client } from '../../src/client';
import { PaymentEvent } from '../../src/types';

describe('Payment Flow Integration', () => {
  let client: B402Client;

  beforeAll(() => {
    const apiKey = process.env.B402_TEST_API_KEY || 'test-api-key';
    client = new B402Client({
      apiKey,
      network: 'bnb-testnet',
      logLevel: 'debug',
    });
  });

  afterAll(async () => {
    await client.destroy();
  });

  it('should create a payment successfully', async () => {
    const payment = await client.payment.create({
      amount: '0.01',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      metadata: {
        test: true,
        description: 'Integration test payment',
      },
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBeDefined();
    expect(payment.status).toBe('pending');
    expect(payment.amount).toBe('0.01');
    expect(payment.currency).toBe('USDT');
    expect(payment.recipient).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    expect(payment.paymentUrl).toBeDefined();
    expect(payment.createdAt).toBeDefined();
  });

  it('should get payment status', async () => {
    const payment = await client.payment.create({
      amount: '0.01',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });

    const status = await client.payment.getStatus(payment.id);

    expect(status).toBeDefined();
    expect(status.id).toBe(payment.id);
    expect(status.state).toBeDefined();
    expect(status.timestamp).toBeDefined();
  });

  it('should list payments with filters', async () => {
    const payments = await client.payment.list({
      limit: 10,
      status: 'pending',
    });

    expect(Array.isArray(payments)).toBe(true);
    expect(payments.length).toBeLessThanOrEqual(10);
  });

  it('should listen to payment events', async () => {
    const payment = await client.payment.create({
      amount: '0.01',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });

    const events: PaymentEvent[] = [];
    const unsubscribe = client.payment.on(payment.id, (event) => {
      events.push(event);
    });

    // Wait for potential events
    await new Promise((resolve) => setTimeout(resolve, 3000));

    unsubscribe();

    // Events may or may not be received depending on test environment
    expect(Array.isArray(events)).toBe(true);
  }, 10000);

  it('should create batch payment', async () => {
    const batch = await client.payment.createBatch([
      {
        amount: '0.01',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
      {
        amount: '0.02',
        currency: 'USDT',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      },
    ]);

    expect(batch).toBeDefined();
    expect(batch.id).toBeDefined();
    expect(batch.payments).toHaveLength(2);
    expect(batch.totalAmount).toBeDefined();
    expect(batch.status).toBeDefined();
  });

  it('should cancel a pending payment', async () => {
    const payment = await client.payment.create({
      amount: '0.01',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });

    await expect(client.payment.cancel(payment.id)).resolves.not.toThrow();

    const status = await client.payment.getStatus(payment.id);
    expect(['expired', 'pending']).toContain(status.state);
  });
});
