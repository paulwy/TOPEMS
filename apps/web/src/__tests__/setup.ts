import { vi } from 'vitest';
import React from 'react';

// ─── Mock @tanstack/react-query ────────────────────────────────────────────
vi.mock('@tanstack/react-query', () => {
  const mockQueryClient = {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
    resetQueries: vi.fn(),
    fetchQuery: vi.fn(),
    prefetchQuery: vi.fn(),
    cancelQueries: vi.fn(),
    setQueryDefaults: vi.fn(),
    setMutationDefaults: vi.fn(),
    getQueryState: vi.fn(),
    isFetching: vi.fn(() => 0),
    isMutating: vi.fn(() => 0),
    defaultOptions: {},
  };

  const useQueryClient = () => mockQueryClient;

  const useQuery = ({ queryKey, queryFn, initialData, enabled = true, select }: any) => {
    const [data, setData] = React.useState<any>(initialData);
    const [isLoading, setIsLoading] = React.useState<boolean>(!initialData && enabled);
    const [isFetching, setIsFetching] = React.useState<boolean>(!initialData && enabled);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [status, setStatus] = React.useState<string>(
      initialData ? 'success' : (enabled ? 'pending' : 'pending')
    );

    const fetchData = React.useCallback(() => {
      if (!queryFn) return;
      setIsFetching(true);
      if (!initialData) setIsLoading(true);
      try {
        const result = queryFn();
        if (result && typeof result.then === 'function') {
          result
            .then((res: any) => {
              const selectedData = select ? select(res) : res;
              setData(selectedData);
              setIsError(false);
              setError(null);
              setStatus('success');
            })
            .catch((err: any) => {
              setIsError(true);
              setError(err);
              setStatus('error');
            })
            .finally(() => {
              setIsLoading(false);
              setIsFetching(false);
            });
        } else {
          const selectedData = select ? select(result) : result;
          setData(selectedData);
          setIsError(false);
          setError(null);
          setStatus('success');
          setIsLoading(false);
          setIsFetching(false);
        }
      } catch (err: any) {
        setIsError(true);
        setError(err);
        setStatus('error');
        setIsLoading(false);
        setIsFetching(false);
      }
    }, [queryKey ? JSON.stringify(queryKey) : 'default']);

    React.useEffect(() => {
      if (!enabled || !queryFn) {
        setIsLoading(false);
        setIsFetching(false);
        return;
      }
      fetchData();
    }, [queryKey ? JSON.stringify(queryKey) : 'default', enabled, fetchData]);

    const refetch = React.useCallback(() => {
      if (!queryFn) return Promise.resolve({ data: undefined });
      fetchData();
      return Promise.resolve({ data });
    }, [queryKey ? JSON.stringify(queryKey) : 'default', fetchData, data]);

    return {
      data,
      isLoading,
      isFetching,
      isError,
      error,
      refetch,
      isSuccess: status === 'success',
      isPending: status === 'pending',
      status,
      failureCount: 0,
      isRefetching: false,
    };
  };

  const useMutation = ({ mutationFn, onSuccess, onError, onMutate, onSettled }: any) => {
    const [isPending, setIsPending] = React.useState<boolean>(false);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [isSuccess, setIsSuccess] = React.useState<boolean>(false);
    const [data, setData] = React.useState<any>(undefined);
    const [status, setStatus] = React.useState<string>('idle');
    const [variables, setVariables] = React.useState<any>(undefined);

    const mutate = React.useCallback(async (vars: any) => {
      setIsPending(true);
      setIsError(false);
      setError(null);
      setIsSuccess(false);
      setStatus('pending');
      setVariables(vars);

      let context: any;
      if (onMutate) {
        try {
          context = onMutate(vars);
        } catch (e) {
          // ignore
        }
      }

      try {
        const result = mutationFn ? await mutationFn(vars) : undefined;
        setData(result);
        setIsSuccess(true);
        setStatus('success');
        if (onSuccess) onSuccess(result, vars, context);
        if (onSettled) onSettled(result, null, vars, context);
        return result;
      } catch (err: any) {
        setIsError(true);
        setError(err);
        setStatus('error');
        if (onError) onError(err, vars, context);
        if (onSettled) onSettled(undefined, err, vars, context);
        throw err;
      } finally {
        setIsPending(false);
      }
    }, [mutationFn ? mutationFn.toString() : '']);

    const mutateAsync = React.useCallback(async (vars: any) => {
      return mutate(vars);
    }, [mutate]);

    const reset = React.useCallback(() => {
      setIsPending(false);
      setIsError(false);
      setError(null);
      setIsSuccess(false);
      setData(undefined);
      setStatus('idle');
      setVariables(undefined);
    }, []);

    return {
      mutate,
      mutateAsync,
      isPending,
      isLoading: isPending,
      isError,
      error,
      isSuccess,
      data,
      reset,
      status,
      variables,
    };
  };

  const useInfiniteQuery = ({ queryKey, queryFn, initialData, enabled = true, getNextPageParam }: any) => {
    const [data, setData] = React.useState<any>(initialData ?? { pages: [], pageParams: [] });
    const [isLoading, setIsLoading] = React.useState<boolean>(!initialData && enabled);
    const [isFetching, setIsFetching] = React.useState<boolean>(!initialData && enabled);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [hasNextPage, setHasNextPage] = React.useState<boolean>(false);

    React.useEffect(() => {
      if (!enabled || !queryFn) {
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      let cancelled = false;
      setIsFetching(true);
      if (!initialData) setIsLoading(true);

      Promise.resolve()
        .then(() => queryFn({ pageParam: 0 }))
        .then((result: any) => {
          if (cancelled) return;
          setData({ pages: [result], pageParams: [0] });
          setIsError(false);
          setError(null);
          if (getNextPageParam) {
            const nextParam = getNextPageParam(result, { pages: [result], pageParams: [0] });
            setHasNextPage(nextParam !== undefined && nextParam !== null);
          }
        })
        .catch((err: any) => {
          if (cancelled) return;
          setIsError(true);
          setError(err);
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
          setIsFetching(false);
        });

      return () => { cancelled = true; };
    }, [queryKey ? JSON.stringify(queryKey) : 'default', enabled]);

    const fetchNextPage = React.useCallback(async () => {
      setIsFetching(true);
      try {
        const nextPageParam = data.pageParams.length;
        const result = queryFn ? await queryFn({ pageParam: nextPageParam }) : undefined;
        setData((prev: any) => ({
          pages: [...prev.pages, result],
          pageParams: [...prev.pageParams, nextPageParam],
        }));
        return { data: result };
      } finally {
        setIsFetching(false);
      }
    }, [data, queryKey ? JSON.stringify(queryKey) : 'default']);

    const refetch = React.useCallback(() => {
      setIsFetching(true);
      return Promise.resolve()
        .then(() => queryFn?.({ pageParam: 0 }))
        .then((result: any) => {
          setData({ pages: [result], pageParams: [0] });
          setIsFetching(false);
          return { data: { pages: [result], pageParams: [0] } };
        });
    }, [queryKey ? JSON.stringify(queryKey) : 'default']);

    return {
      data,
      isLoading,
      isFetching,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
      hasNextPage,
      hasPreviousPage: false,
      fetchNextPage,
      fetchPreviousPage: vi.fn(),
      isError,
      error,
      refetch,
      isSuccess: !isLoading && !isError,
      status: isLoading ? 'pending' : (isError ? 'error' : 'success'),
    };
  };

  const QueryClientProvider = ({ children }: any) => children;

  return {
    useQuery,
    useMutation,
    useQueryClient,
    useInfiniteQuery,
    QueryClientProvider,
    QueryClient: vi.fn(function QueryClient() { return mockQueryClient; }),
    useQueries: vi.fn(() => []),
    useIsFetching: vi.fn(() => 0),
    useIsMutating: vi.fn(() => 0),
    dehydrate: vi.fn(() => ({ queries: [], mutations: [] })),
    hydrate: vi.fn(),
    HydrationBoundary: ({ children }: any) => children,
    keepPreviousData: 'keepPreviousData',
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver;

global.CSS = {
  supports: vi.fn().mockReturnValue(true),
  escape: vi.fn().mockImplementation((str) => str),
  Hz: 'Hz',
  Q: 'Q',
  cap: 'cap',
  ch: 'ch',
  cm: 'cm',
  deg: 'deg',
  dpcm: 'dpcm',
  dpi: 'dpi',
  em: 'em',
  ex: 'ex',
  fr: 'fr',
  grad: 'grad',
  h: 'h',
  H: 'H',
  inch: 'in',
  kHz: 'kHz',
  mm: 'mm',
  ms: 'ms',
  pc: 'pc',
  pt: 'pt',
  px: 'px',
  q: 'q',
  rad: 'rad',
  rem: 'rem',
  s: 's',
  turn: 'turn',
  vh: 'vh',
  vmax: 'vmax',
  vmin: 'vmin',
  vw: 'vw',
  lh: 'lh',
  rlh: 'rlh',
};
