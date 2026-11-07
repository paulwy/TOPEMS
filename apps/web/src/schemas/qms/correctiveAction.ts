import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const priorityColorMap: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const priorityLabelMap: Record<string, string> = {
  high: i18n.t('qms.corrective_action.priority_high'),
  medium: i18n.t('qms.corrective_action.priority_medium'),
  low: i18n.t('qms.corrective_action.priority_low'),
};

export const correctiveActionSchema: EntitySchema = {
  entity: 'corrective_action',
  title: i18n.t('qms.corrective_action.title'),
  description: i18n.t('qms.corrective_action.description'),

  api: {
    module: 'qms',
    resource: 'actions',
    listMethod: 'list',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'qms:action',

  fields: [
    {
      name: 'action_no',
      label: i18n.t('qms.corrective_action.action_no'),
      type: 'text',
      readonlyOnEdit: true,
      hideInForm: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'title',
      label: i18n.t('qms.corrective_action.title_field'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
      placeholder: i18n.t('qms.corrective_action.title_placeholder'),
    },
    {
      name: 'root_cause',
      label: i18n.t('qms.corrective_action.root_cause'),
      type: 'textarea',
      showInList: false,
      rows: 3,
      colSpan: 2,
      placeholder: i18n.t('qms.corrective_action.root_cause_placeholder'),
    },
    {
      name: 'action_type',
      label: i18n.t('qms.corrective_action.action_type'),
      type: 'text',
      listWidth: 130,
      placeholder: i18n.t('qms.corrective_action.action_type_placeholder'),
    },
    {
      name: 'priority',
      label: i18n.t('qms.corrective_action.priority'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: priorityLabelMap.high },
          { value: 'medium', label: priorityLabelMap.medium },
          { value: 'low', label: priorityLabelMap.low },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.priority ?? '');
        const color = priorityColorMap[val] || 'default';
        const label = priorityLabelMap[val] || val;
        return React.createElement(Chip, { label, size: 'small', color, variant: 'filled' });
      },
      filterable: true,
    },
    {
      name: 'status',
      label: i18n.t('qms.corrective_action.status'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('qms.corrective_action.status_pending') },
          { value: 'in_progress', label: i18n.t('qms.corrective_action.status_in_progress') },
          { value: 'completed', label: i18n.t('qms.corrective_action.status_completed') },
        ],
      },
      listWidth: 110,
      filterable: true,
    },
    {
      name: 'assignee',
      label: i18n.t('qms.corrective_action.assignee'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('qms.corrective_action.assignee_placeholder'),
    },
    {
      name: 'target_date',
      label: i18n.t('qms.corrective_action.target_date'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('qms.corrective_action.description_field'),
      type: 'textarea',
      showInList: false,
      rows: 3,
      colSpan: 2,
      placeholder: i18n.t('qms.corrective_action.description_placeholder'),
    },
    {
      name: 'created_at',
      label: i18n.t('qms.corrective_action.created_at'),
      type: 'date',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'action_no'],
    filters: [
      {
        id: 'status',
        label: i18n.t('qms.corrective_action.status'),
        type: 'select',
        options: [
          { label: i18n.t('qms.corrective_action.filter_all'), value: 'all' },
          { label: i18n.t('qms.corrective_action.status_pending'), value: 'pending' },
          { label: i18n.t('qms.corrective_action.status_in_progress'), value: 'in_progress' },
          { label: i18n.t('qms.corrective_action.status_completed'), value: 'completed' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: i18n.t('qms.corrective_action.priority'),
        type: 'select',
        options: [
          { label: i18n.t('qms.corrective_action.filter_all'), value: 'all' },
          { label: priorityLabelMap.high, value: 'high' },
          { label: priorityLabelMap.medium, value: 'medium' },
          { label: priorityLabelMap.low, value: 'low' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        in_progress: 'info',
        completed: 'success',
      },
      labelMap: {
        pending: i18n.t('qms.corrective_action.status_pending'),
        in_progress: i18n.t('qms.corrective_action.status_in_progress'),
        completed: i18n.t('qms.corrective_action.status_completed'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.corrective_action.section_basic'),
      fields: ['title', 'priority', 'status', 'assignee', 'target_date', 'action_type'],
    },
    {
      title: i18n.t('qms.corrective_action.section_detail'),
      fields: ['root_cause', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.corrective_action.create_title'),
  editTitle: i18n.t('qms.corrective_action.edit_title'),
  detailTitle: i18n.t('qms.corrective_action.detail_title'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
