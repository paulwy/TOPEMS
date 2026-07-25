import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { FlaskConical } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  testing: 'warning',
  approved: 'success',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: '草稿',
  testing: '测试中',
  approved: '已发布',
};

export const formulaSchema: EntitySchema = {
  entity: 'rd_formula',
  title: '配方管理',
  description: '管理研发配方、版本控制、配方发布',

  api: {
    module: 'rd',
    resource: 'formulas',
  },

  fields: [
    {
      name: 'code',
      label: '配方编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(FlaskConical, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.code ?? '')
          )
        );
      },
    },
    {
      name: 'name',
      label: '配方名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      required: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.version ?? '');
        if (!val) return '-';
        return React.createElement(Chip, { label: val, size: 'small' });
      },
    },
    {
      name: 'project_id',
      label: '所属项目',
      type: 'text',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.project_id ?? '');
        return val || '-';
      },
    },
    {
      name: 'category',
      label: '分类',
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'testing', label: '测试中' },
          { value: 'approved', label: '已发布' },
        ],
      },
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'approval_status',
      label: '审批状态',
      type: 'text',
      showInList: false,
    },
    {
      name: 'approved_by',
      label: '审批人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'approved_at',
      label: '审批时间',
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'effective_date',
      label: '生效日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'expiration_date',
      label: '失效日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'process_steps',
      label: '工艺步骤',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_by',
      label: '创建人',
      type: 'text',
      readonly: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'version', 'project_id', 'status', 'created_by', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态筛选',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '测试中', value: 'testing' },
          { label: '已发布', value: 'approved' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'version', 'project_id', 'category', 'status'],
    },
    {
      title: '有效期',
      fields: ['effective_date', 'expiration_date'],
    },
    {
      title: '描述信息',
      fields: ['description', 'process_steps'],
    },
  ],

  formColCount: 2,
  createTitle: '新增配方',
  editTitle: '编辑配方',
  detailTitle: '配方详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
