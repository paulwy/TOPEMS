import { useAuth } from './useAuth';

export type Role = 'admin' | 'manager' | 'user' | 'guest';

export const useRole = () => {
  const { hasRole, roles, user } = useAuth();

  const checkRole = (role: string): boolean => {
    return hasRole(role);
  };

  const checkAnyRole = (roleList: string[]): boolean => {
    return roleList.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => {
    return user?.is_superuser || hasRole('00000000-0000-0000-0000-000000000001');
  };

  const isManager = (): boolean => {
    return hasRole('00000000-0000-0000-0000-000000000002');
  };

  const isUser = (): boolean => {
    return hasRole('00000000-0000-0000-0000-000000000003');
  };

  const isGuest = (): boolean => {
    return hasRole('00000000-0000-0000-0000-000000000004');
  };

  const getRoleName = (): string => {
    if (isAdmin()) return '管理员';
    if (isManager()) return '部门经理';
    if (isUser()) return '普通员工';
    if (isGuest()) return '访客';
    return '未知角色';
  };

  const getRoleLevel = (): number => {
    if (isAdmin()) return 100;
    if (isManager()) return 75;
    if (isUser()) return 50;
    if (isGuest()) return 25;
    return 0;
  };

  return {
    roles,
    currentRole: getRoleName(),
    roleLevel: getRoleLevel(),
    checkRole,
    checkAnyRole,
    isAdmin,
    isManager,
    isUser,
    isGuest,
    getRoleName,
    getRoleLevel,
  };
};

export default useRole;
