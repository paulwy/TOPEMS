import { useState, useEffect, useRef, useMemo } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    // Skip if value hasn't changed to avoid unnecessary updates
    if (Object.is(value, previousValueRef.current)) {
      return;
    }
    previousValueRef.current = value;

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  return useDebounce(value, delay);
}

export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update callback ref on each render to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return useMemo(
    () =>
      (...args: Parameters<T>) => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          callbackRef.current(...args);
        }, delay);
      },
    [delay]
  );
}

export default useDebounce;