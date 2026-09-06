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
const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  getToken: () => localStorage.getItem('token'),
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
