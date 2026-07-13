import axios from 'axios';
import { offlineCache } from '../utils/offlineCache';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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