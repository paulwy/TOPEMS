/**
 * @topems/api-client — shared axios client factory.
 *
 * 三端（web/desktop/mobile）共有的 client 基础层：
 * baseURL / timeout / JSON 头 / token 注入 / 401 回调 / paramsSerializer。
 * 各端独有的拦截器（离线缓存、CSRF、telemetry、cancel）保留在各自
 * apps 下 client.ts 中，通过返回的 AxiosInstance 追加注册。
 *
 * 升级原则（FE-17）：新增能力一律**默认关闭**，不传 options = 行为同旧版，
 * 保证逐端/逐服务灰度与一键回滚。
 */
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

// ---------------------------------------------------------------------------
// params 序列化
// ---------------------------------------------------------------------------

/** camelCase → snake_case 单词级转换（不依赖白名单；仅改键名，不动值）。 */
function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** 递归把对象/数组内的键名 camelCase→snake_case（嵌套 params 按需处理）；值原样保留。 */
function snakeCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => snakeCaseKeys(item));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[camelToSnakeKey(k)] = snakeCaseKeys(v);
    }
    return out;
  }
  return value;
}

export interface SerializeParamsOptions {
  /**
   * 是否把 query 键名从 camelCase 转为 snake_case（pageSize→page_size）。
   * 默认 **false** = 原样透传（与历史行为完全一致，回滚安全）。
   * 开启时值不转换；嵌套对象/数组的键名会递归转换。
   */
  snakeCaseParams?: boolean;
}

/**
 * 通用 query 参数序列化：跳过 null/undefined，number/boolean 转字符串。
 * web 端原内联实现，抽到共享包供各端复用。
 *
 * @param params 参数对象
 * @param options.snakeCaseParams camelCase→snake_case 键名转换开关（默认 false）
 */
export function serializeParams(
  params: Record<string, unknown>,
  options: SerializeParamsOptions = {},
): string {
  const { snakeCaseParams = false } = options;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (snakeCaseParams) {
        // FE-18：键名 camelCase→snake_case（pageSize→page_size）；嵌套对象键递归转换
        const outKey = camelToSnakeKey(key);
        const outValue = snakeCaseKeys(value);
        if (typeof outValue === 'number' || typeof outValue === 'boolean') {
          searchParams.set(outKey, outValue.toString());
        } else if (outValue !== null && typeof outValue === 'object') {
          // 嵌套对象/数组：JSON 串化（使转换后的键名可见；优于默认 String()→[object Object]）
          searchParams.set(outKey, JSON.stringify(outValue));
        } else {
          searchParams.set(outKey, String(outValue));
        }
      } else {
        // 默认分支：与旧版逐字节一致（保证回滚安全）
        if (typeof value === 'number' || typeof value === 'boolean') {
          searchParams.set(key, value.toString());
        } else {
          searchParams.set(key, String(value));
        }
      }
    }
  });
  return searchParams.toString();
}

// ---------------------------------------------------------------------------
// factory options
// ---------------------------------------------------------------------------

export interface ApiClientRetryOptions {
  /** 最大重试次数，默认 0 = 不重试（现状）。 */
  maxRetries?: number;
  /** 触发重试的 HTTP 状态码，默认 [429, 500, 502, 503, 504]。 */
  retryOn?: number[];
  /** 退避基数 ms（线性退避：baseDelay × 第几次重试），默认 1000。 */
  baseDelay?: number;
}

export interface ApiClientOptions {
  /** 后端 baseURL（各端从环境变量解析后传入）。 */
  baseURL: string;
  /** 请求超时毫秒，默认 30000。 */
  timeout?: number;
  /** 请求时返回当前 token；返回 null 则不注入 Authorization。 */
  getToken?: () => string | null;
  /** 401 时回调（登出/刷新跳转等由各端实现）。默认不传 = 401 仅原样 reject。 */
  onUnauthorized?: (error: AxiosError) => void;
  /** 额外默认请求头。 */
  headers?: Record<string, string>;
  /** 自定义 params 序列化；缺省用共享 serializeParams。 */
  paramsSerializer?: AxiosRequestConfig['paramsSerializer'];
  /**
   * query 键名 camelCase→snake_case 转换（pageSize→page_size）。
   * 默认 **false** = 原样透传。按服务/client 显式开启做灰度。
   */
  snakeCaseParams?: boolean;
  /**
   * 响应解包：ApiResponse{code,message,data} → 响应拦截器直接返回 data。
   * 默认 **false** = 返回完整 AxiosResponse（现状）。
   */
  unwrapData?: boolean;
  /** 错误归一钩子：reject 前把 AxiosError 归一为业务错误。默认不传 = 原样 reject。 */
  normalizeError?: (error: AxiosError) => unknown;
  /** 重试配置。默认 maxRetries=0 = 不重试（现状）。 */
  retry?: ApiClientRetryOptions;
}

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

/**
 * 创建带 token 注入与 401 感知的 axios 实例。
 * 拦截器注册顺序：request = token 注入（先）；response = 工厂拦截器（先）。
 * 后续在返回值上追加的拦截器排在工厂之后。
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    paramsSerializer:
      options.paramsSerializer ?? {
        serialize: (params) =>
          serializeParams(params as Record<string, unknown>, {
            snakeCaseParams: options.snakeCaseParams ?? false,
          }),
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
    (response) => (options.unwrapData ? response.data : response),
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        options.onUnauthorized?.(error);
      }

      // 重试（默认 maxRetries=0 不进入此分支）
      const retryOpts = options.retry;
      const maxRetries = retryOpts?.maxRetries ?? 0;
      if (maxRetries > 0 && error.config) {
        const cfg = error.config as RetryConfig;
        const status = error.response?.status ?? 0;
        const retryOn = retryOpts?.retryOn ?? [429, 500, 502, 503, 504];
        cfg.__retryCount = cfg.__retryCount ?? 0;
        if (cfg.__retryCount < maxRetries && retryOn.includes(status)) {
          const baseDelay = retryOpts?.baseDelay ?? 1000;
          const delay = baseDelay * (cfg.__retryCount + 1);
          cfg.__retryCount += 1;
          return new Promise((resolve) => setTimeout(resolve, delay)).then(() => client(cfg));
        }
      }

      // 错误归一（默认不开 = 原样 reject）
      if (options.normalizeError) {
        return Promise.reject(options.normalizeError(error));
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export default createApiClient;
