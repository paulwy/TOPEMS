import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import config, { isProduction } from '../config/runtime';
import createLogger from '../utils/logger';

const logger = createLogger('ApiClient');

export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
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
  get<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  post<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  put<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  patch<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  delete<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
};

const DEFAULT_TIMEOUT = 30000;
const AI_TIMEOUT = 120000;

// 禁用 Axios 的自动错误日志
axios.interceptors.request.use((config) => {
  // 不做任何事情，只是为了确保拦截器被注册
  return config;
});

// 判断是否是不需要认证的路径
const isPublicPath = (url: string): boolean => {
  return url === '/health' || url.startsWith('/api/v1/auth/');
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

class ApiClient {
  private clients: Record<string, TypedAxiosInstance> = {};

  constructor() {
    Object.entries(config.services).forEach(([name, baseURL]) => {
      // 使用 config 中的超时配置，而不是硬编码的 DEFAULT_TIMEOUT
      const timeout = name === 'ai' ? AI_TIMEOUT : config.api.timeout;
      const client = axios.create({
        baseURL,
        timeout,
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
          return response.data;
        },
        (error) => {
          // 处理请求取消或中止的情况
          if (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED' || error.name === 'AbortError') {
            logger.debug('Request was canceled or aborted:', error.config?.url);
            return Promise.reject(error);
          }

          if (!error.response || error.code === 'ERR_NETWORK') {
            return Promise.reject(error);
          }

          if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/register') {
              if (localStorage.getItem('token')) {
                logger.warn('Unauthorized, clearing invalid token and redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('roles');
                localStorage.removeItem('permissions');
                apiClient.clearAuthToken();
                window.location.href = '/login';
              }
            }
          }

          // 减少健康检查错误和 404 错误在开发环境的日志输出
          const isHealthCheck = error.config?.url?.includes('/health');
          const isNotFound = error.response?.status === 404;
          const isServiceUnavailable = error.response?.status === 503;
          const isServerError = error.response?.status === 500;

          // 只在生产环境或者不是健康检查/404/503的情况下才记录错误
          if (isProduction() || !(isHealthCheck || isNotFound || isServiceUnavailable || isServerError)) {
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

  get mail() {
    return this.clients.mail;
  }

  get scm() {
    return this.clients.scm;
  }

  get migration() {
    return this.clients.migration;
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
