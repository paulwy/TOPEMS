import { useState, useCallback } from 'react';

export type FormMode = 'create' | 'edit' | 'view';

export interface UseListPageFormOptions<T> {
  formFields?: Array<{
    key: string;
    hideInCreate?: boolean;
    hideInEdit?: boolean;
    defaultValue?: unknown;
  }>;
}

/**
 * ListPage 表单状态管理 hook
 * 从 ListPageTemplate 抽出，保持 API 兼容
 */
export function useListPageForm<T>(options: UseListPageFormOptions<T> = {}) {
  const { formFields } = options;

  // ============ 表单状态 ============
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [currentRecord, setCurrentRecord] = useState<T | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 从 formFields 构建初始表单数据
  const buildInitialFormData = useCallback(
    (mode: FormMode, record?: T): Record<string, unknown> => {
      if (!formFields) return {};
      const data: Record<string, unknown> = {};
      const recordData = record as Record<string, unknown> | undefined;
      formFields.forEach((field) => {
        if (mode === 'create' && field.hideInCreate) return;
        if (mode === 'edit' && field.hideInEdit) return;
        if (mode === 'view' && field.hideInEdit) return;
        data[field.key] = recordData?.[field.key] ?? field.defaultValue ?? '';
      });
      return data;
    },
    [formFields]
  );

  // 打开创建表单
  const openCreateForm = useCallback(() => {
    setFormMode('create');
    setCurrentRecord(null);
    setFormData(buildInitialFormData('create'));
    setFormErrors({});
    setFormOpen(true);
  }, [buildInitialFormData]);

  // 打开编辑表单
  const openEditForm = useCallback(
    (record: T) => {
      setFormMode('edit');
      setCurrentRecord(record);
      setFormData(buildInitialFormData('edit', record));
      setFormErrors({});
      setFormOpen(true);
    },
    [buildInitialFormData]
  );

  // 关闭表单
  const closeForm = useCallback(() => {
    setFormOpen(false);
    setCurrentRecord(null);
    setFormData({});
    setFormErrors({});
    setFormSubmitting(false);
  }, []);

  // 更新表单字段
  const updateFormField = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return {
    // 状态
    formOpen,
    formMode,
    currentRecord,
    formSubmitting,
    formData,
    formErrors,
    // Setter
    setFormOpen,
    setFormMode,
    setCurrentRecord,
    setFormSubmitting,
    setFormData,
    setFormErrors,
    // 动作
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormField,
    buildInitialFormData,
  };
}
