/**
 * Unified API Client - 统一 API 客户端
 *
 * 本模块是对已有 api/client.ts (基于 axios 的 ApiClient) 的统一封装，
 * 提供类型安全的请求方法、响应处理和 React Hooks 集成。
 *
 * 架构说明：
 *   api/client.ts          -> 底层 axios 多服务客户端 (ApiClient class)
 *   api/request.ts         -> 请求/响应处理工具 (handleResponse, paginatedRequest)
 *   hooks/useApiHooks.ts   -> React Hooks (useApi, useMutation, usePaginatedApi)
 *   lib/apiClient.ts       -> [本文件] 统一导出层，整合上述模块
 *   lib/react-query.ts     -> @tanstack/react-query 配置 (queryClient, QUERY_KEYS)
 */

import { apiClient as axiosApiClient } from '@/api/client';
import type { ApiResponse, PaginatedResponse } from '@/api/client';
import { handleResponse, safeRequest, paginatedRequest } from '@/api/request';
import type { RequestOptions as ApiRequestOptions, PaginatedRequestParams } from '@/api/request';

// Re-export core types
export type { ApiResponse, PaginatedResponse, PaginationParams } from '@/api/client';
export type { RequestOptions, PaginatedRequestParams } from '@/api/request';

// Re-export request utilities
export { handleResponse, safeRequest, paginatedRequest, handleRequestError } from '@/api/request';

// Re-export the underlying multi-service client
export { apiClient } from '@/api/client';
export { downloadBlob, createBaseAxiosClient } from '@/api/client';

// Re-export react-query integration
export { queryClient, QUERY_KEYS, CACHE_DURATIONS } from '@/lib/react-query';

// Re-export hooks
export {
  useApi,
  usePaginatedApi,
  useMutation,
  useInfiniteQuery,
  useDebouncedQuery,
} from '@/hooks/useApiHooks';
export type {
  ApiResponse as UseApiState,
  PaginationParams as UsePaginationParams,
  PaginatedResponse as UsePaginatedResponse,
} from '@/hooks/useApiHooks';

/**
 * Service name type derived from the ApiClient properties.
 * Covers all 25+ microservices registered in api/client.ts.
 */
export type ServiceName =
  | 'iam'
  | 'doc'
  | 'ai'
  | 'workflow'
  | 'rs'
  | 'lims'
  | 'qms'
  | 'ehs'
  | 'srm'
  | 'pdm'
  | 'report'
  | 'gis'
  | 'bi'
  | 'mobile'
  | 'im'
  | 'erp'
  | 'notification'
  | 'integration'
  | 'wms'
  | 'hrm'
  | 'crm'
  | 'mes'
  | 'pm'
  | 'master'
  | 'mail'
  | 'file'
  | 'scm'
  | 'migration';

/**
 * Typed wrapper to get a service-specific client.
 * Provides auto-completion for all registered service names.
 */
export function getServiceClient(name: ServiceName) {
  return axiosApiClient.getClient(name);
}

/**
 * Convenience function: make a typed GET request using the master client.
 */
export async function apiGet<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await axiosApiClient.get<T>(url, { params });
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed POST request using the master client.
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await axiosApiClient.post<T>(url, data);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed PUT request using the master client.
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await axiosApiClient.put<T>(url, data);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed PATCH request using the master client.
 */
export async function apiPatch<T = unknown>(
  url: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await axiosApiClient.patch<T>(url, data);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed DELETE request using the master client.
 */
export async function apiDelete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
  const response = await axiosApiClient.delete<T>(url);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed GET request to a specific service.
 */
export async function serviceGet<T = unknown>(
  service: ServiceName,
  url: string,
  params?: Record<string, unknown>,
  options?: ApiRequestOptions
): Promise<T> {
  const client = axiosApiClient.getClient(service);
  const response = await client.get<T>(url, { params });
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed POST request to a specific service.
 */
export async function servicePost<T = unknown>(
  service: ServiceName,
  url: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const client = axiosApiClient.getClient(service);
  const response = await client.post<T>(url, data);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed PUT request to a specific service.
 */
export async function servicePut<T = unknown>(
  service: ServiceName,
  url: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const client = axiosApiClient.getClient(service);
  const response = await client.put<T>(url, data);
  return handleResponse(response, options);
}

/**
 * Convenience function: make a typed DELETE request to a specific service.
 */
export async function serviceDelete<T = unknown>(
  service: ServiceName,
  url: string,
  options?: ApiRequestOptions
): Promise<T> {
  const client = axiosApiClient.getClient(service);
  const response = await client.delete<T>(url);
  return handleResponse(response, options);
}
