import WebSocket from 'isomorphic-ws';
import { ClientConfig } from '../types';
import { Logger } from '../utils/logger';

type MessageHandler = (data: any) => void;

/**
 * WebSocket service for real-time updates
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly config: ClientConfig,
    private readonly logger: Logger
  ) {}

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, handler: MessageHandler): () => void {
    this.logger.debug('Subscribing to channel', { channel });

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(handler);

    // Ensure connection is established
    this.ensureConnection();

    // Send subscription message
    this.send({
      type: 'subscribe',
      channel,
    });

    // Return unsubscribe function
    return () => this.unsubscribe(channel, handler);
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channel: string, handler: MessageHandler): void {
    this.logger.debug('Unsubscribing from channel', { channel });

    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.subscriptions.delete(channel);
        this.send({
          type: 'unsubscribe',
          channel,
        });
      }
    }
  }

  /**
   * Ensure WebSocket connection is established
   */
  private ensureConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    const wsUrl = this.config.apiUrl.replace('http', 'ws') + '/ws';

    this.logger.info('Connecting to WebSocket', { url: wsUrl });

    this.ws = new WebSocket(wsUrl, {
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    } as any);

    this.ws.onopen = () => this.handleOpen();
    this.ws.onmessage = (event: any) => this.handleMessage(event);
    this.ws.onerror = (error: any) => this.handleError(error);
    this.ws.onclose = () => this.handleClose();
  }

  private handleOpen(): void {
    this.logger.info('WebSocket connected');
    this.reconnectAttempts = 0;

    // Resubscribe to all channels
    for (const channel of this.subscriptions.keys()) {
      this.send({
        type: 'subscribe',
        channel,
      });
    }
  }

  private handleMessage(event: WebSocket.MessageEvent): void {
    try {
      const message = JSON.parse(event.data.toString());
      this.logger.debug('WebSocket message received', { message });

      const { channel, data } = message;
      const handlers = this.subscriptions.get(channel);

      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error('Error in message handler', { error });
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', { error });
    }
  }

  private handleError(error: WebSocket.ErrorEvent): void {
    this.logger.error('WebSocket error', { error });
  }

  private handleClose(): void {
    this.logger.warn('WebSocket closed');

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts),
        30000
      );
      this.reconnectAttempts++;

      this.logger.info('Reconnecting WebSocket', {
        attempt: this.reconnectAttempts,
        delay,
      });

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.logger.error('Max reconnect attempts reached');
    }
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Close all WebSocket connections
   */
  async closeAll(): Promise<void> {
    this.logger.info('Closing all WebSocket connections');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
  }
}
