/**
 * V44.0 Track D: 页面级 BFF Hooks
 *
 * 提供完整页面级逻辑封装：
 * - useBffListPage: 列表页完整逻辑（搜索/过滤/分页/批量操作）
 * - useBffDetailPage: 详情页完整逻辑（加载/编辑/删除/关联数据）
 * - useBffFormPage: 表单页完整逻辑（创建/更新/验证/提交）
 *
 * 所有 hooks 返回统一的 pageState + actions 结构。
 */

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';
import useBffCrud from './useBffCrud';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import i18n from '@/i18n';

// ============ 通用类型 ============

interface PageStateStatus {
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  isDeleting: boolean;
}

// ============ useBffListPage ============

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'textarea'
    | 'select'
    | 'date'
    | 'checkbox'
    | 'switch'
    | 'autocomplete'
    | 'file'
    | 'image';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: unknown) => string | null;
  };
  defaultValue?: unknown;
  gridSpan?: number;
  helperText?: string;
}

export interface UseBffFormPageOptions<T> {
  entityType: string;
  service: string;
  mode: 'create' | 'edit';
  entityId?: string;
  queryKey: unknown[];
  fieldConfig: FormFieldConfig[];
  initialData?: Partial<T>;
  entityName?: string;
  /** 乐观更新 */
  optimisticUpdate?: boolean;
  /** 提交成功回调 */
  onSuccess?: (data: T) => void;
  /** 提交失败回调 */
  onError?: (error: Error) => void;
}

export interface UseBffFormPageResult<T> {
  pageState: {
    mode: 'create' | 'edit';
    data: Partial<T> | null;
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isDirty: boolean;
    isValid: boolean;
    errors: Record<string, string>;
  };
  actions: {
    setFieldValue: (name: string, value: unknown) => void;
    setValues: (values: Partial<T>) => void;
    reset: () => void;
    validate: () => boolean;
    validateField: (name: string) => string | null;
    submit: () => Promise<T | null>;
    loadInitialData: () => Promise<void>;
  };
}

export function useBffFormPage<T extends { id?: string }>(
  options: UseBffFormPageOptions<T>
): UseBffFormPageResult<T> {
  const {
    entityType,
    service,
    mode,
    entityId,
    queryKey,
    fieldConfig,
    initialData: initialDataProp,
    entityName,
    onSuccess,
    onError,
  } = options;

  const queryClient = useQueryClient();

  const crud = useBffCrud<T>({
    service,
    entityType,
    queryKey,
    autoFetch: false,
    entityName,
  });

  const [formData, setFormData] = useState<Partial<T>>((initialDataProp as Partial<T>) ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const setFieldValue = useCallback((name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }) as Partial<T>);
    setIsDirty(true);
  }, []);

  const setValues = useCallback((values: Partial<T>) => {
    setFormData(values);
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    setFormData((initialDataProp as Partial<T>) ?? {});
    setErrors({});
    setIsDirty(false);
  }, [initialDataProp]);

  const validateField = useCallback(
    (name: string): string | null => {
      const field = fieldConfig.find((f) => f.name === name);
      if (!field) return null;

      const value = formData[name as keyof T];
      const validation = field.validation;

      if (!validation) return null;

      if (validation.required && (value === undefined || value === null || value === '')) {
        return `${field.label}${i18n.t('shared.use_bff_page.k0')}`;
      }

      if (
        validation.minLength &&
        typeof value === 'string' &&
        value.length < validation.minLength
      ) {
        return `${field.label}${i18n.t('shared.use_bff_page.k1')}${validation.minLength}${i18n.t('shared.use_bff_page.k2')}`;
      }

      if (
        validation.maxLength &&
        typeof value === 'string' &&
        value.length > validation.maxLength
      ) {
        return `${field.label}${i18n.t('shared.use_bff_page.k3')}${validation.maxLength}${i18n.t('shared.use_bff_page.k4')}`;
      }

      if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
        return `${field.label}${i18n.t('shared.use_bff_page.k5')}${validation.min}`;
      }

      if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
        return `${field.label}${i18n.t('shared.use_bff_page.k6')}${validation.max}`;
      }

      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return `${field.label}${i18n.t('shared.use_bff_page.k7')}`;
        }
      }

      if (validation.custom) {
        const customError = validation.custom(value);
        if (customError) return customError;
      }

      return null;
    },
    [fieldConfig, formData]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    for (const field of fieldConfig) {
      const error = validateField(field.name);
      if (error) {
        newErrors[field.name] = error;
        valid = false;
      }
    }

    setErrors(newErrors);
    setIsValid(valid);
    return valid;
  }, [fieldConfig, validateField]);

  const submit = useCallback(async (): Promise<T | null> => {
    if (!validate()) {
      return null;
    }

    try {
      let result: T | null = null;

      if (mode === 'create') {
        result = await crud.create(formData as Partial<T>);
      } else if (mode === 'edit' && entityId) {
        result = await crud.update(entityId, formData as Partial<T>);
      }

      if (result) {
        setIsDirty(false);
        onSuccess?.(result);
        queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'active' });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      return null;
    }
  }, [validate, mode, entityId, crud, formData, onSuccess, onError, queryClient, queryKey]);

  const loadInitialData = useCallback(async () => {
    if (mode !== 'edit' || !entityId) return;
    const data = await crud.get(entityId);
    if (data) {
      setFormData(data as Partial<T>);
      setIsDirty(false);
    }
  }, [mode, entityId, crud]);

  const pageState = {
    mode,
    data: formData,
    loading: crud.loading,
    error: crud.error,
    isSubmitting:
      (mode === 'create' && crud.mutations.createMutation.isPending) ||
      (mode === 'edit' && crud.mutations.updateMutation.isPending),
    isDirty,
    isValid,
    errors,
  };

  const actions = {
    setFieldValue,
    setValues,
    reset,
    validate,
    validateField,
    submit,
    loadInitialData,
  };

  return { pageState, actions };
}

export default {
  useBffListPage,
  useBffDetailPage,
  useBffFormPage,
};
