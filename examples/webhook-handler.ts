import express from 'express';
import { B402Client } from '../src/index';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize B402 client
const client = new B402Client({
  apiKey: process.env.B402_API_KEY!,
  network: 'bnb-mainnet',
  logLevel: 'info',
});

// Middleware to parse JSON bodies
app.use(express.json());

// Webhook endpoint
app.post('/webhooks/b402', (req, res) => {
  const signature = req.headers['x-b402-signature'] as string;
  const timestamp = req.headers['x-b402-timestamp'] as string;
  const payload = JSON.stringify(req.body);
  const secret = process.env.B402_WEBHOOK_SECRET!;

  // Verify timestamp to prevent replay attacks
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);

  if (timeDiff > 300000) {
    // 5 minutes
    console.error('Webhook request too old:', timeDiff, 'ms');
    return res.status(400).json({ error: 'Request too old' });
  }

  // Verify webhook signature
  const isValid = client.webhook.verify(payload, signature, secret);

  if (!isValid) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook event
  const event = req.body;
  console.log('Received webhook event:', event.type);

  try {
    handleWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle different webhook event types
function handleWebhookEvent(event: any) {
  switch (event.type) {
    case 'payment.created':
      console.log('Payment created:', event.data.paymentId);
      // Log payment creation, update database, etc.
      break;

    case 'payment.processing':
      console.log('Payment processing:', event.data.paymentId);
      console.log('Transaction hash:', event.data.txHash);
      // Update payment status in database
      break;

    case 'payment.confirming':
      console.log('Payment confirming:', event.data.paymentId);
      console.log('Confirmations:', event.data.confirmations);
      // Update confirmation count
      break;

    case 'payment.confirmed':
      console.log('Payment confirmed:', event.data.paymentId);
      console.log('Transaction hash:', event.data.txHash);
      // Deliver service to customer
      // Send confirmation email
      // Update order status
      deliverService(event.data.paymentId, event.data.metadata);
      break;

    case 'payment.failed':
      console.log('Payment failed:', event.data.paymentId);
      console.log('Reason:', event.data.error);
      // Handle payment failure
      // Notify customer
      // Update order status
      handlePaymentFailure(event.data.paymentId, event.data.error);
      break;

    case 'payment.expired':
      console.log('Payment expired:', event.data.paymentId);
      // Handle payment expiration
      // Release reserved inventory
      // Notify customer
      handlePaymentExpiration(event.data.paymentId);
      break;

    case 'payment.refunded':
      console.log('Payment refunded:', event.data.paymentId);
      console.log('Refund transaction:', event.data.refundTxHash);
      // Process refund
      // Update order status
      // Notify customer
      handleRefund(event.data.paymentId, event.data.refundTxHash);
      break;

    default:
      console.warn('Unknown event type:', event.type);
  }
}

// Business logic functions
function deliverService(paymentId: string, metadata: any) {
  console.log(`Delivering service for payment ${paymentId}`);
  // Implement your service delivery logic here
  // For example:
  // - Grant access to digital content
  // - Ship physical product
  // - Activate subscription
  // - Send download link
}

function handlePaymentFailure(paymentId: string, error: string) {
  console.log(`Handling payment failure for ${paymentId}: ${error}`);
  // Implement failure handling logic here
  // For example:
  // - Send notification to customer
  // - Update order status to failed
  // - Release reserved inventory
}

function handlePaymentExpiration(paymentId: string) {
  console.log(`Handling payment expiration for ${paymentId}`);
  // Implement expiration handling logic here
  // For example:
  // - Release reserved inventory
  // - Cancel order
  // - Send notification to customer
}

function handleRefund(paymentId: string, refundTxHash: string) {
  console.log(`Processing refund for ${paymentId}: ${refundTxHash}`);
  // Implement refund handling logic here
  // For example:
  // - Update order status to refunded
  // - Send refund confirmation email
  // - Update accounting records
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhooks/b402`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await client.destroy();
  process.exit(0);
});
