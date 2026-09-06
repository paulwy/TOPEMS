/**
 * @topems/api-client — shared axios client factory.
 *
 * 三端（web/desktop/mobile）共有的 client 基础层：
 * baseURL / timeout / JSON 头 / token 注入 / 401 回调。
 * 各端独有的拦截器（离线缓存、CSRF、telemetry、cancel）保留在各自
 * apps 下 client.ts 中，通过返回的 AxiosInstance 追加注册。
 */
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

export interface ApiClientOptions {
  /** 后端 baseURL（各端从环境变量解析后传入）。 */
  baseURL: string;
  /** 请求超时毫秒，默认 30000。 */
  timeout?: number;
  /** 请求时返回当前 token；返回 null 则不注入 Authorization。 */
  getToken?: () => string | null;
  /** 401 时回调（登出/刷新跳转等由各端实现）。 */
  onUnauthorized?: (error: AxiosError) => void;
  /** 额外默认请求头。 */
  headers?: Record<string, string>;
}

/**
 * 创建带 token 注入与 401 感知的 axios 实例。
 * 拦截器注册顺序：request = token 注入（先）；response = 401 回调（先）。
 * 后续在返回值上追加的拦截器排在 token 注入之后。
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = options.getToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        options.onUnauthorized?.(error);
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export default createApiClient;
