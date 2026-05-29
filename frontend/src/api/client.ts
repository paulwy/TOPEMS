import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import config from '../config/runtime';
import createLogger from '../utils/logger';

const logger = createLogger('ApiClient');

export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
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
      const timeout = name === "ai" ? AI_TIMEOUT : DEFAULT_TIMEOUT;
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
          logger.error('Request error:', error);
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response: AxiosResponse) => {
          return response.data;
        },
        (error) => {
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
          logger.error('Response error:', error);
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

  setAuthToken(token: string) {
    Object.values(this.clients).forEach(client => {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    });
  }

  clearAuthToken() {
    Object.values(this.clients).forEach(client => {
      delete client.defaults.headers.common['Authorization'];
    });
  }

  getClients() {
    return this.clients;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
