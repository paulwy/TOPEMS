import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateBackoffDelay,
  fullJitterBackoff,
  equalJitterBackoff,
  HeartbeatMonitor,
  getNextReconnectDelay,
  DEFAULT_RECONNECT_STRATEGY,
} from '../utils/websocket-optimizer';

describe('WebSocket Optimizer', () => {
  describe('calculateBackoffDelay', () => {
    it('returns value within valid range for first attempt', () => {
      const delay = calculateBackoffDelay(0, 1000, 30000);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(1000);
    });

    it('returns value within max delay cap', () => {
      for (let i = 0; i < 5; i++) {
        const delay = calculateBackoffDelay(i, 1000, 30000);
        expect(delay).toBeLessThanOrEqual(30000);
      }
    });

    it('uses exponential backoff with jitter', () => {
      // 多次重试时，平均延迟应该呈指数增长
      const samples = 100;
      const avgAt0 = Array.from({ length: samples }, () => calculateBackoffDelay(0, 1000, 30000)).reduce((a, b) => a + b, 0) / samples;
      const avgAt3 = Array.from({ length: samples }, () => calculateBackoffDelay(3, 1000, 30000)).reduce((a, b) => a + b, 0) / samples;

      // 第 3 次重试平均延迟应远大于第 0 次
      expect(avgAt3).toBeGreaterThan(avgAt0);
    });
  });

  describe('fullJitterBackoff', () => {
    it('returns value in [0, capped] range', () => {
      for (let i = 0; i < 20; i++) {
        const delay = fullJitterBackoff(0, 1000, 30000);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });

    it('returns random distribution', () => {
      const samples = 1000;
      const delays = Array.from({ length: samples }, () => fullJitterBackoff(0, 1000, 1000));
      const min = Math.min(...delays);
      const max = Math.max(...delays);
      expect(max - min).toBeGreaterThan(500); // 充分分散
    });
  });

  describe('equalJitterBackoff', () => {
    it('returns value in [capped/2, capped] range', () => {
      for (let i = 0; i < 20; i++) {
        const delay = equalJitterBackoff(0, 1000, 1000);
        expect(delay).toBeGreaterThanOrEqual(500);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('HeartbeatMonitor', () => {
    let sendPing: ReturnType<typeof vi.fn>;
    let onTimeout: ReturnType<typeof vi.fn>;
    let monitor: HeartbeatMonitor;

    beforeEach(() => {
      vi.useFakeTimers();
      sendPing = vi.fn();
      onTimeout = vi.fn();
      monitor = new HeartbeatMonitor(sendPing, onTimeout, 1000, 500);
    });

    afterEach(() => {
      monitor.stop();
      vi.useRealTimers();
    });

    it('starts successfully', () => {
      monitor.start();
      expect(monitor.isActive()).toBe(true);
    });

    it('sends ping at intervals', () => {
      monitor.start();
      // 模拟每次 ping 后立即收到 pong，防止超时
      vi.advanceTimersByTime(1000);
      expect(sendPing).toHaveBeenCalledTimes(1);
      monitor.recordPong();
      vi.advanceTimersByTime(1100);
      monitor.recordPong();
      // 至少发送了 2 次 ping
      expect(sendPing.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('resets timeout on pong received', () => {
      monitor.start();
      vi.advanceTimersByTime(800);
      monitor.recordPong();
      vi.advanceTimersByTime(800);
      // 应该发送了新的 ping
      expect(sendPing).toHaveBeenCalled();
    });

    it('triggers timeout callback when no pong received', () => {
      monitor.start();
      // 超过 interval + timeout 仍未收到 pong
      // interval=1000, timeout=500 -> 第一个 interval tick 后会立即发送 ping
      // 但因为没有 pong 记录，timeout 计时器不会被重置
      vi.advanceTimersByTime(1600);
      expect(onTimeout).toHaveBeenCalled();
      expect(monitor.isActive()).toBe(false);
    });

    it('stops when stop() is called', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isActive()).toBe(false);
      vi.advanceTimersByTime(2000);
      expect(sendPing).not.toHaveBeenCalled();
    });

    it('does not start twice', () => {
      monitor.start();
      monitor.start();
      expect(monitor.isActive()).toBe(true);
      vi.advanceTimersByTime(1000);
      // 只应该有一次 ping（没有重复 start）
      expect(sendPing).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNextReconnectDelay', () => {
    it('uses full jitter by default', () => {
      const delay = getNextReconnectDelay(0);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RECONNECT_STRATEGY.minDelay);
    });

    it('respects custom config', () => {
      const delay = getNextReconnectDelay(0, {
        minDelay: 500,
        maxDelay: 10000,
        maxAttempts: 5,
        jitterMode: 'full',
        factor: 2,
      });
      expect(delay).toBeLessThanOrEqual(500);
    });

    it('returns no jitter when mode is none', () => {
      const delay = getNextReconnectDelay(2, {
        minDelay: 1000,
        maxDelay: 30000,
        maxAttempts: 10,
        jitterMode: 'none',
        factor: 2,
      });
      // 1000 * 2^2 = 4000
      expect(delay).toBe(4000);
    });

    it('returns decorrelated jitter', () => {
      const delay = getNextReconnectDelay(0, {
        minDelay: 1000,
        maxDelay: 30000,
        maxAttempts: 10,
        jitterMode: 'decorrelated',
        factor: 2,
      });
      // 范围 [0, min(1000, 3000)] = [0, 1000]
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(1000);
    });

    it('caps at maxDelay', () => {
      const delay = getNextReconnectDelay(20, DEFAULT_RECONNECT_STRATEGY);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RECONNECT_STRATEGY.maxDelay);
    });
  });
});
