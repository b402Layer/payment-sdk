import { B402Client } from '../src/index';
import {
  ValidationError,
  InvalidAddressError,
  PaymentNotFoundError,
  InsufficientFundsError,
  NetworkError,
  RateLimitError,
  AuthenticationError,
  B402Error,
} from '../src/errors';

async function main() {
  const client = new B402Client({
    apiKey: process.env.B402_API_KEY!,
    network: 'bnb-testnet',
    logLevel: 'info',
  });

  // Example 1: Handling validation errors
  console.log('Example 1: Validation Error Handling\n');
  try {
    await client.payment.create({
      amount: '-10', // Invalid negative amount
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Validation Error:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Fix: Ensure amount is a positive number\n');
    }
  }

  // Example 2: Handling invalid address errors
  console.log('Example 2: Invalid Address Error Handling\n');
  try {
    await client.payment.create({
      amount: '10.5',
      currency: 'USDT',
      recipient: 'invalid-address', // Invalid address format
    });
  } catch (error) {
    if (error instanceof InvalidAddressError) {
      console.error('❌ Invalid Address Error:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Fix: Use a valid BNB Chain address (0x...)\n');
    }
  }

  // Example 3: Handling payment not found errors
  console.log('Example 3: Payment Not Found Error Handling\n');
  try {
    await client.payment.getStatus('pay_nonexistent123');
  } catch (error) {
    if (error instanceof PaymentNotFoundError) {
      console.error('❌ Payment Not Found:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Fix: Verify the payment ID is correct\n');
    }
  }

  // Example 4: Handling unsupported currency
  console.log('Example 4: Unsupported Currency Error Handling\n');
  try {
    await client.payment.create({
      amount: '10.5',
      currency: 'ETH' as any, // Unsupported currency
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Unsupported Currency:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Supported currencies: BNB, USDT, USDC, BUSD\n');
    }
  }

  // Example 5: Comprehensive error handling
  console.log('Example 5: Comprehensive Error Handling\n');
  try {
    const payment = await client.payment.create({
      amount: '10.5',
      currency: 'USDT',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });
    console.log('✅ Payment created successfully:', payment.id);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Validation Error:', error.message);
      // Show user-friendly error message
      // Highlight invalid form fields
    } else if (error instanceof InvalidAddressError) {
      console.error('❌ Invalid Address:', error.message);
      // Prompt user to enter a valid address
    } else if (error instanceof InsufficientFundsError) {
      console.error('❌ Insufficient Funds:', error.message);
      // Prompt user to add funds or reduce amount
    } else if (error instanceof AuthenticationError) {
      console.error('❌ Authentication Error:', error.message);
      // Check API key configuration
      // Redirect to login or settings
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate Limit Exceeded:', error.message);
      console.error('   Retry after:', error.retryAfter, 'seconds');
      // Wait and retry, or show user a message
    } else if (error instanceof NetworkError) {
      console.error('❌ Network Error:', error.message);
      // Show retry button
      // Check internet connection
    } else if (error instanceof B402Error) {
      console.error('❌ B402 Error:', error.message);
      console.error('   Error Code:', error.code);
      // Log to error tracking service
    } else {
      console.error('❌ Unexpected Error:', error);
      // Log to error tracking service
      // Show generic error message to user
    }
  }

  // Example 6: Error handling with retry logic
  console.log('\nExample 6: Retry Logic for Transient Errors\n');
  async function createPaymentWithRetry(maxRetries = 3) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);

        const payment = await client.payment.create({
          amount: '10.5',
          currency: 'USDT',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        });

        console.log('✅ Payment created successfully:', payment.id);
        return payment;
      } catch (error) {
        lastError = error as Error;

        // Only retry on network errors or rate limits
        if (
          error instanceof NetworkError ||
          error instanceof RateLimitError
        ) {
          console.log(`⚠️  Transient error, will retry...`);

          if (error instanceof RateLimitError) {
            // Wait for the specified retry-after period
            await new Promise((resolve) =>
              setTimeout(resolve, error.retryAfter * 1000)
            );
          } else {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } else {
          // Don't retry on client errors
          throw error;
        }
      }
    }

    throw lastError;
  }

  try {
    await createPaymentWithRetry();
  } catch (error) {
    console.error('❌ Failed after all retries:', (error as Error).message);
  }

  // Example 7: Graceful error handling in production
  console.log('\nExample 7: Production Error Handling Pattern\n');
  async function handlePaymentCreation(
    amount: string,
    currency: string,
    recipient: string
  ) {
    try {
      // Validate inputs before making API call
      if (!client.utils.validateAddress(recipient)) {
        throw new InvalidAddressError(`Invalid recipient address: ${recipient}`);
      }

      const payment = await client.payment.create({
        amount,
        currency: currency as any,
        recipient,
      });

      console.log('✅ Payment created:', payment.id);
      return { success: true, payment };
    } catch (error) {
      // Log error for debugging
      console.error('Payment creation failed:', error);

      // Return user-friendly error response
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: 'Invalid payment parameters',
          message: error.message,
        };
      } else if (error instanceof InvalidAddressError) {
        return {
          success: false,
          error: 'Invalid recipient address',
          message: 'Please provide a valid BNB Chain address',
        };
      } else if (error instanceof NetworkError) {
        return {
          success: false,
          error: 'Network error',
          message: 'Please check your connection and try again',
        };
      } else {
        return {
          success: false,
          error: 'Unknown error',
          message: 'An unexpected error occurred. Please try again later.',
        };
      }
    }
  }

  const result = await handlePaymentCreation(
    '10.5',
    'USDT',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  );

  if (result.success) {
    console.log('Payment successful:', result.payment?.id);
  } else {
    console.log('Payment failed:', result.error);
    console.log('Message:', result.message);
  }

  // Cleanup
  await client.destroy();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
