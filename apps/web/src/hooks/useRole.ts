import { useAuth } from './useAuth';
import { useCallback, useMemo } from 'react';
import i18n from '@/i18n';

export type Role = 'admin' | 'manager' | 'user' | 'guest';

export const useRole = () => {
  const { hasRole, roles, user } = useAuth();

  const checkRole = useCallback(
    (role: string): boolean => {
      return hasRole(role);
    },
    [hasRole]
  );

  const checkAnyRole = useCallback(
    (roleList: string[]): boolean => {
      return roleList.some((role) => hasRole(role));
    },
    [hasRole]
  );

  const isAdmin = useCallback((): boolean => {
    return user?.is_superuser || hasRole('admin');
  }, [user?.is_superuser, hasRole]);

  const isManager = useCallback((): boolean => {
    return hasRole('manager');
  }, [hasRole]);

  const isUser = useCallback((): boolean => {
    return hasRole('user');
  }, [hasRole]);

  const isGuest = useCallback((): boolean => {
    return hasRole('guest');
  }, [hasRole]);

  const getRoleName = useCallback((): string => {
    if (user?.is_superuser || hasRole('admin')) return i18n.t('shared.use_role.k0');
    if (hasRole('manager')) return i18n.t('shared.use_role.k1');
    if (hasRole('user')) return i18n.t('shared.use_role.k2');
    if (hasRole('guest')) return i18n.t('shared.use_role.k3');
    return i18n.t('shared.use_role.k4');
  }, [user?.is_superuser, hasRole]);

  const getRoleLevel = useCallback((): number => {
    if (user?.is_superuser || hasRole('admin')) return 100;
    if (hasRole('manager')) return 75;
    if (hasRole('user')) return 50;
    if (hasRole('guest')) return 25;
    return 0;
  }, [user?.is_superuser, hasRole]);

  const currentRole = useMemo(() => {
    if (user?.is_superuser || hasRole('admin')) return i18n.t('shared.use_role.k5');
    if (hasRole('manager')) return i18n.t('shared.use_role.k6');
    if (hasRole('user')) return i18n.t('shared.use_role.k7');
    if (hasRole('guest')) return i18n.t('shared.use_role.k8');
    return i18n.t('shared.use_role.k9');
  }, [user?.is_superuser, hasRole]);

  const roleLevel = useMemo(() => {
    if (user?.is_superuser || hasRole('admin')) return 100;
    if (hasRole('manager')) return 75;
    if (hasRole('user')) return 50;
    if (hasRole('guest')) return 25;
    return 0;
  }, [user?.is_superuser, hasRole]);

  // 避免引用稳定化
  return useMemo(
    () => ({
      roles,
      currentRole,
      roleLevel,
      checkRole,
      checkAnyRole,
      isAdmin,
      isManager,
      isUser,
      isGuest,
      getRoleName,
      getRoleLevel,
    }),
    [
      roles,
      currentRole,
      roleLevel,
      checkRole,
      checkAnyRole,
      isAdmin,
      isManager,
      isUser,
      isGuest,
      getRoleName,
      getRoleLevel,
    ]
  );
};

export default useRole;
