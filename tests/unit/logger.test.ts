import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log level filtering', () => {
    it('should log debug messages when log level is debug', () => {
      const logger = new Logger('debug');
      logger.debug('test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('debug');
      expect(logOutput.message).toBe('test message');
    });

    it('should not log debug messages when log level is info', () => {
      const logger = new Logger('info');
      logger.debug('test message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when log level is info', () => {
      const logger = new Logger('info');
      logger.info('test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('info');
      expect(logOutput.message).toBe('test message');
    });

    it('should not log info messages when log level is warn', () => {
      const logger = new Logger('warn');
      logger.info('test message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages when log level is warn', () => {
      const logger = new Logger('warn');
      logger.warn('test message');

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('warn');
      expect(logOutput.message).toBe('test message');
    });

    it('should not log warn messages when log level is error', () => {
      const logger = new Logger('error');
      logger.warn('test message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log error messages when log level is error', () => {
      const logger = new Logger('error');
      logger.error('test message');

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('error');
      expect(logOutput.message).toBe('test message');
    });

    it('should log all levels when log level is debug', () => {
      const logger = new Logger('debug');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug and info
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });
  });

  describe('context handling', () => {
    it('should include context in log output', () => {
      const logger = new Logger('info');
      const context = { userId: '123', action: 'payment' };
      
      logger.info('test message', context);

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context).toEqual(context);
    });

    it('should log without context when not provided', () => {
      const logger = new Logger('info');
      
      logger.info('test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context).toBeUndefined();
    });
  });

  describe('context sanitization', () => {
    it('should redact apiKey from context', () => {
      const logger = new Logger('info');
      const context = { apiKey: 'secret-key', userId: '123' };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.apiKey).toBe('[REDACTED]');
      expect(logOutput.context.userId).toBe('123');
    });

    it('should redact privateKey from context', () => {
      const logger = new Logger('info');
      const context = { privateKey: 'secret-key', data: 'value' };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.privateKey).toBe('[REDACTED]');
      expect(logOutput.context.data).toBe('value');
    });

    it('should redact secret from context', () => {
      const logger = new Logger('info');
      const context = { secret: 'secret-value', other: 'data' };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.secret).toBe('[REDACTED]');
      expect(logOutput.context.other).toBe('data');
    });

    it('should redact password from context', () => {
      const logger = new Logger('info');
      const context = { password: 'secret-password', username: 'user' };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.password).toBe('[REDACTED]');
      expect(logOutput.context.username).toBe('user');
    });

    it('should redact token from context', () => {
      const logger = new Logger('info');
      const context = { token: 'secret-token', id: '123' };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.token).toBe('[REDACTED]');
      expect(logOutput.context.id).toBe('123');
    });

    it('should redact multiple sensitive fields', () => {
      const logger = new Logger('info');
      const context = {
        apiKey: 'key',
        password: 'pass',
        token: 'tok',
        userId: '123',
      };
      
      logger.info('test message', context);

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.apiKey).toBe('[REDACTED]');
      expect(logOutput.context.password).toBe('[REDACTED]');
      expect(logOutput.context.token).toBe('[REDACTED]');
      expect(logOutput.context.userId).toBe('123');
    });
  });

  describe('log output format', () => {
    it('should include timestamp in log output', () => {
      const logger = new Logger('info');
      
      logger.info('test message');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.timestamp).toBeDefined();
      expect(new Date(logOutput.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include all required fields in log output', () => {
      const logger = new Logger('info');
      
      logger.info('test message', { key: 'value' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput).toHaveProperty('level');
      expect(logOutput).toHaveProperty('message');
      expect(logOutput).toHaveProperty('timestamp');
      expect(logOutput).toHaveProperty('context');
    });
  });

  describe('default log level', () => {
    it('should use info as default log level', () => {
      const logger = new Logger();
      
      logger.debug('debug message');
      logger.info('info message');

      expect(consoleLogSpy).toHaveBeenCalledOnce(); // only info
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('info');
    });
  });
});
