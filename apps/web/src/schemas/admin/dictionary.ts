import React from 'react';
import type { EntitySchema, SchemaField } from '@/schema/types';
import { dictTypeApi, dictItemApi } from '@/api/system';

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const statusLabels: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
};

export const dictTypeFields: SchemaField[] = [
  {
    name: 'code',
    label: '编码',
    type: 'text',
    required: true,
    readonlyOnEdit: true,
    validation: [{ type: 'required' }],
    listWidth: 140,
    sortable: true,
    renderCell: (row: Record<string, unknown>) => {
      const code = String(row.code || '');
      return React.createElement(
        'span',
        { style: { fontFamily: 'monospace', fontWeight: 500 } },
        code
      );
    },
  },
  {
    name: 'name',
    label: '名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
    renderCell: (row: Record<string, unknown>) => {
      const name = String(row.name || '');
      return React.createElement('span', null, name);
    },
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    defaultValue: 'business',
    options: {
      type: 'static',
      options: [
        { value: 'system', label: '系统字典' },
        { value: 'business', label: '业务字典' },
        { value: 'basic', label: '基础数据' },
        { value: 'custom', label: '自定义字典' },
      ],
    },
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => {
      const category = String(row.category || 'custom');
      const label = categoryLabels[category] || category;
      return React.createElement(
        'span',
        {
          style: {
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: 'var(--color-primary-lighter, #e3f2fd)',
            color: 'var(--color-primary-main, #1976d2)',
          },
        },
        label
      );
    },
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
    showInList: false,
  },
  {
    name: 'status',
    label: '状态',
    type: 'switch',
    defaultValue: 'active',
    listWidth: 80,
    renderCell: (row: Record<string, unknown>) => {
      const status = String(row.status || 'active');
      const isActive = status === 'active';
      return React.createElement(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          },
        },
        React.createElement('span', {
          style: {
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isActive ? 'success.main' : 'error.main',
          },
        }),
        React.createElement(
          'span',
          { style: { fontSize: '0.875rem' } },
          statusLabels[status] || status
        )
      );
    },
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'text',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
    renderCell: (row: Record<string, unknown>) => {
      const date = row.created_at
        ? new Date(row.created_at as string).toLocaleDateString('zh-CN')
        : '-';
      return React.createElement(
        'span',
        { style: { color: 'text.secondary', fontSize: '0.875rem' } },
        date
      );
    },
  },
];

export const dictTypeSchema: EntitySchema = {
  entity: 'dict-type',
  title: '字典类型',
  description: '管理系统字典类型，如订单状态、用户类型等',
  api: {
    module: 'system',
    resource: 'dict-types',
  },
  fields: dictTypeFields,
  actions: ['create', 'edit', 'delete'],
  list: {
    columns: ['code', 'name', 'category', 'status', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 20,
    selectable: false,
    filters: [
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'system', label: '系统字典' },
          { value: 'business', label: '业务字典' },
          { value: 'basic', label: '基础数据' },
          { value: 'custom', label: '自定义字典' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: '启用',
        inactive: '禁用',
      },
    },
  },
  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'description'],
    },
  ],
  formColCount: 2,
  createTitle: '新增字典类型',
  editTitle: '编辑字典类型',
  detailTitle: '字典类型详情',
};

export const dictItemFields: SchemaField[] = [
  {
    name: 'sort_order',
    label: '排序',
    type: 'number',
    defaultValue: 0,
    listWidth: 70,
    renderCell: (row: Record<string, unknown>) => {
      const order = row.sort_order ?? 0;
      return React.createElement(
        'span',
        { style: { color: 'text.secondary', fontSize: '0.875rem' } },
        String(order)
      );
    },
  },
  {
    name: 'code',
    label: '编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => {
      const code = String(row.code || '');
      return React.createElement('span', { style: { fontFamily: 'monospace' } }, code);
    },
  },
  {
    name: 'name',
    label: '名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
    sortable: true,
    renderCell: (row: Record<string, unknown>) => {
      const name = String(row.name || '');
      const hasParent = !!row.parentId;
      return React.createElement(
        'span',
        { style: { display: 'flex', alignItems: 'center' } },
        hasParent
          ? React.createElement(
              'span',
              { style: { color: 'text.disabled', marginRight: '4px' } },
              '└─'
            )
          : null,
        React.createElement('span', null, name)
      );
    },
  },
  {
    name: 'value',
    label: '值',
    type: 'text',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const value = String(row.value || '-');
      return React.createElement(
        'span',
        { style: { color: 'text.secondary', fontSize: '0.875rem' } },
        value
      );
    },
  },
  {
    name: 'status',
    label: '状态',
    type: 'switch',
    defaultValue: 'active',
    listWidth: 80,
    renderCell: (row: Record<string, unknown>) => {
      const status = String(row.status || 'active');
      const isActive = status === 'active';
      return React.createElement(
        'span',
        {
          style: { display: 'flex', alignItems: 'center', gap: '4px' },
        },
        React.createElement('span', {
          style: {
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isActive ? 'success.main' : 'error.main',
          },
        }),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '0.75rem',
              fontWeight: 500,
              color: isActive ? 'success.main' : 'text.disabled',
            },
          },
          statusLabels[status] || status
        )
      );
    },
  },
  {
    name: 'parentId',
    label: '上级字典项',
    type: 'select',
    listWidth: 120,
    showInList: false,
  },
];

export const dictItemSchema: EntitySchema = {
  entity: 'dict-item',
  title: '字典项',
  description: '管理字典类型下的具体选项',
  api: {
    module: 'system',
    resource: 'dict-items',
  },
  fields: dictItemFields,
  actions: ['create', 'edit', 'delete'],
  list: {
    columns: ['sort_order', 'code', 'name', 'value', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: '启用',
        inactive: '禁用',
      },
    },
  },
  batchActions: [
    {
      key: 'batch-delete',
      label: '批量删除',
      color: 'error',
      icon: React.createElement(React.Fragment),
      onClick: async (selectedIds) => {
        const results = await Promise.all(selectedIds.map((id) => dictItemApi.delete(id)));
        const successCount = results.filter((r) => r.success).length;
        if (successCount < selectedIds.length) {
          throw new Error(
            `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`
          );
        }
      },
      confirm: true,
      confirmMessage: '确定要删除选中的字典项吗？',
    },
  ],
  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'value', 'sort_order', 'parentId'],
    },
  ],
  formColCount: 2,
  createTitle: '新增字典项',
  editTitle: '编辑字典项',
  detailTitle: '字典项详情',
};

export async function toggleDictItemStatus(id: string, currentStatus: string): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const res = await dictItemApi.update(id, { status: newStatus });
  if (!res.success) throw new Error(res.message || '状态切换失败');
}
