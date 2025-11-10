import { B402Client } from '../src/index';

async function main() {
  const client = new B402Client({
    apiKey: process.env.B402_API_KEY!,
    network: 'bnb-testnet',
    logLevel: 'info',
  });

  try {
    console.log('Creating batch payment...\n');

    // Define multiple payments
    const payments = [
      {
        amount: '10.0',
        currency: 'USDT' as const,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        metadata: {
          recipientName: 'Alice',
          purpose: 'Service payment',
        },
      },
      {
        amount: '15.5',
        currency: 'USDT' as const,
        recipient: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        metadata: {
          recipientName: 'Bob',
          purpose: 'Consulting fee',
        },
      },
      {
        amount: '20.0',
        currency: 'USDT' as const,
        recipient: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        metadata: {
          recipientName: 'Charlie',
          purpose: 'Development work',
        },
      },
    ];

    // Create batch payment
    const batch = await client.payment.createBatch(payments);

    console.log('Batch Payment Created:');
    console.log('  Batch ID:', batch.id);
    console.log('  Total Amount:', batch.totalAmount, 'USDT');
    console.log('  Total Fee:', batch.totalFee, 'USDT');
    console.log('  Status:', batch.status);
    console.log('  Number of Payments:', batch.payments.length);
    console.log('  Created At:', batch.createdAt);
    console.log('\nIndividual Payments:');

    // Display individual payment details
    batch.payments.forEach((payment, index) => {
      console.log(`\n  Payment ${index + 1}:`);
      console.log('    ID:', payment.id);
      console.log('    Amount:', payment.amount, payment.currency);
      console.log('    Recipient:', payment.recipient);
      console.log('    Status:', payment.status);
      console.log('    Payment URL:', payment.paymentUrl);
      if (payment.metadata) {
        console.log('    Metadata:', JSON.stringify(payment.metadata, null, 2));
      }
    });

    // Monitor batch payment status
    console.log('\n\nMonitoring batch payment status...\n');

    // Set up event listeners for each payment in the batch
    const unsubscribers = batch.payments.map((payment) => {
      return client.payment.on(payment.id, (event) => {
        const metadata = payment.metadata as any;
        const recipientName = metadata?.recipientName || 'Unknown';

        console.log(
          `[${recipientName}] Payment ${payment.id}: ${event.status}`
        );

        if (event.status === 'confirmed') {
          console.log(`  ✅ Payment to ${recipientName} confirmed!`);
        } else if (event.status === 'failed') {
          console.log(`  ❌ Payment to ${recipientName} failed: ${event.error}`);
        }
      });
    });

    // Check if all payments are completed
    const checkBatchCompletion = async () => {
      const statuses = await Promise.all(
        batch.payments.map((p) => client.payment.getStatus(p.id))
      );

      const allCompleted = statuses.every(
        (s) => s.state === 'confirmed' || s.state === 'failed'
      );

      if (allCompleted) {
        console.log('\n\nBatch payment processing completed!');
        const confirmed = statuses.filter((s) => s.state === 'confirmed').length;
        const failed = statuses.filter((s) => s.state === 'failed').length;
        console.log(`  Confirmed: ${confirmed}`);
        console.log(`  Failed: ${failed}`);

        // Cleanup
        unsubscribers.forEach((unsub) => unsub());
        await client.destroy();
      } else {
        // Check again in 5 seconds
        setTimeout(checkBatchCompletion, 5000);
      }
    };

    // Start monitoring
    setTimeout(checkBatchCompletion, 5000);
  } catch (error) {
    console.error('Error:', error);
    await client.destroy();
    process.exit(1);
  }
}

main();
