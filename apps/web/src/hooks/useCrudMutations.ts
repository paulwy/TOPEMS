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
  deleteFn: (id: TDelete) => Promise<unknown>;
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

export function useCrudMutations<TCreate, TUpdate, TDelete = string | number>(
  options: UseCrudMutationsOptions<TCreate, TUpdate, TDelete>
) {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
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

  const notifySuccess = useCallback(
    (action: string) => {
      if (showNotifications) {
        addNotification({
          type: 'success',
          message: i18n.t('common.crud.success', { action, entity: entityName }),
        });
      }
    },
    [addNotification, entityName, showNotifications]
  );

  const notifyError = useCallback(
    (action: string, error: unknown) => {
      const message = extractErrorMessage(error);
      apiLogger.error(`CRUD ${action} failed for ${entityName}`, error);
      if (showNotifications) {
        addNotification({
          type: 'error',
          message: i18n.t('common.crud.error', { action, entity: entityName, error: message }),
        });
      }
    },
    [addNotification, entityName, showNotifications]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeyToInvalidate,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient, queryKeyToInvalidate]);

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: (data) => {
      invalidate();
      notifySuccess(i18n.t('common.crud.action.create'));
      onCreateSuccess?.(data);
    },
    onError: (error) => {
      notifyError(i18n.t('common.crud.action.create'), error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: (data) => {
      invalidate();
      notifySuccess(i18n.t('common.crud.action.update'));
      onUpdateSuccess?.(data);
    },
    onError: (error) => {
      notifyError(i18n.t('common.crud.action.update'), error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: (data) => {
      invalidate();
      notifySuccess(i18n.t('common.crud.action.delete'));
      onDeleteSuccess?.(data);
    },
    onError: (error) => {
      notifyError(i18n.t('common.crud.action.delete'), error);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

export type { UseCrudMutationsOptions };
