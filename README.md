# b402Layer Payment SDK

Official TypeScript/JavaScript SDK for integrating b402Layer payment infrastructure into your applications and AI agents.

## Features

- 🚀 Simple, intuitive API
- 💪 Full TypeScript support with comprehensive type definitions
- 🔄 Real-time payment status updates via WebSocket
- 🛡️ Built-in error handling and retry logic
- 📦 Works in Node.js and browsers
- 🧪 Thoroughly tested with comprehensive test coverage
- 📚 Comprehensive documentation

## Installation

```bash
npm install @b402layer/payment-sdk
# or
yarn add @b402layer/payment-sdk
# or
pnpm add @b402layer/payment-sdk
```

## Quick Start

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

## Documentation

- [API Reference](https://docs.b402layer.io/sdk/api-reference)
- [Examples](./examples)
- [Migration Guide](./docs/migration.md)

## Supported Networks

- BNB Chain Mainnet
- BNB Chain Testnet

## Supported Tokens

- BNB (Native token)
- USDT (BEP-20)
- USDC (BEP-20)
- BUSD (BEP-20)

## Requirements

- Node.js 18.0 or higher
- TypeScript 4.5 or higher (for TypeScript projects)

## License

MIT

## Support

- [Documentation](https://docs.b402layer.io)
- [GitHub Issues](https://github.com/b402Layer/payment-sdk/issues)
- [Twitter](https://x.com/b402Layer)

---

<div align="center">
  <sub>Built with ❤️ on BNB Chain</sub>
</div>
