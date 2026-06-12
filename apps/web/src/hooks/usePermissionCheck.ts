import { useCallback } from "react";
import { authApi } from "../api/iam";
import { useAuth } from "./useAuth";

export const usePermissionCheck = () => {
  const { hasPermission } = useAuth();

  const checkPermissionFromServer = useCallback(async (permission: string) => {
    try {
      const response = await authApi.checkPermission(permission);
      return response.success && response.data?.allowed;
    } catch (error) {
      console.error("Permission check error:", error);
      return false;
    }
  }, []);

  const checkPermissionsBatch = useCallback(
    async (permissions: string[]) => {
      try {
        const results = await Promise.all(
          permissions.map((perm) => checkPermissionFromServer(perm)),
        );
        return {
          allowed: results.every((r) => r),
          results: permissions.reduce(
            (acc, perm, idx) => {
              acc[perm] = !!results[idx];
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        };
      } catch (error) {
        console.error("Batch permission check error:", error);
        return {
          allowed: false,
          results: permissions.reduce(
            (acc, perm) => {
              acc[perm] = false;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        };
      }
    },
    [checkPermissionFromServer],
  );

  const logAccess = useCallback(
    async (
      action: string,
      resource: string,
      success: boolean,
      errorMessage?: string,
    ) => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        await authApi.createAccessLog({
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
        console.error("Failed to log access:", error);
      }
    },
    [],
  );

  return {
    hasPermission,
    checkPermissionFromServer,
    checkPermissionsBatch,
    logAccess,
  };
};

export default usePermissionCheck;
