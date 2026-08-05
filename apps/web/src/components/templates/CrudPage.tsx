/**
 * CrudPage — Schema 驱动的完整 CRUD 页面
 *
 * 一个 EntitySchema + API 适配器 = 列表 + 创建 + 编辑 + 详情 + 删除 + 批量操作 + 筛选
 *
 * @example
 * ```tsx
 * <CrudPage
 *   schema={inboundOrderSchema}
 *   apiAdapter={{
 *     list: (params) => wmsApi.inboundOrders.list(params).then(r => ({ data: r.data.items, total: r.data.total })),
 *     create: (data) => wmsApi.inboundOrders.create(data),
 *     update: (id, data) => wmsApi.inboundOrders.update(id, data),
 *     delete: (id) => wmsApi.inboundOrders.delete(id),
 *   }}
 * />
 * ```
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { Eye, Pencil, Trash2, Plus, Upload, Download, List, GitBranch } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FormBuilder } from '@/components/common';
import type { FormFieldConfig } from '@/components/common/FormBuilder';
import { useNotificationStore } from '@/store/notificationStore';
import { useTranslation } from 'react-i18next';

import { ListPageTemplate } from './ListPageTemplate';
import type { ColumnDef, RowAction } from './list/types';

import type { EntitySchema, BatchActionConfig, SchemaField } from '@/schema';
import type {
  SchemaExtensions,
  WizardConfig,
  NestedTableConfig,
  TreeConfig,
} from '@/schema/schemaExtensions';
import { getColumns, getFormFields, getFilterParams } from '@/schema';
import { useDynamicOptions, mergeDynamicOptions } from '@/hooks/useDynamicOptions';
import { SubTableBuilder } from './SubTableBuilder';
import { WizardBuilder } from './WizardBuilder';
import { TreeBuilder, type TreeNode } from './TreeBuilder';

export type { RowAction };

// ============ API 适配器 ============

export interface CrudApiAdapter<T = Record<string, unknown>> {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    [key: string]: unknown;
  }) => Promise<{ data: T[]; total: number }>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

// ============ Props ============

export interface TreeDataAdapter {
  /** 加载树形数据（返回扁平数据，CrudPage 会自动转换为树形） */
  loadAll: () => Promise<Record<string, unknown>[]>;
  /** 根据 Schema 配置构建树形结构的选项 */
  transformOptions?: {
    keyField?: string;
    parentField?: string;
    labelField?: string;
    childrenField?: string;
  };
  /** 新增子节点 */
  onAddChild?: (parentId: string | number | null, data: Record<string, unknown>) => Promise<void>;
  /** 更新节点 */
  onUpdate?: (id: string | number, data: Record<string, unknown>) => Promise<void>;
  /** 删除节点 */
  onDelete?: (id: string | number) => Promise<void>;
}

/** Tab 配置 */
export interface CrudTab {
  /** Tab 唯一标识 */
  id: string;
  /** Tab 标签 */
  label: string;
  /** Tab 图标 */
  icon?: React.ReactNode;
  /** Tab 内容（自定义渲染） */
  content: React.ReactNode | ((active: boolean) => React.ReactNode);
  /** 是否禁用 */
  disabled?: boolean;
}

export interface CrudPageProps<T = Record<string, unknown>> {
  schema: EntitySchema<T>;
  apiAdapter: CrudApiAdapter<any>;
  /** 自定义列表列（覆盖 Schema 生成的列） */
  customColumns?: ColumnDef[];
  /** 面包屑 */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** 列表查询的额外参数 */
  extraQueryParams?: Record<string, unknown>;
  /** 行数据的 ID 字段名，默认 'id' */
  idField?: string;
  /** 自定义头部内容（覆盖 Schema 中的 headerContent）。支持渲染函数接收数据、总数和当前搜索词 */
  headerContent?: React.ReactNode | ((rows: any[], total: number, search: string) => React.ReactNode);
  /**
   * 树形模式数据适配器
   *
   * 当 schema 中配置了 tree 扩展时，可提供此适配器启用树形视图。
   * 未提供时会使用 apiAdapter.list 加载全部数据并自动构建树形结构。
   */
  treeDataAdapter?: TreeDataAdapter;
  /** 自定义详情内容渲染函数
   *
   * 当需要在详情面板中展示自定义内容（如子表格、步骤列表、图表等）时，
   * 提供此函数来覆盖默认的 FormBuilder view 模式。
   *
   * 优先于 schema.renderDetail。
   */
  detailContent?: (row: T) => React.ReactNode;
  /** 详情 Dialog 的最大宽度，默认 'md' */
  detailMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** 自定义行操作（追加在标准 CRUD 操作之后） */
  customRowActions?: RowAction[];
  /**
   * Tab 配置
   *
   * 提供后页面渲染为多 Tab 布局，第一个 Tab 通常是主列表（通过 renderMainList 自定义），
   * 其他 Tab 可以是自定义内容。
   *
   * @example
   * ```tsx
   * <CrudPage
   *   schema={orderSchema}
   *   apiAdapter={orderApi}
   *   tabs={[
   *     { id: 'list', label: '订单列表', content: <CrudList /> },
   *     { id: 'items', label: '物料明细', content: <ItemsTable /> },
   *     { id: 'suppliers', label: '供应商', content: <SupplierPanel /> },
   *   ]}
   * />
   * ```
   */
  tabs?: CrudTab[];
  /** 默认激活的 Tab ID */
  defaultTab?: string;
  /** 是否禁用分页（不分页模式） */
  disablePagination?: boolean;
  /** 自定义操作列表（覆盖 schema.actions） */
  actions?: Array<'create' | 'edit' | 'detail' | 'delete'>;
  /** 是否只读模式（隐藏新增、编辑、删除按钮） */
  readOnly?: boolean;
}

// ============ 组件 ============

function CrudPage<T extends Record<string, unknown> = Record<string, unknown>>({
  schema,
  apiAdapter,
  customColumns,
  breadcrumbs,
  extraQueryParams,
  idField = 'id',
  headerContent: headerContentProp,
  treeDataAdapter,
  detailContent: detailContentProp,
  detailMaxWidth = 'md',
  customRowActions: customRowActionsProp,
  tabs: tabsProp,
  defaultTab,
  disablePagination = false,
  actions: actionsProp,
  readOnly = false,
}: CrudPageProps<T>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tab 状态 ──
  const hasTabs = !!tabsProp && tabsProp.length > 0;
  const [activeTab, setActiveTab] = useState<string>(defaultTab ?? tabsProp?.[0]?.id ?? '');

  // ── 扩展能力检测 ──
  const extensions = schema as SchemaExtensions;
  const hasWizard = !!extensions.wizard;
  const hasNestedTables = (extensions.nestedTables?.length ?? 0) > 0;
  const treeConfig = extensions.tree;
  const hasTree = !!treeConfig;
  const effectiveTreeAdapter = hasTree ? treeDataAdapter : undefined;

  // ── 状态 ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(schema.list?.pageSize ?? 10);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>(hasTree ? 'tree' : 'list');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (schema.list?.filters) {
      for (const f of schema.list.filters) {
        init[f.id] = f.defaultValue || 'all';
      }
    }
    return init;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [detailTarget, setDetailTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [createFormValues, setCreateFormValues] = useState<Record<string, unknown>>({});
  const [editFormValues, setEditFormValues] = useState<Record<string, unknown>>({});

  const dynamicDeps = useMemo(() => {
    const result: Record<string, unknown> = {};
    if (!schema.dynamicOptions) return result;
    for (const config of schema.dynamicOptions) {
      if (config.dependencies) {
        for (const dep of config.dependencies) {
          if (createOpen && createFormValues[dep] !== undefined) {
            result[dep] = createFormValues[dep];
          }
          if (editTarget && editFormValues[dep] !== undefined) {
            result[dep] = editFormValues[dep];
          }
        }
      }
    }
    return result;
  }, [schema.dynamicOptions, createOpen, createFormValues, editTarget, editFormValues]);

  // ── 动态选项 ──
  const dynamicOptions = useDynamicOptions(schema.dynamicOptions, dynamicDeps);

  // ── 列定义 ──
  const columns: ColumnDef[] = useMemo(
    () => customColumns || getColumns<T>(schema),
    [schema, customColumns]
  );

  // ── 表单字段（合并动态选项） ──
  const baseCreateFields = useMemo(() => getFormFields<T>(schema, 'create'), [schema]);
  const baseEditFields = useMemo(() => getFormFields<T>(schema, 'edit'), [schema]);
  const viewFields = useMemo(() => getFormFields<T>(schema, 'view'), [schema]);

  const createFields = useMemo(
    () => mergeDynamicOptions(baseCreateFields, dynamicOptions) as FormFieldConfig[],
    [baseCreateFields, dynamicOptions]
  );
  const editFields = useMemo(
    () => mergeDynamicOptions(baseEditFields, dynamicOptions) as FormFieldConfig[],
    [baseEditFields, dynamicOptions]
  );

  // ── 行操作 ──
  const baseActions = actionsProp || schema.actions || ['create', 'edit', 'detail', 'delete'];
  const actions = readOnly ? baseActions.filter((a) => a === 'detail') : baseActions;

  const rowActions: RowAction[] = useMemo(() => {
    const result: RowAction[] = [];
    if (actions.includes('detail')) {
      result.push({
        label: t('common.view', '查看'),
        icon: <Eye size={16} />,
        onClick: (row: T) => setDetailTarget(row),
      });
    }
    if (actions.includes('edit')) {
      result.push({
        label: t('common.edit', '编辑'),
        icon: <Pencil size={16} />,
        onClick: (row: T) => {
          setWizardValues({});
          setEditTarget(row);
        },
      });
    }
    if (actions.includes('delete')) {
      result.push({
        label: t('common.delete', '删除'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row: T) => setDeleteTarget(row),
      });
    }
    if (customRowActionsProp?.length) {
      result.push(...customRowActionsProp);
    }
    return result;
  }, [actions, t, customRowActionsProp]);

  // ── 批量操作 ──
  const batchActions = schema.batchActions || [];

  const handleBatchAction = useCallback(
    (action: BatchActionConfig) => {
      if (selectedIds.length === 0) {
        addNotification({
          type: 'info',
          title: t('common.tip', '提示'),
          message: t('common.select_first', '请先选择要操作的记录'),
        });
        return;
      }

      const execute = () => {
        action.onClick(selectedIds);
        setSelectedIds([]);
      };

      if (action.confirm) {
        setConfirmConfig({
          title: t('common.confirm_action', '确认操作'),
          message:
            action.confirmMessage ||
            `${t('common.confirm_message', '确定要执行此操作吗？')}(${selectedIds.length}${t('common.items', '条')})`,
          onConfirm: execute,
        });
      } else {
        execute();
      }
    },
    [selectedIds, addNotification, t]
  );

  // ── 筛选变更 ──
  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
    setPage(1);
  }, []);

  // ── 导入导出 ──
  const importConfig = schema.importConfig;
  const exportConfig = schema.exportConfig;

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !importConfig?.onImport) return;

      try {
        await importConfig.onImport(file);
        addNotification({
          type: 'success',
          title: t('common.import_success', '导入成功'),
          message: '',
        });
        queryClient.invalidateQueries({ queryKey: [schema.entity] });
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('common.import_failed', '导入失败'),
          message: error instanceof Error ? error.message : '',
        });
      }
      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importConfig, addNotification, t, queryClient, schema.entity]
  );

  const handleExport = useCallback(async () => {
    if (!exportConfig?.onExport) return;

    try {
      await exportConfig.onExport();
      addNotification({
        type: 'success',
        title: t('common.export_success', '导出成功'),
        message: '',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('common.export_failed', '导出失败'),
        message: error instanceof Error ? error.message : '',
      });
    }
  }, [exportConfig, addNotification, t]);

  // ── 数据查询 ──
  const filterParams = useMemo(
    () => getFilterParams<T>(schema, filterValues),
    [schema, filterValues]
  );

  const queryKey = [schema.entity, 'list', page, pageSize, search, filterParams, extraQueryParams];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      return apiAdapter.list({
        page,
        pageSize,
        search: search || undefined,
        ...filterParams,
        ...extraQueryParams,
      });
    },
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => apiAdapter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [schema.entity] });
      addNotification({
        type: 'success',
        title: t('common.create_success', '创建成功'),
        message: '',
      });
      setCreateOpen(false);
    },
    onError: (error: unknown) => {
      addNotification({
        type: 'error',
        title: t('common.create_failed', '创建失败'),
        message: error instanceof Error ? error.message : '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => apiAdapter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [schema.entity] });
      addNotification({
        type: 'success',
        title: t('common.update_success', '更新成功'),
        message: '',
      });
      setEditTarget(null);
    },
    onError: (error: unknown) => {
      addNotification({
        type: 'error',
        title: t('common.update_failed', '更新失败'),
        message: error instanceof Error ? error.message : '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiAdapter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [schema.entity] });
      addNotification({
        type: 'success',
        title: t('common.delete_success', '删除成功'),
        message: '',
      });
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      addNotification({
        type: 'error',
        title: t('common.delete_failed', '删除失败'),
        message: error instanceof Error ? error.message : '',
      });
    },
  });

  // ── 向导表单状态 ──
  const [wizardValues, setWizardValues] = useState<Record<string, unknown>>({});

  // ── 树形数据查询 ──
  const treeQueryKey = [schema.entity, 'tree'];

  const { data: treeRawData, isLoading: treeLoading } = useQuery({
    queryKey: treeQueryKey,
    queryFn: async () => {
      if (!effectiveTreeAdapter) return [];
      return effectiveTreeAdapter.loadAll();
    },
    enabled: !!effectiveTreeAdapter && viewMode === 'tree',
    staleTime: 5 * 60 * 1000,
  });

  const treeData: TreeNode[] = useMemo(() => {
    if (!treeRawData || !treeConfig) return [];
    const keyField =
      effectiveTreeAdapter?.transformOptions?.keyField || treeConfig.keyField || 'id';
    const parentField =
      effectiveTreeAdapter?.transformOptions?.parentField || treeConfig.parentField || 'parentId';
    const labelField = treeConfig.labelField || 'label';

    const map = new Map<string | number, TreeNode>();
    const roots: TreeNode[] = [];

    for (const item of treeRawData) {
      const id = item[keyField] as string | number;
      map.set(id, {
        id,
        label: String(item[labelField] ?? item.name ?? id),
        data: item,
        children: [],
      });
    }

    for (const item of treeRawData) {
      const id = item[keyField] as string | number;
      const parentId = item[parentField] as string | number | undefined;
      const node = map.get(id)!;
      if (parentId !== undefined && parentId !== null && map.has(parentId)) {
        const parent = map.get(parentId)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const markHasChildren = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        node.hasChildren = !!(node.children && node.children.length > 0);
        if (node.hasChildren) {
          markHasChildren(node.children!);
        }
      }
    };
    markHasChildren(roots);

    return roots;
  }, [treeRawData, treeConfig, effectiveTreeAdapter]);

  const handleTreeNodeAdd = useCallback(
    async (parentId: string | number | null, nodeData: Record<string, unknown>) => {
      if (effectiveTreeAdapter?.onAddChild) {
        await effectiveTreeAdapter.onAddChild(parentId, nodeData);
      } else {
        (await apiAdapter.create(nodeData as Partial<T>)) as unknown;
      }
      queryClient.invalidateQueries({ queryKey: treeQueryKey });
      addNotification({
        type: 'success',
        title: t('common.create_success', '创建成功'),
        message: '',
      });
    },
    [effectiveTreeAdapter, apiAdapter, queryClient, addNotification, t, treeQueryKey]
  );

  const handleTreeNodeUpdate = useCallback(
    async (id: string | number, nodeData: Record<string, unknown>) => {
      if (effectiveTreeAdapter?.onUpdate) {
        await effectiveTreeAdapter.onUpdate(id, nodeData);
      } else {
        await apiAdapter.update(String(id), nodeData as Partial<T>);
      }
      queryClient.invalidateQueries({ queryKey: treeQueryKey });
      addNotification({
        type: 'success',
        title: t('common.update_success', '更新成功'),
        message: '',
      });
    },
    [effectiveTreeAdapter, apiAdapter, queryClient, addNotification, t, treeQueryKey]
  );

  const handleTreeNodeDelete = useCallback(
    async (id: string | number) => {
      if (effectiveTreeAdapter?.onDelete) {
        await effectiveTreeAdapter.onDelete(id);
      } else {
        await apiAdapter.delete(String(id));
      }
      queryClient.invalidateQueries({ queryKey: treeQueryKey });
      addNotification({
        type: 'success',
        title: t('common.delete_success', '删除成功'),
        message: '',
      });
    },
    [effectiveTreeAdapter, apiAdapter, queryClient, addNotification, t, treeQueryKey]
  );

  // ── 事件处理 ──
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(String(deleteTarget[idField]));
    }
  }, [deleteTarget, deleteMutation, idField]);

  const handleSelectionChange = useCallback((ids: (string | number)[]) => {
    setSelectedIds(ids.map(String));
  }, []);

  const handleInlineEditSave = useCallback(
    async (row: Record<string, unknown>, changes: Partial<Record<string, unknown>>) => {
      const id = String(row[idField]);
      await updateMutation.mutateAsync({ id, data: changes as Partial<T> });
    },
    [idField, updateMutation]
  );

  // ── 渲染 ──
  const showCreate = actions.includes('create');
  const selectable = schema.list?.selectable || batchActions.length > 0;
  const rows = data?.data || [];
  const total = data?.total || 0;
  const filters = schema.list?.filters || [];

  const resolvedHeaderContent = useMemo(() => {
    const hc = headerContentProp ?? schema.headerContent;
    if (typeof hc === 'function') {
      return hc(rows as T[], total, search);
    }
    return hc;
  }, [headerContentProp, schema.headerContent, rows, total, search]);

  // ── 顶部筛选栏 ──
  const filtersBar =
    filters.length > 0 ? (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {filters.map((filter) => (
          <FormControl
            key={filter.id}
            size='small'
            sx={{ minWidth: 160 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={filterValues[filter.id] || 'all'}
              label={filter.label}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            >
              {(filter.options || []).map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Box>
    ) : null;

  // ── 批量操作栏 ──
  const batchActionsBar =
    selectable && selectedIds.length > 0 && batchActions.length > 0 ? (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 2,
          alignItems: 'center',
          p: 1.5,
          bgcolor: 'action.selected',
          borderRadius: 1,
        }}
      >
        <Chip
          label={`${t('common.selected', '已选')} ${selectedIds.length} ${t('common.items', '条')}`}
          size='small'
          color='primary'
        />
        {batchActions.map((action) => (
          <Button
            key={action.key}
            size='small'
            variant='outlined'
            color={action.color || 'primary'}
            onClick={() => handleBatchAction(action)}
            startIcon={action.icon}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    ) : null;

  return (
    <>
      {filtersBar}
      {batchActionsBar}

      {/* Tab 导航 */}
      {hasTabs && (
        <Tabs
          value={activeTab}
          onChange={(_, v: string) => setActiveTab(v)}
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {tabsProp!.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              icon={tab.icon ? <>{tab.icon}</> : undefined}
              iconPosition='start'
              value={tab.id}
              disabled={tab.disabled}
            />
          ))}
        </Tabs>
      )}

      {/* Tab 内容 */}
      {hasTabs && tabsProp!.some((t) => t.id === activeTab) ? (
        <Box sx={{ mb: 2 }}>
          {(() => {
            const tab = tabsProp!.find((t) => t.id === activeTab);
            if (!tab) return null;
            const content = typeof tab.content === 'function' ? tab.content(true) : tab.content;
            return content;
          })()}
        </Box>
      ) : null}

      {/* 主内容区（当没有启用 Tabs 或当前 Tab 需要显示列表时） */}
      {(() => {
        // 如果有 Tabs，且当前 Tab 有自定义内容（非列表），则跳过主列表
        if (hasTabs) {
          const currentTab = tabsProp!.find((t) => t.id === activeTab);
          // 如果当前 Tab 有自定义 content，且不是第一个 Tab（约定第一个是列表）
          // 则不渲染主列表
          if (currentTab && currentTab.id !== tabsProp![0]?.id && currentTab.content) {
            return null;
          }
        }

        return (
          <>
            {/* 视图切换（列表/树形） */}
            {hasTree && effectiveTreeAdapter && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  mb: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  width: 'fit-content',
                }}
              >
                <Button
                  size='small'
                  startIcon={<List size={14} />}
                  variant={viewMode === 'list' ? 'contained' : 'text'}
                  onClick={() => setViewMode('list')}
                  sx={{ borderRadius: 0 }}
                >
                  列表
                </Button>
                <Button
                  size='small'
                  startIcon={<GitBranch size={14} />}
                  variant={viewMode === 'tree' ? 'contained' : 'text'}
                  onClick={() => setViewMode('tree')}
                  sx={{ borderRadius: 0 }}
                >
                  树形
                </Button>
              </Box>
            )}

            {viewMode === 'tree' && effectiveTreeAdapter ? (
              <>
                <TreeBuilder
                  config={treeConfig as TreeConfig}
                  data={treeData}
                  fields={schema.fields as SchemaField[]}
                  mode={actions.includes('edit') ? 'edit' : 'view'}
                  loading={treeLoading}
                  onNodeAdd={handleTreeNodeAdd}
                  onNodeUpdate={handleTreeNodeUpdate}
                  onNodeDelete={handleTreeNodeDelete}
                />
              </>
            ) : (
              <ListPageTemplate
                title={schema.title}
                subtitle={schema.description}
                breadcrumbs={breadcrumbs}
                columns={columns}
                data={rows}
                loading={isLoading}
                searchable
                searchPlaceholder={t('common.search', '搜索')}
                searchValue={search}
                onSearch={handleSearch}
                pagination={
                  disablePagination
                    ? undefined
                    : {
                        page,
                        pageSize,
                        total,
                        onPageChange: setPage,
                        onPageSizeChange: setPageSize,
                      }
                }
                rowActions={rowActions}
                selectable={selectable}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                inlineEditable={schema.list?.inlineEditable}
                inlineEditMode={schema.list?.inlineEditMode}
                onInlineEditSave={handleInlineEditSave}
                headerContent={resolvedHeaderContent}
                actions={
                  [
                    showCreate
                      ? {
                          label: schema.createTitle || `新建${schema.title}`,
                          icon: <Plus size={16} />,
                          onClick: () => {
                            setWizardValues({});
                            setCreateFormValues({});
                            setCreateOpen(true);
                          },
                          variant: 'contained' as const,
                        }
                      : null,
                    importConfig?.enabled
                      ? {
                          label: t('common.import', '导入'),
                          icon: <Upload size={16} />,
                          onClick: () => fileInputRef.current?.click(),
                          variant: 'outlined' as const,
                        }
                      : null,
                    exportConfig?.enabled
                      ? {
                          label: t('common.export', '导出'),
                          icon: <Download size={16} />,
                          onClick: handleExport,
                          variant: 'outlined' as const,
                        }
                      : null,
                  ].filter(Boolean) as Array<{
                    label: string;
                    icon?: React.ReactNode;
                    onClick?: () => void;
                    variant?: 'contained' | 'outlined' | 'text';
                  }>
                }
              />
            )}
          </>
        );
      })()}

      {/* 隐藏的文件输入（用于导入） */}
      {importConfig?.enabled && (
        <input
          ref={fileInputRef}
          type='file'
          accept={importConfig.accept || '.csv,.xlsx,.xls'}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      )}

      {/* 创建 Dialog */}
      {createOpen && (
        <Dialog
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateFormValues({});
            setWizardValues({});
          }}
          maxWidth={hasWizard ? 'lg' : 'md'}
          fullWidth
        >
          <DialogTitle>{schema.createTitle || `新建${schema.title}`}</DialogTitle>
          <DialogContent>
            {hasWizard && extensions.wizard ? (
              <WizardBuilder
                config={extensions.wizard as WizardConfig}
                fields={schema.fields as SchemaField[]}
                values={wizardValues}
                onChange={setWizardValues}
                onComplete={() => {
                  createMutation.mutate(wizardValues as Partial<T>);
                  setCreateOpen(false);
                  setWizardValues({});
                }}
                onCancel={() => {
                  setCreateOpen(false);
                  setWizardValues({});
                }}
                mode='create'
                nestedTables={extensions.nestedTables as NestedTableConfig[]}
              />
            ) : (
              <>
                <FormBuilder
                  fields={createFields}
                  mode='create'
                  colCount={schema.formColCount || 2}
                  formSections={schema.formSections}
                  submitLabel={t('common.create', '创建')}
                  resetLabel={t('common.cancel', '取消')}
                  showReset
                  onSubmitSuccess={() => setCreateOpen(false)}
                  onReset={() => setCreateOpen(false)}
                  onFieldChange={(_name, _value, values) => {
                    setCreateFormValues(values);
                  }}
                  onSubmit={async (values) => {
                    const combinedValues = { ...values, ...wizardValues };
                    createMutation.mutate(combinedValues as Partial<T>);
                  }}
                />
                {hasNestedTables &&
                  extensions.nestedTables?.map((nt) => (
                    <SubTableBuilder
                      key={nt.field}
                      config={nt}
                      value={(wizardValues[nt.field] as Record<string, unknown>[]) || []}
                      onChange={(rows) => {
                        setWizardValues((prev) => ({ ...prev, [nt.field]: rows }));
                      }}
                      mode='create'
                    />
                  ))}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* 编辑 Dialog */}
      {editTarget && (
        <Dialog
          open={!!editTarget}
          onClose={() => {
            setEditTarget(null);
            setEditFormValues({});
            setWizardValues({});
          }}
          maxWidth={hasWizard ? 'lg' : 'md'}
          fullWidth
        >
          <DialogTitle>{schema.editTitle || `编辑${schema.title}`}</DialogTitle>
          <DialogContent>
            {hasWizard && extensions.wizard ? (
              <WizardBuilder
                config={extensions.wizard as WizardConfig}
                fields={schema.fields as SchemaField[]}
                values={{ ...(editTarget as Record<string, unknown>), ...wizardValues }}
                onChange={setWizardValues}
                onComplete={() => {
                  const id = String(editTarget[idField]);
                  updateMutation.mutate({ id, data: wizardValues as Partial<T> });
                  setEditTarget(null);
                  setWizardValues({});
                }}
                onCancel={() => {
                  setEditTarget(null);
                  setWizardValues({});
                }}
                mode='edit'
                nestedTables={extensions.nestedTables as NestedTableConfig[]}
              />
            ) : (
              <>
                <FormBuilder
                  fields={editFields}
                  mode='edit'
                  colCount={schema.formColCount || 2}
                  formSections={schema.formSections}
                  initialValues={editTarget as Record<string, unknown>}
                  submitLabel={t('common.save', '保存')}
                  resetLabel={t('common.cancel', '取消')}
                  showReset
                  onSubmitSuccess={() => setEditTarget(null)}
                  onReset={() => setEditTarget(null)}
                  onFieldChange={(_name, _value, values) => {
                    setEditFormValues(values);
                  }}
                  onSubmit={async (values) => {
                    const id = String(editTarget[idField]);
                    const combinedValues = { ...values, ...wizardValues };
                    updateMutation.mutate({ id, data: combinedValues as Partial<T> });
                  }}
                />
                {hasNestedTables &&
                  extensions.nestedTables?.map((nt) => (
                    <SubTableBuilder
                      key={nt.field}
                      config={nt}
                      value={
                        (wizardValues[nt.field] as Record<string, unknown>[]) ||
                        (editTarget?.[nt.field] as Record<string, unknown>[]) ||
                        []
                      }
                      onChange={(rows) => {
                        setWizardValues((prev) => ({ ...prev, [nt.field]: rows }));
                      }}
                      mode='edit'
                    />
                  ))}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* 详情 Dialog */}
      {detailTarget && (
        <Dialog
          open={!!detailTarget}
          onClose={() => setDetailTarget(null)}
          maxWidth={detailMaxWidth}
          fullWidth
        >
          <DialogTitle>{schema.detailTitle || `${schema.title}详情`}</DialogTitle>
          <DialogContent>
            {detailContentProp ? (
              detailContentProp(detailTarget)
            ) : schema.renderDetail ? (
              schema.renderDetail(detailTarget)
            ) : (
              <FormBuilder
                fields={viewFields}
                mode='view'
                colCount={schema.formColCount || 2}
                initialValues={detailTarget as unknown as Record<string, unknown>}
                showReset
                resetLabel={t('common.close', '关闭')}
                onReset={() => setDetailTarget(null)}
                onSubmit={async () => {
                  /* view 模式不提交 */
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* 删除确认 Dialog */}
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          maxWidth='xs'
          fullWidth
        >
          <DialogTitle>{t('common.confirm_delete', '确认删除')}</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 1 }}>{t('common.confirm_delete_message', '确定要删除这条记录吗？')}</Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel', '取消')}</Button>
            <Button
              color='error'
              variant='contained'
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? t('common.deleting', '删除中...')
                : t('common.delete', '删除')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 通用确认 Dialog（批量操作等） */}
      {confirmConfig && (
        <Dialog
          open={!!confirmConfig}
          onClose={() => setConfirmConfig(null)}
          maxWidth='xs'
          fullWidth
        >
          <DialogTitle>{confirmConfig.title}</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 1 }}>{confirmConfig.message}</Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmConfig(null)}>{t('common.cancel', '取消')}</Button>
            <Button
              color='error'
              variant='contained'
              onClick={() => {
                confirmConfig.onConfirm();
                setConfirmConfig(null);
              }}
            >
              {t('common.confirm', '确认')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

export default CrudPage;
export { CrudPage };
