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
import useBffCrud from './useBffCrud';
import type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import i18n from '@/i18n';

// ============ 通用类型 ============

export interface PageStateStatus {
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  isDeleting: boolean;
}

// ============ useBffListPage ============

export interface UseBffListPageOptions<T> extends Omit<UseBffCrudOptions<T>, 'queryKey'> {
  queryKey: unknown[];
  /** 搜索字段配置 */
  searchFields?: string[];
  /** 可选的过滤字段 */
  filterFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number' | 'boolean';
    options?: Array<{ value: string | number | boolean; label: string }>;
  }>;
  /** 批量操作配置 */
  batchActions?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    action: (ids: string[], items: T[]) => Promise<void>;
  }>;
  /** 行点击跳转路径 */
  detailPathPattern?: string;
  /** 启用自动分片 */
  enableSharding?: boolean;
}

export interface UseBffListPageResult<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  pageState: {
    // 数据
    data: T[];
    total: number;
    // 状态
    loading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    // 分页
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      setPage: (page: number) => void;
      setPageSize: (size: number) => void;
    };
    // 搜索
    searchKeyword: string;
    // 过滤
    filters: Record<string, unknown>;
    // 选择
    selectedIds: string[];
    selectedItems: T[];
    // 排序
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    // 分片
    shardingEnabled: boolean;
    shardProgress: number;
  };
  actions: {
    // 数据操作
    refresh: () => void;
    fetch: (params?: Record<string, unknown>) => void;
    create: (item: TCreate) => Promise<T | null>;
    update: (id: string, item: TUpdate) => Promise<T | null>;
    deleteItem: (id: string) => Promise<void>;
    bulkDelete: (ids: string[]) => Promise<void>;
    get: (id: string) => Promise<T | null>;
    // 搜索
    setSearchKeyword: (keyword: string) => void;
    clearSearch: () => void;
    // 过滤
    setFilter: (key: string, value: unknown) => void;
    setFilters: (filters: Record<string, unknown>) => void;
    clearFilters: () => void;
    // 排序
    setSort: (field: string, order?: 'asc' | 'desc') => void;
    clearSort: () => void;
    // 选择
    toggleSelect: (id: string, item: T) => void;
    toggleSelectAll: () => void;
    clearSelection: () => void;
    // 批量操作
    executeBatchAction: (key: string) => Promise<void>;
    // 分片
    toggleSharding: () => void;
  };
  // 原始 CRUD hook 结果（高级用法）
  crud: UseBffCrudResult<T, TCreate, TUpdate>;
}

export function useBffListPage<
  T extends { id?: string },
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
>(options: UseBffListPageOptions<T>): UseBffListPageResult<T, TCreate, TUpdate> {
  const {
    queryKey,
    searchFields = ['name', 'code'],
    filterFields = [],
    batchActions = [],
    enableSharding = false,
    ...crudOptions
  } = options;

  const addNotification = useNotificationStore((state) => state.addNotification);

  const crud = useBffCrud<T, TCreate, TUpdate>({
    ...crudOptions,
    queryKey,
  });

  const [searchKeyword, setSearchKeywordState] = useState('');
  const [filters, setFiltersState] = useState<Record<string, unknown>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [shardingEnabled, setShardingEnabled] = useState(enableSharding);
  const [shardProgress, setShardProgress] = useState(0);

  const selectedItems = useMemo(() => {
    return crud.data.filter((item) => item.id && selectedIds.includes(item.id));
  }, [crud.data, selectedIds]);

  const applySearchAndFilters = useCallback(() => {
    const params: Record<string, unknown> = {};
    if (searchKeyword) {
      params.keyword = searchKeyword;
      params.searchFields = searchFields;
    }
    if (Object.keys(filters).length > 0) {
      params.filter = filters;
    }
    if (sortField) {
      params.sort = { field: sortField, order: sortOrder };
    }
    crud.fetch(params);
  }, [crud, searchKeyword, filters, sortField, sortOrder, searchFields]);

  const setSearchKeyword = useCallback((keyword: string) => {
    setSearchKeywordState(keyword);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchKeywordState('');
  }, []);

  const setFilter = useCallback((key: string, value: unknown) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const setSort = useCallback((field: string, order: 'asc' | 'desc' = 'asc') => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const clearSort = useCallback(() => {
    setSortField(undefined);
    setSortOrder(undefined);
  }, []);

  const toggleSelect = useCallback((id: string, _item: T) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allIds = crud.data.filter((item) => item.id).map((item) => item.id as string);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  }, [crud.data, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const executeBatchAction = useCallback(
    async (key: string) => {
      const action = batchActions.find((a) => a.key === key);
      if (!action || selectedIds.length === 0) return;

      try {
        await action.action(selectedIds, selectedItems);
        setSelectedIds([]);
      } catch (err) {
        const message = extractErrorMessage(err, i18n.t('shared.use_bff_page.k0'));
        addNotification({ title: i18n.t('shared.use_bff_page.k1'), message, type: 'error' });
      }
    },
    [batchActions, selectedIds, selectedItems, addNotification]
  );

  const toggleSharding = useCallback(() => {
    setShardingEnabled((prev) => !prev);
  }, []);

  const pageState = {
    data: crud.data,
    total: crud.total,
    loading: crud.loading,
    error: crud.error,
    isCreating: crud.mutations.createMutation.isPending,
    isUpdating: crud.mutations.updateMutation.isPending,
    isDeleting:
      crud.mutations.deleteMutation.isPending || crud.mutations.bulkDeleteMutation.isPending,
    pagination: crud.pagination,
    searchKeyword,
    filters,
    selectedIds,
    selectedItems,
    sortField,
    sortOrder,
    shardingEnabled,
    shardProgress,
  };

  const actions = {
    refresh: crud.refresh,
    fetch: applySearchAndFilters,
    create: crud.create,
    update: crud.update,
    deleteItem: crud.delete,
    bulkDelete: crud.bulkDelete,
    get: crud.get,
    setSearchKeyword,
    clearSearch,
    setFilter,
    setFilters,
    clearFilters,
    setSort,
    clearSort,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    executeBatchAction,
    toggleSharding,
  };

  return { pageState, actions, crud };
}

// ============ useBffDetailPage ============

export interface RelatedQueryConfig {
  key: string;
  label: string;
  query: string;
  variables?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UseBffDetailPageOptions<T> {
  entityType: string;
  service: string;
  entityId?: string;
  queryKey: unknown[];
  /** 字段分组配置（用于渲染） */
  fieldGroups?: Array<{
    title: string;
    fields: string[];
  }>;
  /** 关联数据查询 */
  relatedQueries?: RelatedQueryConfig[];
  /** 实体名称（用于通知） */
  entityName?: string;
  /** 缓存新鲜时间 */
  staleTime?: number;
}

export interface UseBffDetailPageResult<T> {
  pageState: {
    data: T | null;
    loading: boolean;
    error: string | null;
    isEditing: boolean;
    isSaving: boolean;
    isDeleting: boolean;
    relatedData: Record<string, unknown>;
    relatedLoading: Record<string, boolean>;
  };
  actions: {
    refresh: () => void;
    enterEditMode: () => void;
    exitEditMode: () => void;
    toggleEditMode: () => void;
    save: (data: Partial<T>) => Promise<T | null>;
    deleteItem: () => Promise<void>;
    preloadRelated: (key: string) => void;
    loadRelated: (key: string) => Promise<unknown>;
  };
}

export function useBffDetailPage<T extends { id?: string }>(
  options: UseBffDetailPageOptions<T>
): UseBffDetailPageResult<T> {
  const {
    entityType,
    service,
    entityId,
    queryKey,
    fieldGroups,
    relatedQueries = [],
    entityName,
    staleTime,
  } = options;

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const crud = useBffCrud<T>({
    service,
    entityType,
    queryKey,
    staleTime,
    autoFetch: false,
    entityName,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [relatedData, setRelatedData] = useState<Record<string, unknown>>({});
  const [relatedLoading, setRelatedLoading] = useState<Record<string, boolean>>({});

  const loadDetail = useCallback(async () => {
    if (!entityId) return;
    await crud.get(entityId);
  }, [entityId, crud]);

  const enterEditMode = useCallback(() => {
    setIsEditing(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const save = useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      if (!entityId) return null;
      return crud.update(entityId, data as Partial<T>);
    },
    [entityId, crud]
  );

  const deleteItem = useCallback(async () => {
    if (!entityId) return;
    await crud.delete(entityId);
  }, [entityId, crud]);

  const loadRelated = useCallback(
    async (key: string): Promise<unknown> => {
      const queryConfig = relatedQueries.find((q) => q.key === key);
      if (!queryConfig) return null;

      setRelatedLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const { bffGraphQL } = await import('@/api/bff');
        const result = await bffGraphQL(queryConfig.query, {
          ...queryConfig.variables,
          entityId,
        });
        setRelatedData((prev) => ({ ...prev, [key]: result }));
        return result;
      } catch (err) {
        const message = extractErrorMessage(err, i18n.t('shared.use_bff_page.k2'));
        addNotification({ title: i18n.t('shared.use_bff_page.k3'), message, type: 'error' });
        return null;
      } finally {
        setRelatedLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [relatedQueries, entityId, addNotification]
  );

  const preloadRelated = useCallback(
    (key: string) => {
      const queryConfig = relatedQueries.find((q) => q.key === key);
      if (!queryConfig || queryConfig.enabled === false) return;
      queryClient.prefetchQuery({
        queryKey: [...queryKey, 'related', key, entityId],
        queryFn: () => loadRelated(key),
      });
    },
    [relatedQueries, queryKey, entityId, queryClient, loadRelated]
  );

  const currentData =
    (entityId ? (queryClient.getQueryData([...queryKey, 'detail', entityId]) as T) : null) ?? null;

  const pageState = {
    data: currentData,
    loading: crud.loading,
    error: crud.error,
    isEditing,
    isSaving: crud.mutations.updateMutation.isPending,
    isDeleting: crud.mutations.deleteMutation.isPending,
    relatedData,
    relatedLoading,
  };

  const actions = {
    refresh: () => {
      loadDetail();
    },
    enterEditMode,
    exitEditMode,
    toggleEditMode,
    save,
    deleteItem,
    preloadRelated,
    loadRelated,
  };

  return { pageState, actions };
}

// ============ useBffFormPage ============

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
    optimisticUpdate = false,
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
