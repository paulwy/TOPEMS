import { useCallback } from 'react';
import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions, type QueryFunctionContext, type QueryFunction } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { saveCacheEntry, getCacheEntry } from '@/services/offlineStorage';
import type { ServiceName } from '@/lib/apiClient';

interface OfflineConfig {
  service?: ServiceName;
  endpoint?: string;
  ttl?: number;
  fallbackToCache?: boolean;
}

export function useOfflineQuery<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
  options: UseQueryOptions<TQueryFnData, TError, TData> & { offlineConfig?: OfflineConfig }
) {
  const { offlineConfig, queryFn, ...queryOptions } = options;
  const { status: networkStatus } = useNetworkStatus();

  const enhancedQueryFn = useCallback(
    async (context: QueryFunctionContext) => {
      if (!queryFn) throw new Error('queryFn is required');

      try {
        const result = await (queryFn as QueryFunction<TQueryFnData>)(context);

        if (offlineConfig?.service && offlineConfig?.endpoint) {
          await saveCacheEntry({
            service: offlineConfig.service,
            endpoint: offlineConfig.endpoint,
            data: result,
            ttl: offlineConfig.ttl ?? 30 * 60 * 1000,
          });
        }

        return result;
      } catch (error) {
        if (offlineConfig?.fallbackToCache && networkStatus === 'offline') {
          if (offlineConfig.service && offlineConfig.endpoint) {
            const cachedEntry = await getCacheEntry(
              offlineConfig.service,
              offlineConfig.endpoint
            );
            if (cachedEntry) {
              return cachedEntry.data as TQueryFnData;
            }
          }
        }
        throw error;
      }
    },
    [queryFn, offlineConfig, networkStatus]
  );

  return useQuery({
    ...queryOptions,
    queryFn: enhancedQueryFn,
  });
}

export function useOfflineMutation<TData = unknown, TError = unknown, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables> & { offlineConfig?: OfflineConfig }
) {
  const { offlineConfig, mutationFn, ...mutationOptions } = options;
  const { status: networkStatus } = useNetworkStatus();

  const enhancedMutationFn = useCallback(
    async (variables: TVariables): Promise<TData> => {
      if (networkStatus === 'offline' && offlineConfig?.service && offlineConfig?.endpoint) {
        await saveCacheEntry({
          service: offlineConfig.service,
          endpoint: offlineConfig.endpoint,
          data: { variables, timestamp: Date.now() },
          ttl: 24 * 60 * 60 * 1000,
        });
      }
      if (!mutationFn) throw new Error('mutationFn is required');
      return (mutationFn as (variables: TVariables) => Promise<TData>)(variables);
    },
    [mutationFn, offlineConfig, networkStatus]
  );

  return useMutation({
    ...mutationOptions,
    mutationFn: enhancedMutationFn,
  });
}
