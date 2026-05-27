import apiClient from './client';
import type { ApiResponse } from './client';

export interface PermissionError {
  code: number;
  message: string;
  requiredPermission?: string;
}

export const createPermissionInterceptor = () => {
  Object.entries(apiClient.getClients()).forEach(([name, client]) => {
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const errorMessage = error.response?.data?.message || '权限不足';
          console.warn('Permission denied:', errorMessage);
          
          window.dispatchEvent(new CustomEvent('permission-denied', {
            detail: {
              message: errorMessage,
              requiredPermission: error.response?.data?.requiredPermission,
            }
          }));
        }
        
        // 暂时禁用自动重定向，避免登录后闪退
        // 只在有 token 但认证失败时重定向（不拦截登录页的请求）
        if (error.response?.status === 401) {
          const currentPath = window.location.pathname;
          // 登录页的 401 不处理（避免循环）
          if (currentPath !== '/login' && currentPath !== '/register') {
            if (localStorage.getItem('token')) {
              console.warn('Unauthorized, but not redirecting temporarily - token invalid');
              // 暂时不自动重定向
              // localStorage.removeItem('token');
              // localStorage.removeItem('user');
              // window.location.href = '/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  });
};

export const checkPermissionBeforeRequest = (
  permission: string,
  callback: () => void
) => {
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
  const isSuperuser = JSON.parse(localStorage.getItem('user') || '{}')?.is_superuser;
  
  if (isSuperuser || permissions.includes(permission)) {
    callback();
  } else {
    console.warn(`Permission denied: ${permission}`);
    window.dispatchEvent(new CustomEvent('permission-denied', {
      detail: {
        message: `您没有 ${permission} 权限`,
        requiredPermission: permission,
      }
    }));
  }
};

export const withPermissionCheck = async <T>(
  permission: string,
  apiCall: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: PermissionError }> => {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error: any) {
    if (error.response?.status === 403) {
      return {
        success: false,
        error: {
          code: 403,
          message: error.response?.data?.message || '权限不足',
          requiredPermission: permission,
        }
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
      console.warn('Cannot log access: user not authenticated');
      return;
    }

    await apiClient.iam.post('/api/v1/access-logs', {
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
  } catch (error) {
    console.error('Failed to log permission access:', error);
  }
};

export default createPermissionInterceptor;
