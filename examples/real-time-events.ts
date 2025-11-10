import { B402Client } from '../src/index';

async function main() {
  const client = new B402Client({
    apiKey: process.env.B402_API_KEY!,
    network: 'bnb-testnet',
    logLevel: 'info',
  });

  try {
    // Create a payment
    const payment = await client.payment.create({
      amount: '10.5',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      metadata: {
        orderId: 'order-123',
        description: 'Real-time event monitoring example',
      },
    });

    console.log('Payment created:', payment.id);
    console.log('Payment URL:', payment.paymentUrl);
    console.log('\nListening for payment events...\n');

    // Listen to real-time payment events
    const unsubscribe = client.payment.on(payment.id, (event) => {
      console.log(`[${new Date(event.timestamp).toLocaleTimeString()}] Status: ${event.status}`);

      if (event.txHash) {
        console.log(`  Transaction Hash: ${event.txHash}`);
      }

      if (event.confirmations !== undefined) {
        console.log(`  Confirmations: ${event.confirmations}/12`);
      }

      if (event.error) {
        console.log(`  Error: ${event.error}`);
      }

      // Handle different payment states
      switch (event.status) {
        case 'processing':
          console.log('  ⏳ Payment is being processed on the blockchain...');
          break;
        case 'confirming':
          console.log('  🔄 Waiting for block confirmations...');
          break;
        case 'confirmed':
          console.log('  ✅ Payment confirmed! Service can be delivered.');
          unsubscribe();
          client.destroy();
          break;
        case 'failed':
          console.log('  ❌ Payment failed!');
          unsubscribe();
          client.destroy();
          break;
        case 'expired':
          console.log('  ⏰ Payment expired without completion.');
          unsubscribe();
          client.destroy();
          break;
      }
    });

    // Keep the process running to receive events
    console.log('Press Ctrl+C to exit\n');
  } catch (error) {
    console.error('Error:', error);
    await client.destroy();
    process.exit(1);
  }
}

main();
