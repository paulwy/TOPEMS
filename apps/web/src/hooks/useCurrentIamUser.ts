import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/iam';

/**
 * 当前登录用户在 IAM 中的档案（姓名/邮箱/部门）。
 * 移动端多数页面只持登录态 id/role，姓名需回源 /iam/users/me，禁止写死或留空。
 */
export const useCurrentIamUser = () => {
  const { data } = useQuery({
    queryKey: ['iam-current-user'],
    queryFn: () => authApi.getCurrentUser().then((res) => res.data ?? null),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return data;
};
