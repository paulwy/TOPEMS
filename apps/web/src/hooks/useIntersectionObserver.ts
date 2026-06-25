import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
  initialIsIntersecting?: boolean;
}

export interface UseIntersectionObserverResult {
  isIntersecting: boolean;
  intersectionRatio: number;
  entry: IntersectionObserverEntry | null;
  ref: (element: Element | null) => void;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    triggerOnce = false,
    initialIsIntersecting = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(initialIsIntersecting);
  const [intersectionRatio, setIntersectionRatio] = useState(0);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);
  const hasTriggeredRef = useRef(false);

  const ref = useCallback(
    (element: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      elementRef.current = element;

      if (!element) {
        setIsIntersecting(initialIsIntersecting);
        setIntersectionRatio(0);
        setEntry(null);
        return;
      }

      if (triggerOnce && hasTriggeredRef.current) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (triggerOnce && entry.isIntersecting) {
              hasTriggeredRef.current = true;
              setIsIntersecting(true);
              setIntersectionRatio(entry.intersectionRatio);
              setEntry(entry);
              observerRef.current?.disconnect();
              observerRef.current = null;
            } else {
              setIsIntersecting(entry.isIntersecting);
              setIntersectionRatio(entry.intersectionRatio);
              setEntry(entry);
            }
          });
        },
        { threshold, root, rootMargin }
      );

      observerRef.current.observe(element);
    },
    [threshold, root, rootMargin, triggerOnce, initialIsIntersecting]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return {
    isIntersecting,
    intersectionRatio,
    entry,
    ref,
  };
}

export function useInView(options: Omit<UseIntersectionObserverOptions, 'triggerOnce'> = {}) {
  return useIntersectionObserver({ ...options, triggerOnce: true });
}

export default useIntersectionObserver;
