import apiClient from './client';
import { apiLogger } from '@/utils/logger';
import i18n from '@/i18n';

export const createPermissionInterceptor = () => {
  Object.entries(apiClient.getClients()).forEach(([, client]) => {
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const errorMessage =
            error.response?.data?.message || i18n.t('shared.permission_interceptor.k0');
          apiLogger.warn('Permission denied:', errorMessage);

          window.dispatchEvent(
            new CustomEvent('permission-denied', {
              detail: {
                message: errorMessage,
                requiredPermission: error.response?.data?.requiredPermission,
              },
            })
          );
        }

        // 注意：401 错误已在 client.ts 的主拦截器中统一处理
        // 此处只记录额外调试信息，避免重复处理导致 token 被清除两次
        if (error.response?.status === 401) {
          const currentPath = window.location.pathname;
          const hasToken = !!localStorage.getItem('token');

          apiLogger.warn(
            `${i18n.t('shared.permission_interceptor.3401_0')}${error.config?.url || ''}`,
            {
              currentPath,
              hasToken,
              note: i18n.t('shared.permission_interceptor.k1'),
              handledByPrimaryInterceptor: true,
              timestamp: new Date().toISOString(),
            }
          );
        }

        return Promise.reject(error);
      }
    );
  });
};

export default createPermissionInterceptor;
