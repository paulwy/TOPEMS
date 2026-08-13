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
import { injectTraceContext } from '@/utils/telemetry';
import { getCurrentTraceId, getCurrentSpanId, startTrace } from '@/utils/tracing';

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
    status?: number;
  };
}

const API_RETRY_CONFIG = {
  MAX_RETRIES: 2,
  BASE_DELAY: 500,
  MAX_DELAY: 3000,
  MAX_TOTAL_WAIT: 10000,
} as const;

const isTimeoutError = (error: TimeoutError): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    (error.response?.statusText || '').toLowerCase() === 'timeout' ||
    (error.message || '').includes('timeout')
  );
};

const isNetworkError = (error: TimeoutError): boolean => {
  return !error.response || error.code === 'ERR_NETWORK';
};

const isServiceUnavailable = (error: TimeoutError): boolean => {
  return error.response?.status === 503;
};

const calculateRetryDelay = (retries: number): number => {
  const delay = API_RETRY_CONFIG.BASE_DELAY * Math.pow(2, retries);
  const jitter = Math.random() * 200 - 100;
  return Math.min(delay + jitter, API_RETRY_CONFIG.MAX_DELAY);
};

const shouldRetry = (error: TimeoutError, retries: number, startTime: number): boolean => {
  if (retries >= API_RETRY_CONFIG.MAX_RETRIES) return false;

  const elapsed = Date.now() - startTime;
  if (elapsed >= API_RETRY_CONFIG.MAX_TOTAL_WAIT) return false;

  if (isServiceUnavailable(error)) return false;

  return (
    isTimeoutError(error) ||
    isNetworkError(error) ||
    (error.response?.status !== undefined && error.response.status >= 500)
  );
};

const handleTimeoutError = (url: string): void => {
  logger.error(`Request timeout: ${url}`);
};

const handleNetworkError = (url: string): void => {
  logger.error(`Network error: ${url}`);
};

const handleServiceUnavailable = (url: string): void => {
  logger.warn(`Service unavailable: ${url}, skipping retries`);
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

const PUBLIC_API_PATTERNS = [
  '/health',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const isPublicPath = (url: string): boolean => {
  return PUBLIC_API_PATTERNS.some((p) => url === p || url.endsWith(p));
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

      apiLogger.info(`[日志1-请求发送] ${requestConfig.method?.toUpperCase()} ${fullUrl}`, {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        hasAuthHeader: !!requestConfig.headers['Authorization'],
        isPublicPath: isPublicPath(url),
        timestamp: new Date().toISOString(),
      });

      if (isDevelopment()) {
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
      }

      if (token && !requestConfig.headers['Authorization'] && !isPublicPath(url)) {
        requestConfig.headers['Authorization'] = `Bearer ${token}`;
      }

      if (!requestConfig.headers['X-Request-Start']) {
        requestConfig.headers['X-Request-Start'] = Date.now().toString();
      }

      const traceHeaders = injectTraceContext();
      Object.entries(traceHeaders).forEach(([key, value]) => {
        requestConfig.headers[key] = value;
      });

      // 补充后端 request_context_middleware 期望的自定义 trace headers
      let traceId = getCurrentTraceId();
      let spanId = getCurrentSpanId();
      if (!traceId) {
        const ctx = startTrace();
        traceId = ctx.traceId;
        spanId = ctx.spanId;
      }
      requestConfig.headers['x-trace-id'] = traceId;
      requestConfig.headers['x-span-id'] = spanId || '';
      requestConfig.headers['x-request-id'] = traceId;

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

      if (isDevelopment()) {
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
      }

      if (withCsrf) {
        csrfResponseInterceptor(response);
      }

      return returnData ? response.data : response;
    },
    async (error) => {
      const url = error.config?.url || '';
      const baseURL = error.config?.baseURL || '';
      const fullUrl = `${baseURL}${url}`;
      const retries = error.config?.headers?.['X-Retry-Count'] || 0;
      const errorStatus = error.response?.status;

      // V64 + V205 静默降级：开发环境下后端服务未就绪或用户未登录时
      // 产生大量 401/404/502/503，降级为 warn 避免控制台 ERROR 刷屏。
      // 401 = 未登录/登录已失效（登录页、demo 环境常见），404/502/503 = 服务未就绪。
      // 生产环境仍保持 error 级别以捕获真正的问题。
      const isDevEnv = isDevelopment();
      const isServiceDownOrUnauth =
        errorStatus === 401 || errorStatus === 404 || errorStatus === 502 || errorStatus === 503;
      const logLevel = isDevEnv && isServiceDownOrUnauth ? 'warn' : 'error';
      apiLogger[logLevel](
        `[API ${isDevEnv && isServiceDownOrUnauth ? 'Warn' : 'Error'}] ${errorStatus || 'N/A'} ${fullUrl}`,
        {
          url: fullUrl,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorCode: error.code,
          errorMessage: error.message,
          retries,
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
              Authorization: error.config?.headers?.['Authorization']
                ? 'Bearer [token]'
                : undefined,
            },
          },
        }
      );

      if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        logger.debug('Request was canceled or aborted:', url);
        return Promise.reject(error);
      }

      if (isTimeoutError(error)) {
        handleTimeoutError(url);
      }

      if (!error.response || error.code === 'ERR_NETWORK') {
        handleNetworkError(url);
      }

      if (error.response?.status === 503) {
        handleServiceUnavailable(url);
      }

      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        const tokenBefore = localStorage.getItem('token');
        const requestIsAuthPublicApi = isPublicPath(url);

        apiLogger.warn(`[日志2-收到401响应] ${fullUrl}`, {
          currentPath,
          hasTokenBeforeClear: !!tokenBefore,
          isUserOnLoginPage: currentPath === '/login' || currentPath === '/register',
          isRequestAuthPublicApi: requestIsAuthPublicApi,
          serverMessage: error.response?.data?.message || error.response?.statusText,
          willClearToken:
            !requestIsAuthPublicApi && currentPath !== '/login' && currentPath !== '/register',
          timestamp: new Date().toISOString(),
        });

        // 关键：如果请求本身是登录/注册/刷新/找回密码等认证公开API，
        // 返回 401 是正常业务失败（如密码错误），不应清除 token 或触发登出事件
        if (!requestIsAuthPublicApi && currentPath !== '/login' && currentPath !== '/register') {
          handleAuthError();
        }
        return Promise.reject(error);
      }

      const startTime = Number(error.config?.headers?.['X-Request-Start']) || Date.now();

      if (shouldRetry(error, retries, startTime)) {
        const delay = calculateRetryDelay(retries);
        logger.info(
          `Retrying request (${retries + 1}/${API_RETRY_CONFIG.MAX_RETRIES}): ${fullUrl}, delay: ${Math.round(delay)}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));

        const newConfig = { ...error.config };
        newConfig.headers = {
          ...newConfig.headers,
          'X-Retry-Count': retries + 1,
          'X-Request-Start': startTime,
        };

        return client(newConfig);
      }

      const isHealthCheck = url.includes('/health');
      const isNotFound = error.response?.status === 404;
      const hasServiceUnavailable = error.response?.status === 503;
      const isServerError = error.response?.status === 500;

      if (
        isProduction() ||
        !(isHealthCheck || isNotFound || hasServiceUnavailable || isServerError)
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

  if (isDevelopment()) {
    apiLogger.debug(`[downloadBlob Response] ${responseData.status} ${responseUrl}`, {
      url: responseUrl,
      status: responseData.status,
      statusText: responseData.statusText,
      headers: {
        'Content-Type': responseData.headers?.['content-type'],
        'Content-Length': responseData.headers?.['content-length'],
      },
    });
  }

  if (responseData.status !== 200) {
    let errorMessage = `请求失败: ${responseData.status}`;
    if (responseData.data && typeof responseData.data.text === 'function') {
      const text = await responseData.data.text();
      if (isDevelopment()) {
        apiLogger.debug('downloadBlob - error response text:', text);
      }
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
  get flow() {
    return this.clients.workflow;
  }
  get rd() {
    return this.clients.rd;
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
  get bi() {
    return this.clients.bi;
  }
  get gis() {
    return this.clients.gis;
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
  get integration() {
    return this.clients.integration;
  }
  get wms() {
    return this.clients.wms;
  }
  get tms() {
    return this.clients.tms;
  }
  get aps() {
    return this.clients.aps;
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
  get core() {
    return this.clients.core;
  }
  get file() {
    return this.clients.file;
  }
  get scm() {
    return this.clients.scm;
  }
  get finance() {
    return this.clients.finance;
  }
  get notification() {
    return this.clients.notification;
  }
  get mail() {
    return this.clients.mail;
  }
  get migration() {
    return this.clients.migration;
  }
  get monitor() {
    return this.clients.monitor;
  }
  get master() {
    return this.clients.master;
  }
  get portal() {
    return this.clients.portal;
  }
  get search() {
    return this.clients.search;
  }
  get billing() {
    return this.clients.billing;
  }
  get ticket() {
    return this.clients.ticket;
  }
  get feedback() {
    return this.clients.feedback;
  }
  get lowcode() {
    return this.clients.lowcode;
  }
  get automation() {
    return this.clients.automation;
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.clients.core.get<T>(url, config);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.core.post<T>(url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.core.put<T>(url, data, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.clients.core.patch<T>(url, data, config);
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.clients.core.delete<T>(url, config);
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
