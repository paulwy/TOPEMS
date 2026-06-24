import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import config, { isProduction, isDevelopment } from '../config/runtime';
import { createLogger, apiLogger } from '../utils/logger';
import { API_TIMEOUT } from '@/constants/timeouts';

const logger = createLogger('ApiClient');

export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T | undefined;
  message: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type TypedAxiosInstance = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> & {
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

const isTimeoutError = (error: any): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    (error.response?.statusText || '').toLowerCase() === 'timeout' ||
    error.message?.includes('timeout')
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

// 判断是否是不需要认证的路径
const isPublicPath = (url: string): boolean => {
  return url === '/health' || url.startsWith('/api/iam/auth/');
};

export const createBaseAxiosClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: config.api.timeout,
  });

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      // 只对非公开路径添加认证头
      if (token && !config.headers['Authorization'] && !isPublicPath(config.url || '')) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * 统一的 Blob 下载函数
 * 解决使用 responseType: "blob" 时，401 错误被当作 blob 返回的问题
 */
export const downloadBlob = async (
  baseURL: string,
  url: string,
  options?: { params?: Record<string, any> }
): Promise<Blob> => {
  // 在开发环境中，使用相对路径以便 Vite 代理能正确处理
  // 检查是否是 localhost 地址，如果是则使用相对路径
  const isLocalhost =
    baseURL.startsWith('http://localhost') || baseURL.startsWith('http://127.0.0.1');
  const useProxy = isLocalhost && isDevelopment();

  const clientBaseURL = useProxy ? '' : baseURL;
  const requestUrl = useProxy ? url : url;

  const client = axios.create({
    baseURL: clientBaseURL,
    timeout: config.api.timeout,
    // 让所有状态码都不抛出错误，由我们手动处理
    validateStatus: () => true,
  });

  // 添加认证拦截器 - 始终添加 Authorization 头（下载接口都需要认证）
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    apiLogger.debug('downloadBlob - token found:', !!token);
    apiLogger.debug('downloadBlob - request URL:', clientBaseURL + (config.url || ''));
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      apiLogger.debug('downloadBlob - Authorization header added');
    }
    return config;
  });

  const response = await client.get(requestUrl, {
    responseType: 'blob',
    params: options?.params,
  });

  apiLogger.debug('downloadBlob - response status:', response.status);

  // 检查是否是错误响应
  if (response.status !== 200) {
    // 尝试解析错误信息
    let errorMessage = `请求失败: ${response.status}`;
    if (response.data && typeof response.data.text === 'function') {
      const text = await response.data.text();
      apiLogger.debug('downloadBlob - error response text:', text);
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || errorMessage;
      } catch {
        // 如果不是 JSON，使用原始文本
        if (text.length < 100) {
          errorMessage = text;
        }
      }
    }
    throw new Error(errorMessage);
  }

  return response.data;
};

class ApiClient {
  private clients: Record<string, TypedAxiosInstance> = {};

  constructor() {
    Object.entries(config.services).forEach(([name, baseURL]) => {
      // 使用统一的超时配置常量
      const timeout = name === 'ai' ? API_TIMEOUT.AI : config.api.timeout;
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
        (config) => {
          const token = localStorage.getItem('token');
          const url = config.url || '';
          const baseURL = config.baseURL || '';

          // Debug log for hrm requests
          if (baseURL.includes('/hrm') || url.includes('/hrm') || url.includes('positions')) {
            apiLogger.debug(`[HRM API Request]`, {
              url: `${baseURL}${url}`,
              method: config.method,
              tokenExists: !!token,
              hasAuthHeader: !!config.headers['Authorization'],
              isPublicPath: isPublicPath(url),
              params: config.params,
              data: config.data,
            });
          }

          // Debug log for notification requests
          if (baseURL.includes('notification') || url.includes('/api/notifications')) {
            apiLogger.debug(`[Notification API Request]`, {
              url: `${baseURL}${url}`,
              tokenExists: !!token,
              hasAuthHeader: !!config.headers['Authorization'],
              isPublicPath: isPublicPath(url),
            });
          }

          // 只对非公开路径添加认证头
          if (token && !config.headers['Authorization'] && !isPublicPath(url)) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          // 不输出健康检查的请求错误
          const isHealthCheck = error.config?.url?.includes('/health');
          if (!isHealthCheck) {
            logger.error('Request error:', error);
          }
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response: AxiosResponse) => {
          const url = response.config?.url || '';
          const baseURL = response.config?.baseURL || '';
          if (baseURL.includes('/hrm') || url.includes('/hrm') || url.includes('positions')) {
            apiLogger.debug(`[HRM API Response]`, {
              url: `${baseURL}${url}`,
              status: response.status,
              statusText: response.statusText,
              data: response.data,
            });
          }
          return response.data;
        },
        (error) => {
          const url = error.config?.url || '';
          const baseURL = error.config?.baseURL || '';

          if (baseURL.includes('/hrm') || url.includes('/hrm') || url.includes('positions')) {
            apiLogger.error(`[HRM API Error]`, {
              url: `${baseURL}${url}`,
              method: error.config?.method,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.response?.headers,
              errorCode: error.code,
              errorMessage: error.message,
            });
          }

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
            const isNotificationService =
              error.config?.baseURL?.includes('8002') ||
              error.config?.baseURL?.startsWith('notification');

            if (isNotificationService) {
              logger.debug('Notification service returned 401, skipping auth cleanup');
              return Promise.resolve({
                code: 0,
                success: true,
                data: 0,
                message: 'Unauthorized',
                timestamp: new Date().toISOString(),
              });
            }

            if (currentPath !== '/login' && currentPath !== '/register' && !isNotificationService) {
              handleAuthError();
            }
          }

          const isHealthCheck = url.includes('/health');
          const isNotFound = error.response?.status === 404;
          const isServiceUnavailable = error.response?.status === 503;
          const isServerError = error.response?.status === 500;

          if (
            isProduction() ||
            !(
              isHealthCheck ||
              isNotFound ||
              isServiceUnavailable ||
              isServerError ||
              (error.config?.baseURL?.includes('notification') && error.response?.status === 401)
            )
          ) {
            logger.error('Response error:', error);
          }

          return Promise.reject(error);
        }
      );

      this.clients[name] = client as unknown as TypedAxiosInstance;
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

  get flow() {
    return this.clients.flow;
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

  // Generic HTTP methods using master client
  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.clients.master.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.clients.master.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.clients.master.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.clients.master.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
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
