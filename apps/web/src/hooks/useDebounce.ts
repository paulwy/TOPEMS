import React, { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<
  T extends (...args: Parameters<T>) => ReturnType<T>,
>(callback: T, delay: number): (...args: Parameters<T>) => void {
  const debouncedRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  return (...args: Parameters<T>) => {
    if (debouncedRef.current) {
      clearTimeout(debouncedRef.current);
    }

    debouncedRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export default useDebounce;
