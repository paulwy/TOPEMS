/* eslint-disable no-console -- 测试对象即 logger 本身，console 输出为被测行为 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLogger,
  logger as defaultLogger,
  apiLogger,
  authLogger,
  errorLogger,
  type Logger,
  type LogLevel,
} from '@/utils/logger';

describe('createLogger', () => {
  let consoleDebug: typeof console.debug;
  let consoleInfo: typeof console.info;
  let consoleWarn: typeof console.warn;
  let consoleError: typeof console.error;
  let consoleGroup: typeof console.group;
  let consoleGroupEnd: typeof console.groupEnd;
  let consoleTable: typeof console.table;
  let consoleTime: typeof console.time;
  let consoleTimeEnd: typeof console.timeEnd;

  beforeEach(() => {
    consoleDebug = console.debug;
    consoleInfo = console.info;
    consoleWarn = console.warn;
    consoleError = console.error;
    consoleGroup = console.group;
    consoleGroupEnd = console.groupEnd;
    consoleTable = console.table;
    consoleTime = console.time;
    consoleTimeEnd = console.timeEnd;

    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
    console.table = vi.fn();
    console.time = vi.fn();
    console.timeEnd = vi.fn();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    console.debug = consoleDebug;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.group = consoleGroup;
    console.groupEnd = consoleGroupEnd;
    console.table = consoleTable;
    console.time = consoleTime;
    console.timeEnd = consoleTimeEnd;

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('level filtering', () => {
    it('filters debug logs when level is info', () => {
      const log = createLogger('Test', { level: 'info', enableTimestamp: false });
      log.debug('hidden');
      log.info('visible');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect((console.info as any).mock.calls[0][0]).toContain('[INFO]');
      expect((console.info as any).mock.calls[0][0]).toContain('[Test]');
    });

    it('filters info+debug when level is warn', () => {
      const log = createLogger('Test', { level: 'warn', enableTimestamp: false });
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('shows all levels when level is debug', () => {
      const log = createLogger('T', { level: 'debug', enableTimestamp: false });
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');

      expect(console.debug).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('setLevel changes log level dynamically', () => {
      const log = createLogger('T', { level: 'error', enableTimestamp: false });
      log.warn('before change');
      expect(console.warn).not.toHaveBeenCalled();

      log.setLevel('warn');
      log.warn('after change');
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatting', () => {
    it('includes timestamp when enabled', () => {
      const log = createLogger('Test', { level: 'info', enableTimestamp: true });
      log.info('msg');
      const called = (console.info as any).mock.calls[0][0] as string;
      expect(called).toContain('[2024-01-15T10:00:00.000Z]');
      expect(called).toContain('[INFO]');
      expect(called).toContain('[Test]');
    });

    it('skips timestamp when disabled', () => {
      const log = createLogger('Test', { level: 'info', enableTimestamp: false });
      log.info('msg');
      const called = (console.info as any).mock.calls[0][0] as string;
      expect(called).not.toContain('[2024');
      expect(called).toContain('[INFO]');
      expect(called).toContain('[Test]');
    });

    it('includes prefix when provided', () => {
      const log = createLogger('Test', {
        level: 'info',
        enableTimestamp: false,
        prefix: 'API',
      });
      log.info('msg');
      const called = (console.info as any).mock.calls[0][0] as string;
      expect(called).toContain('[API]');
      expect(called).toContain('[Test]');
    });

    it('passes additional args to console', () => {
      const log = createLogger('T', { level: 'info', enableTimestamp: false });
      const obj = { a: 1 };
      const err = new Error('boom');
      log.info('msg', obj, err);

      expect(console.info).toHaveBeenCalledWith(expect.any(String), 'msg', obj, err);
    });
  });

  describe('enableConsole flag', () => {
    it('disables all console output when enableConsole=false', () => {
      const log = createLogger('T', {
        level: 'debug',
        enableConsole: false,
        enableTimestamp: false,
      });

      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');
      log.group('g', () => {});
      log.table([]);
      log.time('t');
      log.timeEnd('t');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.group).not.toHaveBeenCalled();
      expect(console.table).not.toHaveBeenCalled();
      expect(console.time).not.toHaveBeenCalled();
    });
  });

  describe('group / table / time', () => {
    it('wraps fn execution with console.group/groupEnd', () => {
      const log = createLogger('T', { level: 'info', enableTimestamp: false });
      const fn = vi.fn();
      log.group('Label', fn);

      expect(console.group).toHaveBeenCalledWith('Label');
      expect(fn).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('table calls console.table when level>=debug', () => {
      const log = createLogger('T', { level: 'debug', enableTimestamp: false });
      const data = [{ a: 1 }, { a: 2 }];
      log.table(data);
      expect(console.table).toHaveBeenCalledWith(data);
    });

    it('table suppressed when level higher than debug', () => {
      const log = createLogger('T', { level: 'info', enableTimestamp: false });
      log.table([1, 2, 3]);
      expect(console.table).not.toHaveBeenCalled();
    });

    it('time/timeEnd call console.time when level>=debug', () => {
      const log = createLogger('T', { level: 'debug', enableTimestamp: false });
      log.time('load');
      log.timeEnd('load');
      expect(console.time).toHaveBeenCalledWith('load');
      expect(console.timeEnd).toHaveBeenCalledWith('load');
    });

    it('time/timeEnd suppressed when level>=info', () => {
      const log = createLogger('T', { level: 'info', enableTimestamp: false });
      log.time('load');
      log.timeEnd('load');
      expect(console.time).not.toHaveBeenCalled();
      expect(console.timeEnd).not.toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('inherits parent options and merges child options', () => {
      const parent = createLogger('Parent', {
        level: 'debug',
        enableTimestamp: false,
        prefix: 'P',
      });
      const child = parent.child({ prefix: 'C' });

      child.info('msg');
      const called = (console.info as any).mock.calls[0][0] as string;
      expect(called).toContain('[C]');
      expect(called).toContain('[Parent]');
    });

    it('child option overrides parent level', () => {
      const parent = createLogger('P', {
        level: 'debug',
        enableTimestamp: false,
      });
      const child = parent.child({ level: 'error' });

      parent.info('parent-info');
      expect(console.info).toHaveBeenCalledTimes(1);

      (console.info as any).mockClear();
      child.info('child-info');
      expect(console.info).not.toHaveBeenCalled();

      child.error('child-error');
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('merges context objects', () => {
      const parent = createLogger('P', {
        level: 'debug',
        enableTimestamp: false,
        context: { app: 'TOPEMS' },
      });
      const child = parent.child({ context: { module: 'Auth' } });
      // Options/context affect child creation (just ensure no errors)
      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });
  });

  describe('preset loggers', () => {
    it('exposes default logger with App name', () => {
      expect(defaultLogger).toBeDefined();
      expect(typeof (defaultLogger as Logger).info).toBe('function');
      expect(typeof (defaultLogger as Logger).error).toBe('function');
    });

    it('exposes apiLogger / authLogger / errorLogger', () => {
      expect(apiLogger).toBeDefined();
      expect(authLogger).toBeDefined();
      expect(errorLogger).toBeDefined();
      expect(typeof apiLogger.info).toBe('function');
      expect(typeof authLogger.info).toBe('function');
      expect(typeof errorLogger.error).toBe('function');
    });
  });

  describe('type correctness', () => {
    it('LogLevel type only accepts valid levels', () => {
      const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      validLevels.forEach((level) => {
        const log = createLogger('T', { level, enableTimestamp: false });
        expect(log).toBeDefined();
        log.setLevel(level); // should accept each valid level
      });
    });
  });
});
