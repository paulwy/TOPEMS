import React from 'react';
import { Box, Chip } from '@mui/material';
import { File, FileText, BookOpen, Folder } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '设计文档', label: '设计文档' },
  { value: '接口文档', label: '接口文档' },
  { value: '用户文档', label: '用户文档' },
  { value: '测试文档', label: '测试文档' },
  { value: '运维文档', label: '运维文档' },
];

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'default'> = {
  published: 'success',
  draft: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
};

const getDocTypeIcon = (type: string) => {
  switch (type) {
    case '设计文档':
      return React.createElement(File, { size: 16, color: 'primary.main' });
    case '接口文档':
      return React.createElement(FileText, { size: 16, color: 'primary.main' });
    case '用户文档':
      return React.createElement(BookOpen, { size: 16, color: 'primary.main' });
    default:
      return React.createElement(Folder, { size: 16, color: 'primary.main' });
  }
};

export const docSchema: EntitySchema = {
  entity: 'rd_doc',
  title: '文档',
  description: '管理项目文档和版本',

  api: {
    module: 'rd',
    resource: 'docs',
  },

  fields: [
    {
      name: 'doc_name',
      label: '文档名称',
      type: 'text',
      required: true,
      listWidth: 250,
      renderCell: (row: Record<string, unknown>) => {
        const type = String(row.doc_type ?? '');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          getDocTypeIcon(type),
          String(row.doc_name ?? '')
        );
      },
    },
    {
      name: 'doc_type',
      label: '文档类型',
      type: 'select',
      defaultValue: '设计文档',
      options: { type: 'static', options: DOC_TYPE_OPTIONS },
      listWidth: 120,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          label: String(row.version ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
    },
    {
      name: 'author',
      label: '作者',
      type: 'text',
      listWidth: 120,
      hideInForm: true,
    },
    {
      name: 'update_time',
      label: '更新时间',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'published', label: '已发布' },
          { value: 'draft', label: '草稿' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['doc_name', 'doc_type', 'version', 'author', 'update_time', 'status'],
    searchFields: ['doc_name', 'author'],
    pageSize: 10,
    filters: [
      {
        id: 'doc_type',
        label: '文档类型',
        type: 'select',
        options: [{ label: '全部', value: 'all' }, ...DOC_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '已发布', value: 'published' },
          { label: '草稿', value: 'draft' },
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
      fields: ['doc_name', 'doc_type', 'status'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建文档',
  editTitle: '编辑文档',
  detailTitle: '文档详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
