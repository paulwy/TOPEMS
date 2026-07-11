import type {
  AxiosInstance,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import config, { isProduction, isDevelopment } from '../config/runtime';
import { createLogger, apiLogger } from '../utils/logger';
import { API_TIMEOUT } from '@topems/shared-constants';
import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@topems/shared-types';
import {
  csrfRequestInterceptor,
  csrfResponseInterceptor,
  initCsrfProtection,
} from '@/components/security';

const logger = createLogger('ApiClient');

export type ApiResponse<T = unknown> = SharedApiResponse<T>;
export type PaginatedResponse<T = any> = SharedPaginatedResponse<T>;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

type TypedAxiosInstance = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> & {
  defaults: { baseURL?: string };
  get<T = any, R = ApiResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  post<T = any, R = ApiResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  put<T = any, R = ApiResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  patch<T = any, R = ApiResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  delete<T = any, R = ApiResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
};

interface TimeoutError {
  code?: string;
  message?: string;
  response?: {
    statusText?: string;
  };
}

const isTimeoutError = (error: TimeoutError): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    (error.response?.statusText || '').toLowerCase() === 'timeout' ||
    (error.message || '').includes('timeout')
  );
};

const handleTimeoutError = (url: string): void => {
  logger.error(`Request timeout: ${url}`);
};

const handleNetworkError = (url: string): void => {
  logger.error(`Network error: ${url}`);
};

const handleAuthError = (): void => {
  if (localStorage.getItem('token')) {
    logger.warn('Unauthorized, clearing invalid token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    apiClient.clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
};

const isPublicPath = (url: string): boolean => {
  return url === '/health' || url.startsWith('/auth/');
};

interface CreateAxiosClientOptions {
  baseURL: string;
  timeout?: number;
  withCsrf?: boolean;
  returnData?: boolean;
}

export const createAxiosClient = ({
  baseURL,
  timeout = config.api.timeout,
  withCsrf = true,
  returnData = true,
}: CreateAxiosClientOptions): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    paramsSerializer: {
      serialize: (params) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'number') {
              searchParams.set(key, value.toString());
            } else if (typeof value === 'boolean') {
              searchParams.set(key, value ? 'true' : 'false');
            } else {
              searchParams.set(key, String(value));
            }
          }
        });
        return searchParams.toString();
      },
    },
  });

  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('token');
      const url = requestConfig.url || '';
      const requestBaseURL = requestConfig.baseURL || '';
      const fullUrl = `${requestBaseURL}${url}`;

      apiLogger.debug(`[API Request] ${requestConfig.method?.toUpperCase()} ${fullUrl}`, {
        url: fullUrl,
        method: requestConfig.method?.toUpperCase(),
        baseURL: requestBaseURL,
        tokenExists: !!token,
        isPublicPath: isPublicPath(url),
        params: requestConfig.params,
        data: requestConfig.data
          ? JSON.stringify(requestConfig.data).length > 1000
            ? 'Truncated (over 1000 chars)'
            : requestConfig.data
          : undefined,
      });

      if (token && !requestConfig.headers['Authorization'] && !isPublicPath(url)) {
        requestConfig.headers['Authorization'] = `Bearer ${token}`;
      }

      if (withCsrf) {
        return csrfRequestInterceptor(requestConfig);
      }
      return requestConfig;
    },
    (error) => {
      const url = error.config?.url || '';
      const baseURL = error.config?.baseURL || '';
      apiLogger.error(`[API Request Error] ${baseURL}${url}`, {
        url: `${baseURL}${url}`,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const url = response.config?.url || '';
      const baseURL = response.config?.baseURL || '';
      const fullUrl = `${baseURL}${url}`;

      apiLogger.debug(`[API Response] ${response.status} ${fullUrl}`, {
        url: fullUrl,
        status: response.status,
        statusText: response.statusText,
        responseTime: response.headers?.['x-response-time'] || 'N/A',
        data: response.data
          ? JSON.stringify(response.data).length > 2000
            ? 'Truncated (over 2000 chars)'
            : response.data
          : undefined,
        headers: {
          'Content-Type': response.headers?.['content-type'],
          'x-response-time': response.headers?.['x-response-time'],
        },
      });

      if (withCsrf) {
        csrfResponseInterceptor(response);
      }

      return returnData ? response.data : response;
    },
    (error) => {
      const url = error.config?.url || '';
      const baseURL = error.config?.baseURL || '';
      const fullUrl = `${baseURL}${url}`;

      apiLogger.error(`[API Error] ${error.response?.status || 'N/A'} ${fullUrl}`, {
        url: fullUrl,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: error.response?.data
          ? JSON.stringify(error.response?.data).length > 2000
            ? 'Truncated (over 2000 chars)'
            : error.response?.data
          : undefined,
        responseHeaders: error.response?.headers,
        requestConfig: {
          url,
          baseURL,
          params: error.config?.params,
          data: error.config?.data
            ? JSON.stringify(error.config?.data).length > 1000
              ? 'Truncated (over 1000 chars)'
              : error.config?.data
            : undefined,
          headers: {
            Authorization: error.config?.headers?.['Authorization'] ? 'Bearer [token]' : undefined,
          },
        },
      });

      if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        logger.debug('Request was canceled or aborted:', url);
        return Promise.reject(error);
      }

      if (isTimeoutError(error)) {
        handleTimeoutError(url);
        return Promise.reject(error);
      }

      if (!error.response || error.code === 'ERR_NETWORK') {
        handleNetworkError(url);
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          handleAuthError();
        }
      }

      const isHealthCheck = url.includes('/health');
      const isNotFound = error.response?.status === 404;
      const isServiceUnavailable = error.response?.status === 503;
      const isServerError = error.response?.status === 500;

      if (
        isProduction() ||
        !(isHealthCheck || isNotFound || isServiceUnavailable || isServerError)
      ) {
        logger.error('Response error:', error);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const createBaseAxiosClient = (baseURL: string): AxiosInstance => {
  return createAxiosClient({ baseURL, withCsrf: false, returnData: false });
};

export const downloadBlob = async (
  serviceName: string,
  url: string,
  options?: { params?: Record<string, unknown> }
): Promise<Blob> => {
  const serviceClient = apiClient.getClient(serviceName);
  const response = await serviceClient.get(url, {
    responseType: 'blob' as const,
    params: options?.params,
    validateStatus: () => true,
  });

  const responseData = response as unknown as AxiosResponse<Blob>;
  const responseUrl = `${serviceClient.defaults.baseURL}${url}`;

  apiLogger.debug(`[downloadBlob Response] ${responseData.status} ${responseUrl}`, {
    url: responseUrl,
    status: responseData.status,
    statusText: responseData.statusText,
    headers: {
      'Content-Type': responseData.headers?.['content-type'],
      'Content-Length': responseData.headers?.['content-length'],
    },
  });

  if (responseData.status !== 200) {
    let errorMessage = `请求失败: ${responseData.status}`;
    if (responseData.data && typeof responseData.data.text === 'function') {
      const text = await responseData.data.text();
      apiLogger.debug('downloadBlob - error response text:', text);
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || errorMessage;
      } catch {
        if (text.length < 100) {
          errorMessage = text;
        }
      }
    }
    throw new Error(errorMessage);
  }

  return responseData.data;
};

class ApiClient {
  private clients: Record<string, TypedAxiosInstance> = {};

  constructor() {
    initCsrfProtection();

    Object.entries(config.services).forEach(([name, baseURL]) => {
      const timeout = name === 'ai' ? API_TIMEOUT.AI : config.api.timeout;
      const client = createAxiosClient({ baseURL, timeout }) as unknown as TypedAxiosInstance;
      this.clients[name] = client;
    });
  }

  public getClient(name: string): TypedAxiosInstance {
    return this.clients[name];
  }

  get iam() {
    return this.clients.iam;
  }
  get doc() {
    return this.clients.doc;
  }
  get ai() {
    return this.clients.ai;
  }
  get workflow() {
    return this.clients.workflow;
  }
  get rs() {
    return this.clients.rs;
  }
  get lims() {
    return this.clients.lims;
  }
  get qms() {
    return this.clients.qms;
  }
  get ehs() {
    return this.clients.ehs;
  }
  get srm() {
    return this.clients.srm;
  }
  get pdm() {
    return this.clients.pdm;
  }
  get report() {
    return this.clients.report;
  }
  get gis() {
    return this.clients.gis;
  }
  get bi() {
    return this.clients.bi;
  }
  get mobile() {
    return this.clients.mobile;
  }
  get im() {
    return this.clients.im;
  }
  get erp() {
    return this.clients.erp;
  }
  get notification() {
    return this.clients.notification;
  }
  get integration() {
    return this.clients.integration;
  }
  get wms() {
    return this.clients.wms;
  }
  get hrm() {
    return this.clients.hrm;
  }
  get crm() {
    return this.clients.crm;
  }
  get mes() {
    return this.clients.mes;
  }
  get pm() {
    return this.clients.pm;
  }
  get master() {
    return this.clients.master;
  }
  get mail() {
    return this.clients.mail;
  }
  get file() {
    return this.clients.file;
  }
  get scm() {
    return this.clients.scm;
  }
  get migration() {
    return this.clients.migration;
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.clients.master.get<T>(url, config);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.master.post<T>(url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.master.put<T>(url, data, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.master.patch<T>(url, data, config);
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.clients.master.delete<T>(url, config);
  }

  setAuthToken(token: string) {
    Object.values(this.clients).forEach((client) => {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    });
  }

  clearAuthToken() {
    Object.values(this.clients).forEach((client) => {
      delete client.defaults.headers.common['Authorization'];
    });
  }

  getClients() {
    return this.clients;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
