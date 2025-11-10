import { B402Client } from '../src';

async function main() {
  // Initialize the client
  const client = new B402Client({
    apiKey: process.env.B402_API_KEY!,
    network: 'bnb-testnet',
  });

  try {
    // Create a payment
    const payment = await client.payment.create({
      amount: '10.5',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      metadata: {
        orderId: 'order-123',
        description: 'Test payment',
      },
    });

    console.log('Payment created:', payment.id);
    console.log('Payment URL:', payment.paymentUrl);

    // Check status
    const status = await client.payment.getStatus(payment.id);
    console.log('Current status:', status.state);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.destroy();
  }
}

main();
