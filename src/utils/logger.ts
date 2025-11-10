import { LogLevel } from '../types';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Logger utility for SDK logging
 */
export class Logger {
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(private readonly logLevel: LogLevel = 'info') {}

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  private sanitizeContext(
    context?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveKeys = [
      'apiKey',
      'privateKey',
      'secret',
      'password',
      'token',
    ];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
