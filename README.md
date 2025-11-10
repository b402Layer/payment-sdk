<div align="center">

# b402Layer Payment SDK

[![npm version](https://img.shields.io/npm/v/@b402layer/payment-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@b402layer/payment-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@b402layer/payment-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@b402layer/payment-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square)](https://nodejs.org/)

Official TypeScript/JavaScript SDK for integrating b402Layer payment infrastructure into your applications and AI agents.

[Documentation](https://docs.b402layer.com) • [Examples](./examples) • [API Reference](https://docs.b402layer.com/sdk/api-reference) • [Twitter](https://x.com/b402Layer)

</div>

---

## ✨ Features

- 🚀 **Simple & Intuitive** - Clean API design for quick integration
- 💪 **TypeScript First** - Full type safety with comprehensive type definitions
- 🔄 **Real-time Updates** - WebSocket support for instant payment status notifications
- 🛡️ **Production Ready** - Built-in error handling, retry logic, and request caching
- 📦 **Universal** - Works seamlessly in Node.js and modern browsers
- 🧪 **Well Tested** - Comprehensive test coverage with unit and integration tests
- 🔐 **Secure** - Webhook signature verification and secure API key handling
- 📚 **Well Documented** - Extensive documentation and working examples

## 📦 Installation

```bash
# npm
npm install @b402layer/payment-sdk

# yarn
yarn add @b402layer/payment-sdk

# pnpm
pnpm add @b402layer/payment-sdk
```

## 🚀 Quick Start

```typescript
import { B402Client } from '@b402layer/payment-sdk';

// Initialize client
const client = new B402Client({
  apiKey: 'your-api-key',
  network: 'bnb-mainnet',
});

// Create a payment
const payment = await client.payment.create({
  amount: '10.5',
  currency: 'USDT',
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
});

console.log('Payment ID:', payment.id);
console.log('Payment URL:', payment.paymentUrl);

// Listen to payment events
client.payment.on(payment.id, (event) => {
  console.log('Payment status:', event.status);
  
  if (event.status === 'confirmed') {
    console.log('Payment confirmed!');
  }
});
```

## 📖 Core Features

### Payment Management

Create and manage cryptocurrency payments with ease:

```typescript
// Create a payment
const payment = await client.payment.create({
  amount: '10.5',
  currency: 'USDT',
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  metadata: {
    orderId: 'order-123',
    customerId: 'user-456',
  },
});

// Get payment status
const status = await client.payment.getStatus(payment.id);

// Cancel a payment
await client.payment.cancel(payment.id);

// Refund a payment
await client.payment.refund(payment.id, 'Customer request');
```

### Real-time Event Listening

Subscribe to payment events for instant updates:

```typescript
const unsubscribe = client.payment.on(payment.id, (event) => {
  console.log(`Payment ${event.status}:`, event.data);
  
  switch (event.status) {
    case 'confirmed':
      console.log('✅ Payment confirmed!');
      break;
    case 'failed':
      console.log('❌ Payment failed:', event.error);
      break;
  }
});

// Unsubscribe when done
unsubscribe();
```

### Webhook Integration

Secure webhook handling with automatic signature verification:

```typescript
// Create a webhook
const webhook = await client.webhook.create({
  url: 'https://your-domain.com/webhooks/b402',
  events: ['payment.confirmed', 'payment.failed'],
});

// Verify webhook signatures
app.post('/webhooks/b402', (req, res) => {
  const signature = req.headers['x-b402-signature'];
  const isValid = client.webhook.verify(
    JSON.stringify(req.body),
    signature,
    webhook.secret
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook event
  const event = req.body;
  console.log('Webhook event:', event.type);
  
  res.status(200).send('OK');
});
```

### Batch Payments

Process multiple payments efficiently:

```typescript
const batch = await client.payment.createBatch([
  { amount: '10', currency: 'USDT', recipient: '0x...' },
  { amount: '20', currency: 'USDC', recipient: '0x...' },
  { amount: '30', currency: 'BNB', recipient: '0x...' },
]);

console.log(`Batch ${batch.id}: ${batch.payments.length} payments created`);
```

### Utility Functions

Additional helper functions for common tasks:

```typescript
// Estimate transaction fees
const feeEstimate = await client.utils.estimateFee('10', 'USDT');
console.log(`Estimated fee: ${feeEstimate.fee} ${feeEstimate.currency}`);

// Validate wallet addresses
const isValid = client.utils.validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

// Convert to checksummed address
const checksummed = client.utils.toChecksumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb');
```

## 📚 Documentation

- [📘 API Reference](https://docs.b402layer.com/sdk/api-reference)
- [💡 Examples](./examples)
- [🔧 Configuration Guide](https://docs.b402layer.com/sdk/configuration)
- [🚀 Migration Guide](https://docs.b402layer.com/sdk/migration)

## 🌐 Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| BNB Chain Mainnet | 56 | ✅ Production |
| BNB Chain Testnet | 97 | ✅ Testing |

## 💰 Supported Tokens

| Token | Type | Contract Address |
|-------|------|------------------|
| BNB | Native | - |
| USDT | BEP-20 | `0x55d398326f99059fF775485246999027B3197955` |
| USDC | BEP-20 | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| BUSD | BEP-20 | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |

## ⚙️ Configuration Options

```typescript
const client = new B402Client({
  apiKey: 'your-api-key',           // Required: Your API key
  network: 'bnb-mainnet',            // Required: 'bnb-mainnet' or 'bnb-testnet'
  apiUrl: 'https://api.b402layer.com', // Optional: Custom API URL
  timeout: 30000,                    // Optional: Request timeout (ms)
  retries: 3,                        // Optional: Number of retry attempts
  logLevel: 'info',                  // Optional: 'debug' | 'info' | 'warn' | 'error'
  cache: {
    ttl: 60000,                      // Optional: Cache TTL (ms)
    maxSize: 100,                    // Optional: Max cache entries
  },
});
```

## 📋 Requirements

- **Node.js**: 18.0 or higher
- **TypeScript**: 5.2 or higher (for TypeScript projects)
- **Package Manager**: npm, yarn, or pnpm

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic Payment](./examples/basic-payment.ts) - Simple payment creation
- [Error Handling](./examples/error-handling.ts) - Comprehensive error handling
- [Batch Payments](./examples/batch-payments.ts) - Process multiple payments
- [Webhook Handler](./examples/webhook-handler.ts) - Webhook integration
- [Real-time Events](./examples/real-time-events.ts) - WebSocket event listening

## 🔒 Security

- Never commit your API keys to version control
- Use environment variables for sensitive data
- Always verify webhook signatures
- Keep the SDK updated to the latest version

Report security vulnerabilities to: security@b402layer.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 💬 Support & Community

- 📖 [Documentation](https://docs.b402layer.com)
- 🐛 [GitHub Issues](https://github.com/b402Layer/payment-sdk/issues)
- 🐦 [Twitter](https://x.com/b402Layer)
- 💬 [Discord Community](https://discord.gg/b402layer)
- 📧 [Email Support](mailto:support@b402layer.com)

## 🙏 Acknowledgments

Built with ❤️ on BNB Chain by the b402Layer team.

---

<div align="center">
  <strong>Ready to integrate blockchain payments?</strong>
  <br />
  <a href="https://docs.b402layer.com/getting-started">Get Started</a> •
  <a href="https://docs.b402layer.com/sdk/api-reference">API Docs</a> •
  <a href="https://b402layer.com">Website</a>
</div>
