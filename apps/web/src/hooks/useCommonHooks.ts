/**
 * 通用业务Hooks
 * 提供常用的React Hooks封装
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useLocalStorage - 带localStorage持久化的state hook
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error: unknown) {
          console.error('useLocalStorage setItem error:', error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

/**
 * useSessionStorage - 带sessionStorage持久化的state hook
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          sessionStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error: unknown) {
          console.error('useSessionStorage setItem error:', error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

/**
 * useDebounce - 防抖hook
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * usePrevious - 获取上一个状态值
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useToggle - 切换boolean状态
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  return [value, toggle, setValue];
}

/**
 * useArray - 数组操作hook
 */
export function useArray<T>(initialArray: T[] = []) {
  const [array, setArray] = useState<T[]>(initialArray);

  const add = useCallback((item: T) => {
    setArray((prev) => [...prev, item]);
  }, []);

  const remove = useCallback((index: number) => {
    setArray((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const update = useCallback((index: number, item: T) => {
    setArray((prev) => prev.map((i, idx) => (idx === index ? item : i)));
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const reset = useCallback(() => {
    setArray(initialArray);
  }, [initialArray]);

  return {
    array,
    setArray,
    add,
    remove,
    update,
    clear,
    reset,
  };
}

/**
 * useCounter - 计数器hook
 */
export function useCounter(
  initialValue: number = 0,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
) {
  const [count, setCount] = useState<number>(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + 1, max));
  }, [max]);

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(prev - 1, min));
  }, [min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return { count, increment, decrement, reset, setCount };
}

/**
 * useFetch - 数据获取hook
 */
export interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string, options?: RequestInit) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error: unknown) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * useClickOutside - 点击外部hook
 */
export function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

/**
 * useKeyPress - 键盘按键hook
 */
export function useKeyPress(
  targetKey: string,
  handler: () => void,
  options?: { event?: 'keydown' | 'keyup' }
) {
  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler();
      }
    };

    const eventType = options?.event || 'keydown';
    window.addEventListener(eventType, callback);

    return () => {
      window.removeEventListener(eventType, callback);
    };
  }, [targetKey, handler, options?.event]);
}

/**
 * useIntersectionObserver - 元素可见性hook
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return isIntersecting;
}

/**
 * useWindowSize - 窗口尺寸hook
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
