/**
 * useCountUp — 数字滚动动画 Hook
 *
 * 从起始值滚动到目标值，使用 requestAnimationFrame 实现平滑动画
 * 支持自定义时长、缓动函数、格式化
 *
 * 用法：
 * const count = useCountUp(1000, { duration: 1500 });
 */

import { useState, useEffect, useRef } from 'react';

export interface UseCountUpOptions {
  /** 动画时长（毫秒），默认 800 */
  duration?: number;
  /** 起始值，默认 0 */
  startValue?: number;
  /** 小数位数，默认 0 */
  decimals?: number;
  /** 是否启用动画，默认 true */
  enabled?: boolean;
  /** 缓动函数，默认 easeOutCubic */
  easing?: (t: number) => number;
  /** 格式化函数，如添加千分位、货币符号 */
  format?: (value: number) => string;
  /** 延迟开始（毫秒），默认 0 */
  delay?: number;
}

// 缓动函数
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutExpo = (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function useCountUp(
  endValue: number,
  options: UseCountUpOptions = {}
): { value: number; displayValue: string; reset: () => void } {
  const {
    duration = 800,
    startValue = 0,
    decimals = 0,
    enabled = true,
    easing = easeOutCubic,
    format,
    delay = 0,
  } = options;

  const [currentValue, setCurrentValue] = useState<number>(enabled ? startValue : endValue);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrentValue(endValue);
      return;
    }

    // 清理之前的动画
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    // 重置起始值
    let fromValue = startValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      const value = fromValue + (endValue - fromValue) * easedProgress;

      setCurrentValue(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const start = () => {
      rafRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      delayTimeoutRef.current = setTimeout(start, delay);
    } else {
      start();
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [endValue, duration, startValue, enabled, easing, delay]);

  const reset = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }
    startTimeRef.current = null;
    setCurrentValue(enabled ? startValue : endValue);
  };

  const roundedValue = Number(currentValue.toFixed(decimals));
  const displayValue = format ? format(roundedValue) : roundedValue.toLocaleString();

  return { value: roundedValue, displayValue, reset };
}

// 便捷导出常用缓动函数
export const countUpEasings = {
  linear: (t: number) => t,
  easeOutCubic,
  easeOutExpo,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export default useCountUp;
