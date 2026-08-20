/**
 * CRUD Mutation 管理 hook
 *
 * 封装 create / update / delete 三个常用 mutation + invalidateQueries + 通知，
 * 消除 100+ 文件中重复的 useMutation + onSuccess(invalidate + notify) 样板代码。
 *
 * @example
 * ```tsx
 * const mutations = useCrudMutations({
 *   queryKeyToInvalidate: QUERY_KEYS.IAM.USERS,
 *   createFn: (data) => authApi.createUser(data),
 *   updateFn: ({ id, data }) => authApi.updateUser(id, data),
 *   deleteFn: (id) => authApi.deleteUser(id),
 *   entityName: '用户',
 * });
 *
 * mutations.createMutation.mutate(data);
 * mutations.updateMutation.mutate({ id, data });
 * mutations.deleteMutation.mutate(id);
 * ```
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import i18n from '@/i18n';

interface UseCrudMutationsOptions<TCreate, TUpdate, TDelete> {
  /** 创建成功后需要 invalidate 的 query key */
  queryKeyToInvalidate: QueryKey;
  /** 创建函数 */
  createFn: (data: TCreate) => Promise<unknown>;
  /** 更新函数（接收 id + data） */
  updateFn: (args: { id: string | number; data: TUpdate }) => Promise<unknown>;
  /** 删除函数 */
  deleteFn: (id: string | number) => Promise<unknown>;
  /** 实体名称（用于通知消息，如"用户"、"客户"） */
  entityName: string;
  /** 是否在操作成功后自动显示通知，默认 true */
  showNotifications?: boolean;
  /** 创建成功后的额外回调 */
  onCreateSuccess?: (data: unknown) => void;
  /** 更新成功后的额外回调 */
  onUpdateSuccess?: (data: unknown) => void;
  /** 删除成功后的额外回调 */
  onDeleteSuccess?: (data: unknown) => void;
}

interface UseCrudMutationsResult<TCreate, TUpdate> {
  createMutation: ReturnType<typeof useMutation<unknown, Error, TCreate, unknown>>;
  updateMutation: ReturnType<
    typeof useMutation<unknown, Error, { id: string | number; data: TUpdate }, unknown>
  >;
  deleteMutation: ReturnType<typeof useMutation<unknown, Error, string | number, unknown>>;
}

/**
 * CRUD Mutation 管理 hook
 *
 * 自动处理：
 * - 成功后 invalidateQueries
 * - 成功/失败通知
 * - 错误日志
 */
export function useCrudMutations<TCreate, TUpdate, TDelete>(
  options: UseCrudMutationsOptions<TCreate, TUpdate, TDelete>
): UseCrudMutationsResult<TCreate, TUpdate> {
  const {
    queryKeyToInvalidate,
    createFn,
    updateFn,
    deleteFn,
    entityName,
    showNotifications = true,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
  } = options;

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const notifySuccess = useCallback(
    (message: string) => {
      if (showNotifications) {
        addNotification({
          title: i18n.t('shared.use_crud_mutations.k0'),
          message,
          type: 'success',
        });
      }
    },
    [addNotification, showNotifications]
  );

  const notifyError = useCallback(
    (action: string, err: unknown) => {
      apiLogger.error(`${entityName}${action}${i18n.t('shared.use_crud_mutations.k0')}`, err);
      if (showNotifications) {
        addNotification({
          title: i18n.t('shared.use_crud_mutations.k1'),
          message: extractErrorMessage(
            err,
            `${entityName}${action}${i18n.t('shared.use_crud_mutations.k1')}`
          ),
          type: 'error',
        });
      }
    },
    [entityName, addNotification, showNotifications]
  );

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeyToInvalidate,
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(`${entityName}${i18n.t('shared.use_crud_mutations.k2')}`);
      onCreateSuccess?.(data);
    },
    onError: (err) => notifyError(i18n.t('shared.use_crud_mutations.k2'), err),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeyToInvalidate,
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(`${entityName}${i18n.t('shared.use_crud_mutations.k3')}`);
      onUpdateSuccess?.(data);
    },
    onError: (err) => notifyError(i18n.t('shared.use_crud_mutations.k3'), err),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeyToInvalidate,
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(`${entityName}${i18n.t('shared.use_crud_mutations.k4')}`);
      onDeleteSuccess?.(data);
    },
    onError: (err) => notifyError(i18n.t('shared.use_crud_mutations.k4'), err),
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
