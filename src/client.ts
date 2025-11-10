import { PaymentManager } from './managers/payment';
import { WebhookManager } from './managers/webhook';
import { UtilsManager } from './managers/utils';
import { HttpService } from './services/http';
import { WebSocketService } from './services/websocket';
import { CacheService } from './services/cache';
import { Logger } from './utils/logger';
import { ClientConfig, ClientOptions } from './types';
import { ValidationError } from './errors';

/**
 * Main client class for b402Layer Payment SDK
 */
export class B402Client {
  private readonly config: ClientConfig;
  private readonly httpService: HttpService;
  private readonly wsService: WebSocketService;
  private readonly cacheService: CacheService;
  private readonly logger: Logger;

  public readonly payment: PaymentManager;
  public readonly webhook: WebhookManager;
  public readonly utils: UtilsManager;

  constructor(options: ClientOptions) {
    // Validate configuration
    this.validateConfig(options);

    // Initialize configuration with defaults
    this.config = this.mergeWithDefaults(options);

    // Initialize logger
    this.logger = new Logger(this.config.logLevel);

    // Initialize core services
    this.httpService = new HttpService(this.config, this.logger);
    this.wsService = new WebSocketService(this.config, this.logger);
    this.cacheService = new CacheService(this.config.cacheOptions);

    // Initialize managers
    this.payment = new PaymentManager(
      this.httpService,
      this.wsService,
      this.cacheService,
      this.logger
    );
    this.webhook = new WebhookManager(this.httpService, this.logger);
    this.utils = new UtilsManager(this.httpService, this.logger);

    this.logger.info('B402Client initialized', {
      network: this.config.network,
      apiUrl: this.config.apiUrl,
    });
  }

  private validateConfig(options: ClientOptions): void {
    if (!options.apiKey) {
      throw new ValidationError('API key is required');
    }
    if (!options.network) {
      throw new ValidationError('Network is required');
    }
    if (!['bnb-mainnet', 'bnb-testnet'].includes(options.network)) {
      throw new ValidationError(
        `Invalid network: ${options.network}. Must be 'bnb-mainnet' or 'bnb-testnet'`
      );
    }
  }

  private mergeWithDefaults(options: ClientOptions): ClientConfig {
    const apiUrls = {
      'bnb-mainnet': 'https://api.b402layer.io',
      'bnb-testnet': 'https://api-testnet.b402layer.io',
    };

    return {
      apiKey: options.apiKey,
      network: options.network,
      apiUrl: options.apiUrl || apiUrls[options.network],
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      logLevel: options.logLevel || 'info',
      cacheOptions: {
        ttl: options.cacheTTL || 5000,
        maxSize: options.cacheMaxSize || 100,
      },
    };
  }

  /**
   * Close all connections and cleanup resources
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying B402Client');
    await this.wsService.closeAll();
    this.cacheService.clear();
  }
}
