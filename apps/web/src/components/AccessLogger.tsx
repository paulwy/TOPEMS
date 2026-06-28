import type React from 'react';
import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '@/api/iam';
import { logger } from '@/utils/logger';

export interface AccessLogEntry {
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

interface AccessLoggerProps {
  action: string;
  resource: string;
  resourceId?: string;
  autoLog?: boolean;
  onLogSuccess?: () => void;
  onLogError?: (error: unknown) => void;
}

export const AccessLogger: React.FC<AccessLoggerProps> = ({
  action,
  resource,
  resourceId,
  autoLog = true,
  onLogSuccess,
  onLogError,
}) => {
  const { user } = useAuth();
  const [_isLogging, setIsLogging] = useState(false);

  const logAccess = useCallback(
    async (success: boolean = true, errorMessage?: string) => {
      if (!user) {
        logger.warn('Cannot log access: no user authenticated');
        return;
      }

      setIsLogging(true);
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
          resource_id: resourceId,
          success,
          error_message: errorMessage,
          ip_address: ipAddress,
          user_agent: userAgent,
        };

        await authApi.createAccessLog(logEntry);
        logger.info(`Access logged: ${action} on ${resource} by ${user.username}`);

        if (onLogSuccess) {
          onLogSuccess();
        }
      } catch (error: unknown) {
        logger.error('Failed to log access:', error);
        if (onLogError) {
          onLogError(error);
        }
      } finally {
        setIsLogging(false);
      }
    },
    [user, action, resource, resourceId, onLogSuccess, onLogError]
  );

  useEffect(() => {
    if (autoLog) {
      logAccess(true);
    }
  }, [autoLog, logAccess]);

  return null;
};

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

export const PageAccessLogger: React.FC<{ path: string; title?: string }> = ({ path, title }) => {
  const { logPageView } = useAccessLogger();

  useEffect(() => {
    logPageView(path, title);
  }, [path, title, logPageView]);

  return null;
};

export const ActionLogger: React.FC<{ action: string; resource: string; resourceId?: string }> = ({
  action,
  resource,
  resourceId,
}) => {
  const { logAction } = useAccessLogger();

  useEffect(() => {
    logAction(action, resource, resourceId);
  }, [action, resource, resourceId, logAction]);

  return null;
};
