import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger, apiLogger, authLogger, errorLogger } from '@/utils/logger';

describe('logger utils', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    vi.spyOn(console, 'time').mockImplementation(() => {});
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with default options', () => {
      const log = createLogger('Test');
      expect(log.debug).toBeDefined();
      expect(log.info).toBeDefined();
      expect(log.warn).toBeDefined();
      expect(log.error).toBeDefined();
      expect(log.group).toBeDefined();
      expect(log.table).toBeDefined();
      expect(log.time).toBeDefined();
      expect(log.timeEnd).toBeDefined();
      expect(log.child).toBeDefined();
      expect(log.setLevel).toBeDefined();
    });

    it('should log debug messages when level is debug', () => {
      const log = createLogger('Test', { level: 'debug' });
      log.debug('test message');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should not log debug messages when level is info', () => {
      const log = createLogger('Test', { level: 'info' });
      log.debug('test message');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      const log = createLogger('Test', { level: 'info' });
      log.info('test message');
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn messages when level is warn', () => {
      const log = createLogger('Test', { level: 'warn' });
      log.warn('test message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages when level is error', () => {
      const log = createLogger('Test', { level: 'error' });
      log.error('test message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should not log info messages when level is error', () => {
      const log = createLogger('Test', { level: 'error' });
      log.info('test message');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should support custom prefix', () => {
      const log = createLogger('Test', { prefix: 'CUSTOM' });
      log.info('test');
      expect(console.info).toHaveBeenCalled();
    });

    it('should support disabled console output', () => {
      const log = createLogger('Test', { enableConsole: false });
      log.info('test message');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should support disabled timestamp', () => {
      const log = createLogger('Test', { enableTimestamp: false });
      log.info('test');
      expect(console.info).toHaveBeenCalled();
    });

    it('should create child logger with merged options', () => {
      const parent = createLogger('Parent', { level: 'info' });
      const child = parent.child({ prefix: 'Child' });
      expect(child.debug).toBeDefined();
      expect(child.info).toBeDefined();
    });

    it('should change log level dynamically', () => {
      const log = createLogger('Test', { level: 'error' });
      log.info('should not log');
      expect(console.info).not.toHaveBeenCalled();

      log.setLevel('info');
      log.info('should log now');
      expect(console.info).toHaveBeenCalled();
    });

    it('should support group logging', () => {
      const log = createLogger('Test');
      log.group('test group', () => {});
      expect(console.group).toHaveBeenCalledWith('test group');
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should support table logging', () => {
      const log = createLogger('Test', { level: 'debug' });
      log.table({ key: 'value' });
      expect(console.table).toHaveBeenCalledWith({ key: 'value' });
    });

    it('should support time logging', () => {
      const log = createLogger('Test', { level: 'debug' });
      log.time('timer');
      log.timeEnd('timer');
      expect(console.time).toHaveBeenCalledWith('timer');
      expect(console.timeEnd).toHaveBeenCalledWith('timer');
    });
  });

  describe('preset loggers', () => {
    it('should have default logger', () => {
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should have apiLogger', () => {
      expect(apiLogger.debug).toBeDefined();
      expect(apiLogger.info).toBeDefined();
    });

    it('should have authLogger', () => {
      expect(authLogger.debug).toBeDefined();
      expect(authLogger.info).toBeDefined();
    });

    it('should have errorLogger', () => {
      expect(errorLogger.debug).toBeDefined();
      expect(errorLogger.info).toBeDefined();
    });
  });
});
