import { useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '@/api/iam';
import { logger } from '@/utils/logger';

interface AccessLogEntry {
  id?: string;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent: string;
  created_at?: string;
}

export const useAccessLogger = () => {
  const { user } = useAuth();

  const logAccess = useCallback(
    async (
      action: string,
      resource: string,
      options?: {
        resourceId?: string;
        success?: boolean;
        errorMessage?: string;
      }
    ) => {
      if (!user) {
        logger.warn('Cannot log access: no user authenticated');
        return;
      }

      try {
        const userAgent = navigator.userAgent;
        let ipAddress: string | undefined;
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          ipAddress = data.ip;
        } catch (e) {
          logger.warn('Failed to get IP address:', e);
        }

        const logEntry: AccessLogEntry = {
          user_id: user.id,
          username: user.username || user.email || 'unknown',
          action,
          resource,
          resource_id: options?.resourceId,
          success: options?.success ?? true,
          error_message: options?.errorMessage,
          ip_address: ipAddress,
          user_agent: userAgent,
        };

        await authApi.createAccessLog(logEntry);
        logger.info(`Access logged: ${action} on ${resource} by ${user.username}`);
        return true;
      } catch (error: unknown) {
        logger.error('Failed to log access:', error);
        return false;
      }
    },
    [user]
  );

  const logPageView = useCallback(
    async (path: string, title?: string) => {
      return logAccess('page_view', path, { resourceId: title });
    },
    [logAccess]
  );

  const logAction = useCallback(
    async (action: string, resource: string, resourceId?: string) => {
      return logAccess(action, resource, { resourceId });
    },
    [logAccess]
  );

  const logError = useCallback(
    async (action: string, resource: string, errorMessage: string) => {
      return logAccess(action, resource, { success: false, errorMessage });
    },
    [logAccess]
  );

  return { logAccess, logPageView, logAction, logError };
};
