/**
 * 财务模块React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/utils/errors';
import type { Account } from '@/types/finance';
import { accountApi } from '@/api/finance';
import { useNotification } from './useNotification';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

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
    queryKey: [...QUERY_KEYS.AD_HOC.ACCOUNTS_BASE, params],
    queryFn: () => accountApi.list(params),

    staleTime: CACHE_DURATIONS.MEDIUM,
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
    queryKey: [...QUERY_KEYS.AD_HOC.ACCOUNTS_TREE_BASE, params],
    queryFn: () => accountApi.getTree(params),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 获取科目详情
 */
export const useAccount = (id: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.ACCOUNT_BASE, id],
    queryFn: () => accountApi.get(id),
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
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
    queryKey: [...QUERY_KEYS.AD_HOC.ACCOUNT_BALANCES_BASE, params],
    queryFn: () => accountApi.getBalances(params),
    enabled: !!params.period,

    staleTime: CACHE_DURATIONS.MEDIUM,
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
    queryKey: [...QUERY_KEYS.AD_HOC.OPENING_BALANCES_BASE, params],
    queryFn: () => accountApi.getOpeningBalances(params),
    enabled: !!params.period,

    staleTime: CACHE_DURATIONS.MEDIUM,
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_TREE_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_finance.k0'));
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, i18n.t('shared.use_finance.k1')));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_TREE_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_finance.k2'));
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, i18n.t('shared.use_finance.k3')));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNTS_TREE_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_finance.k4'));
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, i18n.t('shared.use_finance.k5')));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.OPENING_BALANCES_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNT_BALANCES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_finance.k6'));
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, i18n.t('shared.use_finance.k7')));
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.OPENING_BALANCES_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ACCOUNT_BALANCES_BASE,
        exact: false,
        refetchType: 'active',
      });
      success(i18n.t('shared.use_finance.k8'));
    },
    onError: (error) => {
      notifyError(extractErrorMessage(error, i18n.t('shared.use_finance.k9')));
    },
  });
};
