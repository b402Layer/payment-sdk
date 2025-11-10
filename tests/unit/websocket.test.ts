import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '../../src/services/websocket';
import { Logger } from '../../src/utils/logger';
import { ClientConfig } from '../../src/types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string, public options?: any) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  });

  // Helper to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to simulate an error
  simulateError(error: any) {
    if (this.onerror) {
      this.onerror(error);
    }
  }

  // Helper to simulate close
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

// Mock isomorphic-ws
vi.mock('isomorphic-ws', () => ({
  default: MockWebSocket,
}));

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let logger: Logger;
  let config: ClientConfig;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    logger = new Logger('error');
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    config = {
      apiKey: 'test-api-key',
      network: 'bnb-testnet',
      apiUrl: 'https://api-testnet.b402layer.io',
      timeout: 30000,
      retries: 3,
      logLevel: 'error',
      cacheOptions: {
        ttl: 5000,
        maxSize: 100,
      },
    };

    wsService = new WebSocketService(config, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscribe/unsubscribe functionality', () => {
    it('should subscribe to a channel', async () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribe('/payments/123', handler);

      // Wait for connection
      await vi.runAllTimersAsync();

      expect(logger.debug).toHaveBeenCalledWith('Subscribing to channel', {
        channel: '/payments/123',
      });
      expect(typeof unsubscribe).toBe('function');
    });

    it('should send subscribe message when connected', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      // Get the mock WebSocket instance
      const wsMock = (wsService as any).ws as MockWebSocket;
      expect(wsMock.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: '/payments/123',
        })
      );
    });

    it('should unsubscribe from a channel', async () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      unsubscribe();

      expect(logger.debug).toHaveBeenCalledWith('Unsubscribing from channel', {
        channel: '/payments/123',
      });
    });

    it('should send unsubscribe message when last handler removed', async () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.send.mockClear();

      unsubscribe();

      expect(wsMock.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscribe',
          channel: '/payments/123',
        })
      );
    });

    it('should support multiple subscriptions to same channel', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribe('/payments/123', handler1);
      wsService.subscribe('/payments/123', handler2);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.simulateMessage({
        channel: '/payments/123',
        data: { status: 'confirmed' },
      });

      expect(handler1).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(handler2).toHaveBeenCalledWith({ status: 'confirmed' });
    });

    it('should not send unsubscribe when other handlers remain', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = wsService.subscribe('/payments/123', handler1);
      wsService.subscribe('/payments/123', handler2);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.send.mockClear();

      unsubscribe1();

      expect(wsMock.send).not.toHaveBeenCalledWith(
        expect.stringContaining('unsubscribe')
      );
    });
  });

  describe('automatic reconnection', () => {
    it('should reconnect when connection closes', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.simulateClose();

      expect(logger.warn).toHaveBeenCalledWith('WebSocket closed');
      expect(logger.info).toHaveBeenCalledWith(
        'Reconnecting WebSocket',
        expect.objectContaining({
          attempt: 1,
        })
      );

      // Advance timer for reconnection
      await vi.runAllTimersAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Connecting to WebSocket',
        expect.any(Object)
      );
    });

    it('should use exponential backoff for reconnection', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;

      // First reconnect: 1s delay
      wsMock.simulateClose();
      expect(logger.info).toHaveBeenCalledWith(
        'Reconnecting WebSocket',
        expect.objectContaining({
          attempt: 1,
          delay: 1000,
        })
      );

      await vi.runAllTimersAsync();

      // Second reconnect: 2s delay
      const wsMock2 = (wsService as any).ws as MockWebSocket;
      wsMock2.simulateClose();
      expect(logger.info).toHaveBeenCalledWith(
        'Reconnecting WebSocket',
        expect.objectContaining({
          attempt: 2,
          delay: 2000,
        })
      );
    });

    it('should stop reconnecting after max attempts', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      // Simulate 5 connection failures
      for (let i = 0; i < 5; i++) {
        const wsMock = (wsService as any).ws as MockWebSocket;
        wsMock.simulateClose();
        await vi.runAllTimersAsync();
      }

      expect(logger.error).toHaveBeenCalledWith('Max reconnect attempts reached');
    });

    it('should reset reconnect attempts on successful connection', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.simulateClose();

      await vi.runAllTimersAsync();

      // Connection successful, reconnectAttempts should be reset
      expect((wsService as any).reconnectAttempts).toBe(0);
    });

    it('should resubscribe to all channels after reconnection', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribe('/payments/123', handler1);
      wsService.subscribe('/payments/456', handler2);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.send.mockClear();

      wsMock.simulateClose();
      await vi.runAllTimersAsync();

      const wsMock2 = (wsService as any).ws as MockWebSocket;

      // Should resubscribe to both channels
      expect(wsMock2.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: '/payments/123',
        })
      );
      expect(wsMock2.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: '/payments/456',
        })
      );
    });
  });

  describe('message routing', () => {
    it('should route messages to correct handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribe('/payments/123', handler1);
      wsService.subscribe('/payments/456', handler2);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;

      wsMock.simulateMessage({
        channel: '/payments/123',
        data: { status: 'confirmed' },
      });

      expect(handler1).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle messages with complex data', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      const complexData = {
        paymentId: 'pay_123',
        status: 'confirmed',
        txHash: '0xabc123',
        metadata: {
          amount: '10.5',
          currency: 'USDT',
        },
      };

      wsMock.simulateMessage({
        channel: '/payments/123',
        data: complexData,
      });

      expect(handler).toHaveBeenCalledWith(complexData);
    });

    it('should handle malformed messages gracefully', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;

      // Simulate malformed JSON
      if (wsMock.onmessage) {
        wsMock.onmessage({ data: 'invalid json' });
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse WebSocket message',
        expect.any(Object)
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('should catch errors in message handlers', async () => {
      const handler = vi.fn(() => {
        throw new Error('Handler error');
      });

      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;

      wsMock.simulateMessage({
        channel: '/payments/123',
        data: { status: 'confirmed' },
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error in message handler',
        expect.any(Object)
      );
    });
  });

  describe('connection lifecycle', () => {
    it('should establish connection on first subscription', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Connecting to WebSocket',
        expect.objectContaining({
          url: 'wss://api-testnet.b402layer.io/ws',
        })
      );
    });

    it('should reuse existing connection for multiple subscriptions', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribe('/payments/123', handler1);
      await vi.runAllTimersAsync();

      const connectCalls = (logger.info as any).mock.calls.filter(
        (call: any) => call[0] === 'Connecting to WebSocket'
      ).length;

      wsService.subscribe('/payments/456', handler2);
      await vi.runAllTimersAsync();

      const newConnectCalls = (logger.info as any).mock.calls.filter(
        (call: any) => call[0] === 'Connecting to WebSocket'
      ).length;

      expect(newConnectCalls).toBe(connectCalls);
    });

    it('should log when connection opens', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      expect(logger.info).toHaveBeenCalledWith('WebSocket connected');
    });

    it('should log WebSocket errors', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      const error = new Error('Connection error');
      wsMock.simulateError(error);

      expect(logger.error).toHaveBeenCalledWith('WebSocket error', {
        error,
      });
    });

    it('should convert http to ws in URL', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Connecting to WebSocket',
        expect.objectContaining({
          url: 'wss://api-testnet.b402layer.io/ws',
        })
      );
    });

    it('should include API key in connection headers', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      expect(wsMock.options.headers['X-API-Key']).toBe('test-api-key');
    });
  });

  describe('closeAll', () => {
    it('should close WebSocket connection', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;

      await wsService.closeAll();

      expect(wsMock.close).toHaveBeenCalled();
      expect((wsService as any).ws).toBeNull();
    });

    it('should clear all subscriptions', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribe('/payments/123', handler1);
      wsService.subscribe('/payments/456', handler2);

      await vi.runAllTimersAsync();

      await wsService.closeAll();

      expect((wsService as any).subscriptions.size).toBe(0);
    });

    it('should cancel pending reconnection timer', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.simulateClose();

      // Don't advance timers, so reconnection is pending
      await wsService.closeAll();

      expect((wsService as any).reconnectTimer).toBeNull();
    });

    it('should handle closeAll when no connection exists', async () => {
      await expect(wsService.closeAll()).resolves.not.toThrow();
    });

    it('should log when closing connections', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      await wsService.closeAll();

      expect(logger.info).toHaveBeenCalledWith(
        'Closing all WebSocket connections'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle subscription before connection is open', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      // Don't wait for connection
      const wsMock = (wsService as any).ws as MockWebSocket;
      expect(wsMock.readyState).toBe(MockWebSocket.CONNECTING);

      // Message should be queued and sent when connection opens
      await vi.runAllTimersAsync();

      expect(wsMock.send).toHaveBeenCalled();
    });

    it('should handle rapid subscribe/unsubscribe', async () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      unsubscribe();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      expect((wsService as any).subscriptions.has('/payments/123')).toBe(true);
    });

    it('should handle empty channel name', async () => {
      const handler = vi.fn();
      wsService.subscribe('', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      expect(wsMock.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: '',
        })
      );
    });

    it('should not send messages when connection is closed', async () => {
      const handler = vi.fn();
      wsService.subscribe('/payments/123', handler);

      await vi.runAllTimersAsync();

      const wsMock = (wsService as any).ws as MockWebSocket;
      wsMock.readyState = MockWebSocket.CLOSED;
      wsMock.send.mockClear();

      // Try to subscribe to another channel
      wsService.subscribe('/payments/456', vi.fn());

      // Should not send because connection is closed
      expect(wsMock.send).not.toHaveBeenCalled();
    });
  });
});
