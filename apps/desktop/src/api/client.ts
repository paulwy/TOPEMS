import { createApiClient } from '@topems/api-client';
import { offlineCache } from '../utils/offlineCache';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// 共享工厂：baseURL/timeout/JSON 头/token 注入/401 回调（见 packages/api-client）
// 401 处理（FE-17 修复 desktop 401 静默缺陷）：清本地登录态 + 跳登录页。
// 不直接 import authStore（client.ts ← authStore ← api/index ← client.ts 循环依赖），
// 改为直接清 zustand persist 的 localStorage key + 刷新跳 /login（ProtectedRoute 据空态再守卫）。
const handleUnauthorized = () => {
  try {
    // 工厂 getToken 读取的 key
    localStorage.removeItem('token');
    // zustand persist 持久化 key（store/authStore.ts 配置 name: 'topems-auth'）
    localStorage.removeItem('topems-auth');
  } catch {
    // localStorage 不可用时忽略
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const apiClient = createApiClient({
// P0-3 双轨合一：默认指向唯一对外入口 模块化单体 BFF topems-server:8099
// （原 unified-core 独立进程 8000 前缀直连已在 nginx 层关闭）。仍可用 VITE_API_URL 环境变量覆盖。
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8099',
  getToken: () => localStorage.getItem('token'),
  onUnauthorized: handleUnauthorized,
});

// desktop 独有：GET 离线缓存 + 503 降级（保留在端内）
apiClient.interceptors.request.use(async (config) => {
  if (config.method?.toUpperCase() === 'GET') {
    const cacheKey = config.url + (config.params ? JSON.stringify(config.params) : '');
    const cachedData = await offlineCache.get(cacheKey);
    if (cachedData) {
      config.adapter = () =>
        Promise.resolve({
          data: JSON.parse(cachedData),
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    if (response.config.method?.toUpperCase() === 'GET' && response.status === 200) {
      const cacheKey = response.config.url + (response.config.params ? JSON.stringify(response.config.params) : '');
      await offlineCache.set(cacheKey, JSON.stringify(response.data));
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 503 || error.response?.status === 0) {
      if (error.config.method?.toUpperCase() === 'GET') {
        const cacheKey = error.config.url + (error.config.params ? JSON.stringify(error.config.params) : '');
        const cachedData = await offlineCache.get(cacheKey);
        if (cachedData) {
          return {
            data: JSON.parse(cachedData),
            status: 200,
            statusText: 'Cached',
            headers: {},
            config: error.config,
          };
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
