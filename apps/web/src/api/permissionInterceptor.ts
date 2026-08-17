import apiClient from './client';
import { apiLogger } from '@/utils/logger';
import i18n from '@/i18n';

export interface PermissionError {
  code: number;
  message: string;
  requiredPermission?: string;
}

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

export const checkPermissionBeforeRequest = (permission: string, callback: () => void) => {
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  const isSuperuser = JSON.parse(localStorage.getItem('user') || '{}')?.is_superuser;

  if (isSuperuser || permissions.includes(permission)) {
    callback();
  } else {
    apiLogger.warn(`Permission denied: ${permission}`);
    window.dispatchEvent(
      new CustomEvent('permission-denied', {
        detail: {
          message: `${i18n.t('shared.permission_interceptor.k2')}${permission}${i18n.t('shared.permission_interceptor.k3')}`,
          requiredPermission: permission,
        },
      })
    );
  }
};

export const withPermissionCheck = async <T>(
  permission: string,
  apiCall: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: PermissionError }> => {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } } };
    if (err.response?.status === 403) {
      return {
        success: false,
        error: {
          code: 403,
          message: err.response?.data?.message || i18n.t('shared.permission_interceptor.k1'),
          requiredPermission: permission,
        },
      };
    }
    throw error;
  }
};

export const logPermissionAccess = async (
  action: string,
  resource: string,
  success: boolean,
  errorMessage?: string
) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.id) {
      apiLogger.warn('Cannot log access: user not authenticated');
      return;
    }

    await apiClient.iam.post('/access-logs', {
      user_id: user.id,
      username: user.username,
      action,
      resource,
      success,
      error_message: errorMessage,
      ip_address: undefined,
      user_agent: navigator.userAgent,
      resource_id: undefined,
    });
  } catch (error: unknown) {
    apiLogger.error('Failed to log permission access:', error);
  }
};

export default createPermissionInterceptor;
