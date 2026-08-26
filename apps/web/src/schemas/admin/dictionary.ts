import React from 'react';
import type { EntitySchema, SchemaField } from '@/schema/types';
import { dictItemApi } from '@/api/system';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';

const statusLabels: Record<string, string> = {
  active: i18n.t('admin.dictionary.k4'),
  inactive: i18n.t('admin.dictionary.k5'),
};

const dictItemFields: SchemaField[] = [
  {
    name: 'sort_order',
    label: i18n.t('schema:admin.dict_type.label'),
    type: 'number',
    defaultValue: 0,
    listWidth: 70,
    renderCell: (row: Record<string, unknown>) => {
      const order = row.sort_order ?? 0;
      return React.createElement(
        'span',
        {
          style: {
            color: 'text.secondary',
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
          },
        },
        String(order)
      );
    },
  },
  {
    name: 'code',
    label: i18n.t('schema:admin.dict_type.label'),
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
    label: i18n.t('schema:admin.dict_type.label'),
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
          ? React.createElement('span', { style: { color: 'text.disabled', marginRight: 1 } }, '└─')
          : null,
        React.createElement('span', null, name)
      );
    },
  },
  {
    name: 'value',
    label: i18n.t('schema:admin.dict_type.label'),
    type: 'text',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const value = String(row.value || '-');
      return React.createElement(
        'span',
        {
          style: {
            color: 'text.secondary',
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
          },
        },
        value
      );
    },
  },
  {
    name: 'status',
    label: i18n.t('schema:admin.dict_type.label'),
    type: 'switch',
    defaultValue: 'active',
    listWidth: 80,
    renderCell: (row: Record<string, unknown>) => {
      const status = String(row.status || 'active');
      const isActive = status === 'active';
      return React.createElement(
        'span',
        {
          style: { display: 'flex', alignItems: 'center', gap: 1 },
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
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
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
    label: i18n.t('schema:admin.dict_type.label'),
    type: 'select',
    listWidth: 120,
    showInList: false,
  },
];

export const dictItemSchema: EntitySchema = {
  entity: 'dict-item',
  title: i18n.t('schema:admin.dict_item.section.0.title'),
  description: i18n.t('schema:admin.dict_item.meta.description'),
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
        label: i18n.t('schema:admin.dict_item.filter.status.label'),
        type: 'select',
        options: [
          { value: 'all', label: i18n.t('schema:admin.dict_item.filter.status.option.all') },
          { value: 'active', label: i18n.t('schema:admin.dict_item.filter.status.option.active') },
          {
            value: 'inactive',
            label: i18n.t('schema:admin.dict_item.filter.status.option.inactive'),
          },
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
        active: i18n.t('schema:admin.dict_item.status.option.active'),
        inactive: i18n.t('schema:admin.dict_item.status.option.inactive'),
      },
    },
  },
  batchActions: [
    {
      key: 'batch-delete',
      label: i18n.t('schema:admin.dict_item.batchAction.batch-delete.label'),
      color: 'error',
      icon: React.createElement(React.Fragment),
      onClick: async (selectedIds) => {
        const results = await Promise.all(selectedIds.map((id) => dictItemApi.delete(id)));
        const successCount = results.filter((r) => r.success).length;
        if (successCount < selectedIds.length) {
          throw new Error(
            `${i18n.t('shared.dictionary.k0')}${successCount}${i18n.t('shared.dictionary.k1')}${selectedIds.length - successCount}${i18n.t('shared.dictionary.k2')}`
          );
        }
      },
      confirm: true,
      confirmMessage: i18n.t('schema:admin.dict_item.batchAction.batch-delete.confirmMessage'),
    },
  ],
  formSections: [
    {
      title: i18n.t('schema:admin.dict_item.section.0.title'),
      fields: ['code', 'name', 'value', 'sort_order', 'parentId'],
    },
  ],
  formColCount: 2,
  createTitle: i18n.t('schema:admin.dict_item.meta.createTitle'),
  editTitle: i18n.t('schema:admin.dict_item.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.dict_item.meta.detailTitle'),
};

export async function toggleDictItemStatus(id: string, currentStatus: string): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const res = await dictItemApi.update(id, { status: newStatus });
  if (!res.success) throw new Error(res.message || i18n.t('admin.dictionary.k16'));
}
