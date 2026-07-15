import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface RequestConfig extends AxiosRequestConfig {
  baseURL?: string;
}

// 环境检测
const isBrowser = typeof window !== 'undefined';

const createRequestClient = (config?: RequestConfig): AxiosInstance => {
  const client = axios.create({
    baseURL: config?.baseURL || '',
    timeout: config?.timeout || 10000,
    ...config,
  });

  // 请求拦截器 - 添加 token
  client.interceptors.request.use(
    (config) => {
      if (!isBrowser) {
        return config;
      }

      const url = config.url || '';
      // 公开路径不需要认证
      const publicPaths = [
        '/health',
        // 新路径（K8s Ingress 契约，V9 起首选）
        '/api/core/iam/auth/login',
        '/api/core/iam/auth/register',
        '/api/core/iam/auth/refresh',
        '/api/core/iam/auth/forgot-password',
        // 兼容旧路径（向后兼容，至少一个大版本）
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/refresh',
      ];
      const isPublic = publicPaths.some((path) => url.startsWith(path));

      if (!isPublic) {
        const token = localStorage.getItem('token');
        if (token && !config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 响应拦截器 - 处理错误
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response?.status === 401 && isBrowser) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// 默认 client（无 baseURL）
export const request = createRequestClient();

// 带 baseURL 的 factory
export const createRequest = (baseURL: string, timeout = 10000) =>
  createRequestClient({ baseURL, timeout });

export default request;
