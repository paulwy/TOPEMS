/**
 * CRUD 表单状态管理 hook
 *
 * 封装创建/编辑表单的通用状态（打开/关闭/当前记录/加载态），
 * 同时支持 dialog 和 drawer 两种编辑模式，消除样板代码。
 *
 * @example
 * ```tsx
 * const form = useCrudForm<Supplier>({
 *   entityName: '供应商',
 *   onCreate: async (data) => {
 *     await supplierApi.create(data);
 *   },
 *   onUpdate: async (id, data) => {
 *     await supplierApi.update(id, data);
 *   },
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.SUPPLIERS_BASE ,
  exact: false,
  refetchType: 'active',
});
 *   },
 * });
 *
 * // 打开创建表单
 * form.openCreate();
 *
 * // 打开编辑表单
 * form.openEdit(record);
 *
 * // 提交
 * form.submit(formData);
 *
 * // 配合 FormDrawer 使用
 * <FormDrawer
 *   open={form.open}
 *   title={form.mode === 'create' ? '新增供应商' : '编辑供应商'}
 *   onClose={form.close}
 *   onSubmit={() => form.submit(currentData)}
 *   loading={form.submitting}
 * />
 * ```
 */

import { useState, useCallback } from 'react';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export type CrudFormMode = 'create' | 'view' | 'edit';

export interface UseCrudFormOptions<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** 实体名称（用于通知消息，如"用户"、"客户"） */
  entityName: string;
  /** 创建函数 */
  onCreate?: (data: TCreate) => Promise<unknown>;
  /** 更新函数（接收 id + data） */
  onUpdate?: (id: string | number, data: TUpdate) => Promise<unknown>;
  /** 成功回调（创建或更新成功后） */
  onSuccess?: (data?: unknown) => void;
  /** 失败回调 */
  onError?: (error: Error) => void;
  /** 是否显示成功通知，默认 true */
  showSuccessNotification?: boolean;
  /** 是否显示失败通知，默认 true */
  showErrorNotification?: boolean;
  /** 成功后是否自动关闭表单，默认 true */
  closeOnSuccess?: boolean;
}

export interface UseCrudFormResult<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** 表单是否打开 */
  open: boolean;
  /** 表单模式：创建 / 查看 / 编辑 */
  mode: CrudFormMode;
  /** 当前编辑的记录（创建模式下为 null） */
  currentRecord: T | null;
  /** 是否正在提交 */
  submitting: boolean;
  /** 当前记录的 id（编辑/查看模式下） */
  id: string | number | null;
  /** 是否为只读模式（view 模式） */
  isReadOnly: boolean;
  /** 是否为创建模式 */
  isCreate: boolean;
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 是否为查看模式 */
  isView: boolean;
  /** 打开创建表单 */
  openCreate: () => void;
  /** 打开查看表单 */
  openView: (record: T) => void;
  /** 打开编辑表单 */
  openEdit: (record: T) => void;
  /** 关闭表单 */
  close: () => void;
  /** 提交表单 */
  submit: (data: TCreate | TUpdate) => Promise<boolean>;
  /** 重置表单状态（关闭并清空当前记录） */
  reset: () => void;
  /** 设置当前记录 */
  setCurrentRecord: (record: T | null) => void;
}

export function useCrudForm<T = any, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: UseCrudFormOptions<T, TCreate, TUpdate>
): UseCrudFormResult<T, TCreate, TUpdate> {
  const {
    entityName,
    onCreate,
    onUpdate,
    onSuccess,
    onError,
    showSuccessNotification = true,
    showErrorNotification = true,
    closeOnSuccess = true,
  } = options;

  const addNotification = useNotificationStore((state) => state.addNotification);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CrudFormMode>('create');
  const [currentRecord, setCurrentRecord] = useState<T | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = useCallback(() => {
    setCurrentRecord(null);
    setMode('create');
    setOpen(true);
  }, []);

  const openView = useCallback((record: T) => {
    setCurrentRecord(record);
    setMode('view');
    setOpen(true);
  }, []);

  const openEdit = useCallback((record: T) => {
    setCurrentRecord(record);
    setMode('edit');
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const reset = useCallback(() => {
    setOpen(false);
    setCurrentRecord(null);
    setMode('create');
    setSubmitting(false);
  }, []);

  const submit = useCallback(
    async (data: TCreate | TUpdate): Promise<boolean> => {
      if (submitting) return false;

      setSubmitting(true);
      try {
        let result: unknown;

        if (mode === 'create') {
          if (!onCreate) {
            throw new Error('onCreate function is not provided');
          }
          result = await onCreate(data as TCreate);
          if (showSuccessNotification) {
            addNotification({
              title: i18n.t('shared.use_crud_form.k0'),
              message: `${i18n.t('shared.use_crud_form.k0')}${entityName}`,
              type: 'success',
            });
          }
        } else if (mode === 'edit') {
          if (!onUpdate) {
            throw new Error('onUpdate function is not provided');
          }
          if (!currentRecord) {
            throw new Error('No record selected for editing');
          }
          const id = (currentRecord as unknown as Record<string, unknown>).id as string | number;
          result = await onUpdate(id, data as TUpdate);
          if (showSuccessNotification) {
            addNotification({
              title: i18n.t('shared.use_crud_form.k1'),
              message: `${i18n.t('shared.use_crud_form.k1')}${entityName}`,
              type: 'success',
            });
          }
        }

        onSuccess?.(result);
        if (closeOnSuccess) {
          setOpen(false);
        }
        return true;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        apiLogger.error(`Failed to ${mode} ${entityName}:`, err);

        if (showErrorNotification) {
          addNotification({
            title: i18n.t('shared.use_crud_form.k2'),
            message:
              extractErrorMessage(err) || `${mode === 'create' ? i18n.t('shared.use_crud_form.k4') : i18n.t('shared.use_crud_form.k3')}${entityName}${i18n.t('shared.use_crud_form.k2')}`,
            type: 'error',
          });
        }
        onError?.(err);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      mode,
      onCreate,
      onUpdate,
      currentRecord,
      entityName,
      showSuccessNotification,
      showErrorNotification,
      onSuccess,
      onError,
      closeOnSuccess,
      addNotification,
    ]
  );

  const id = currentRecord
    ? ((currentRecord as unknown as Record<string, unknown>).id as string | number)
    : null;
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isReadOnly = isView;

  return {
    open,
    mode,
    currentRecord,
    submitting,
    id,
    isReadOnly,
    isCreate,
    isEdit,
    isView,
    openCreate,
    openView,
    openEdit,
    close,
    submit,
    reset,
    setCurrentRecord,
  };
}

export default useCrudForm;
