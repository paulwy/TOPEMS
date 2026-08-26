import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface ResourceCRUDResult<T, _CreateRequest> {
  queryResult: ReturnType<typeof useQuery<ListResponse<T>>>;
  createMutation: ReturnType<typeof useMutation>;
  updateMutation: ReturnType<typeof useMutation>;
  deleteMutation: ReturnType<typeof useMutation>;
  data: T[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  refetch: () => void;
}

export interface UseResourceCRUDOptions<T, CreateRequest, UpdateRequest> {
  queryKey: unknown[];
  queryFn: () => Promise<ListResponse<T>>;
  createFn: (data: CreateRequest) => Promise<unknown>;
  updateFn: (params: { id: string; data: UpdateRequest }) => Promise<unknown>;
  deleteFn: (id: string) => Promise<unknown>;
  queryOptions?: Omit<UseQueryOptions<ListResponse<T>>, 'queryKey' | 'queryFn'>;
}

export function useResourceCRUD<T, CreateRequest, UpdateRequest>(
  options: UseResourceCRUDOptions<T, CreateRequest, UpdateRequest>
): ResourceCRUDResult<T, CreateRequest> {
  const queryClient = useQueryClient();

  const queryResult = useQuery<ListResponse<T>>({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: options.queryOptions?.staleTime ?? 5 * 60 * 1000,
    gcTime: options.queryOptions?.gcTime ?? 10 * 60 * 1000,
    ...options.queryOptions,
  });

  const createMutation = useMutation({
    mutationFn: options.createFn as (data: unknown) => Promise<unknown>,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: options.queryKey,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: options.updateFn as (params: unknown) => Promise<unknown>,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: options.queryKey,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: options.deleteFn as (id: unknown) => Promise<unknown>,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: options.queryKey,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  return {
    queryResult,
    createMutation,
    updateMutation,
    deleteMutation,
    data: queryResult.data?.data ?? [],
    total: queryResult.data?.total ?? 0,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: queryResult.refetch,
  };
}
