import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, eventBus, ModuleEvents } from '../EventBus';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on + emit', () => {
    it('should invoke registered handler on emit', () => {
      const handler = vi.fn();
      bus.on('test:event', handler);

      bus.emit('test:event', { value: 42 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should invoke multiple handlers on same event', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();

      bus.on('multi', h1);
      bus.on('multi', h2);
      bus.emit('multi', 'data');

      expect(h1).toHaveBeenCalledWith('data');
      expect(h2).toHaveBeenCalledWith('data');
    });

    it('should not invoke handlers for other events', () => {
      const handler = vi.fn();
      bus.on('only:this', handler);

      bus.emit('another:event', 1);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle emit without data', () => {
      const handler = vi.fn();
      bus.on('empty', handler);

      bus.emit('empty');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should emit multiple times without issues', () => {
      const handler = vi.fn();
      bus.on('count', handler);

      bus.emit('count', 1);
      bus.emit('count', 2);
      bus.emit('count', 3);

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, 1);
      expect(handler).toHaveBeenNthCalledWith(2, 2);
      expect(handler).toHaveBeenNthCalledWith(3, 3);
    });
  });

  describe('off', () => {
    it('should remove a registered handler', () => {
      const handler = vi.fn();
      bus.on('e', handler);

      bus.off('e', handler);
      bus.emit('e', 1);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove only the specified handler', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('e', h1);
      bus.on('e', h2);

      bus.off('e', h1);
      bus.emit('e', 'x');

      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledWith('x');
    });

    it('should be a no-op for unregistered event', () => {
      expect(() => bus.off('nope', vi.fn())).not.toThrow();
    });
  });

  describe('once', () => {
    it('should invoke handler at most once', () => {
      const handler = vi.fn();
      bus.once('once:e', handler);

      bus.emit('once:e', 1);
      bus.emit('once:e', 2);
      bus.emit('once:e', 3);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });

    it('should be auto-removed after trigger', () => {
      const handler = vi.fn();
      bus.once('once:r', handler);
      bus.emit('once:r', 'first');
      bus.emit('once:r', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear a specific event', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('a', h1);
      bus.on('b', h2);

      bus.clear('a');

      bus.emit('a', 1);
      bus.emit('b', 2);
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledWith(2);
    });

    it('should clear all events when no event name', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('a', h1);
      bus.on('b', h2);

      bus.clear();

      bus.emit('a', 1);
      bus.emit('b', 2);
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });

    it('clear on unknown event is a no-op', () => {
      expect(() => bus.clear('unknown')).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should catch errors in handlers and continue emitting', () => {
      const badHandler = vi.fn(() => {
        throw new Error('boom');
      });
      const goodHandler = vi.fn();

      bus.on('err', badHandler);
      bus.on('err', goodHandler);

      expect(() => bus.emit('err', 'd')).not.toThrow();
      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalledWith('d');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error handling event err'),
        expect.any(Error)
      );
    });
  });

  describe('singleton eventBus export', () => {
    it('should be an EventBus instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('should allow on/emit on shared bus', () => {
      const fn = vi.fn();
      eventBus.on('shared', fn);
      eventBus.emit('shared', 'ok');
      expect(fn).toHaveBeenCalledWith('ok');
      eventBus.clear('shared');
    });
  });

  describe('ModuleEvents constants', () => {
    it('should expose expected event constants', () => {
      expect(ModuleEvents.MODULE_LOADED).toBe('module-loaded');
      expect(ModuleEvents.MODULE_UNLOADED).toBe('module-unloaded');
      expect(ModuleEvents.MODULE_ERROR).toBe('module-error');
      expect(ModuleEvents.USER_LOGIN).toBe('user-login');
      expect(ModuleEvents.USER_LOGOUT).toBe('user-logout');
      expect(ModuleEvents.THEME_CHANGE).toBe('theme-change');
      expect(ModuleEvents.LANGUAGE_CHANGE).toBe('language-change');
      expect(ModuleEvents.NOTIFICATION).toBe('notification');
    });
  });
});
