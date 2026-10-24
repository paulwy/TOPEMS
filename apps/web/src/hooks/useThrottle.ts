import { useState, useEffect, useRef, useMemo } from 'react';

export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecutedRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (Object.is(value, previousValueRef.current)) {
      return;
    }
    previousValueRef.current = value;

    const now = Date.now();
    const timeSinceLastExecute = now - lastExecutedRef.current;

    if (timeSinceLastExecute >= delay) {
      lastExecutedRef.current = now;
      setThrottledValue(value);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastExecutedRef.current = Date.now();
        setThrottledValue(value);
      }, delay - timeSinceLastExecute);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

export default useThrottle;
