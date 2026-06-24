/**
 * 财务模块React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@/types/finance';
import { accountApi } from '@/api/finance';
import { useNotification } from './useNotification';

// ============================================
// 一、科目管理Hook
// ============================================

/**
 * 获取科目列表
 */
export const useAccounts = (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  company_id?: string;
  is_detail?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => accountApi.list(params),
  });
};

/**
 * 获取科目树
 */
export const useAccountTree = (params?: {
  category?: string;
  status?: string;
  include_disabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounts-tree', params],
    queryFn: () => accountApi.getTree(params),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 获取科目详情
 */
export const useAccount = (id: string) => {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => accountApi.get(id),
    enabled: !!id,
  });
};

/**
 * 获取科目余额
 */
export const useAccountBalances = (params: {
  account_ids?: string[];
  period: string;
  company_id?: string;
  department_id?: string;
  project_id?: string;
}) => {
  return useQuery({
    queryKey: ['account-balances', params],
    queryFn: () => accountApi.getBalances(params),
    enabled: !!params.period,
  });
};

/**
 * 获取科目期初余额
 */
export const useOpeningBalances = (params: {
  period: string;
  account_ids?: string[];
  company_id?: string;
}) => {
  return useQuery({
    queryKey: ['opening-balances', params],
    queryFn: () => accountApi.getOpeningBalances(params),
    enabled: !!params.period,
  });
};

/**
 * 创建科目
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (data: Partial<Account>) => accountApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      success('科目创建成功');
    },
    onError: (error: any) => {
      notifyError(error.message || '科目创建失败');
    },
  });
};

/**
 * 更新科目
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) =>
      accountApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      success('科目更新成功');
    },
    onError: (error: any) => {
      notifyError(error.message || '科目更新失败');
    },
  });
};

/**
 * 删除科目
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => accountApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      success('科目删除成功');
    },
    onError: (error: any) => {
      notifyError(error.message || '科目删除失败');
    },
  });
};

/**
 * 设置期初余额
 */
export const useSetOpeningBalance = () => {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: string;
      data: Partial<{
        debit_balance: number;
        credit_balance: number;
        quantity?: number;
        period: string;
      }>;
    }) => accountApi.setOpeningBalance(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      success('期初余额设置成功');
    },
    onError: (error: any) => {
      notifyError(error.message || '期初余额设置失败');
    },
  });
};

/**
 * 结转期初余额
 */
export const useCarryForwardOpeningBalance = () => {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  return useMutation({
    mutationFn: (params: { from_period: string; to_period: string; company_id?: string }) =>
      accountApi.carryForwardOpeningBalance(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      success('期初余额结转成功');
    },
    onError: (error: any) => {
      notifyError(error.message || '期初余额结转失败');
    },
  });
};
