import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import { pdmApi } from '@/api/pdm';


import { QUERY_KEYS } from '@/lib/reactQuery';

const VERSION_TYPE_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  major: 'error',
  minor: 'warning',
  patch: 'success',
};

const VERSION_TYPE_LABEL_MAP: Record<string, string> = {
  major: '重大版本',
  minor: '次要版本',
  patch: '补丁版本',
};

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  published: 'success',
  draft: 'warning',
  review: 'info',
  approved: 'default',
  deprecated: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  review: '审核中',
  approved: '已批准',
  deprecated: '已废弃',
};

export const versionSchema: EntitySchema = {
  entity: 'pdm_version',
  title: '文档版本',
  description: '管理文档版本，包括版本号、标题、描述、类型、状态等',

  api: {
    module: 'pdm',
    resource: 'versions',
  },

  fields: [
    {
      name: 'version_number',
      label: '版本号',
      type: 'text',
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'title',
      label: '版本标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'type',
      label: '版本类型',
      type: 'select',
      required: true,
      defaultValue: 'minor',
      options: {
        type: 'static',
        options: [
          { value: 'major', label: '重大版本 (Major)' },
          { value: 'minor', label: '次要版本 (Minor)' },
          { value: 'patch', label: '补丁版本 (Patch)' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.type ?? '');
        const color = VERSION_TYPE_COLOR_MAP[val] || 'default';
        const label = VERSION_TYPE_LABEL_MAP[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
        });
      },
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
          { value: 'review', label: '审核中' },
          { value: 'approved', label: '已批准' },
          { value: 'published', label: '已发布' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'changes',
      label: '变更内容',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_by',
      label: '创建人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
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
    {
      name: 'document_id',
      label: '关联文档',
      type: 'select',
      required: true,
      showInList: false,
      showInDetail: false,
      options: {
        type: 'static',
        options: [],
      },
    },
  ],

  list: {
    pageSize: 20,
    searchFields: ['version_number', 'title', 'description'],
    filters: [
      {
        id: 'document',
        label: '关联文档',
        type: 'select',
        options: [{ label: '全部文档', value: 'all' }],
        defaultValue: 'all',
      },
      {
        id: 'type',
        label: '版本类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '重大版本', value: 'major' },
          { label: '次要版本', value: 'minor' },
          { label: '补丁版本', value: 'patch' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        review: 'info',
        approved: 'default',
        published: 'success',
      },
      labelMap: {
        draft: '草稿',
        review: '审核中',
        approved: '已批准',
        published: '已发布',
      },
    },
  },

  dynamicOptions: [
    {
      field: 'document_id',
      loader: async () => {
        const response = await pdmApi.listDocuments();
        if (response.success && response.data) {
          const data = response.data as unknown as Record<string, unknown>;
          const docs = (Array.isArray(data) ? data : data.documents || []) as Array<{
            id: string;
            name: string;
          }>;
          return docs.map((d) => ({ value: d.id, label: d.name }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.PDM_DOCUMENTS_VERSION_FORM_BASE,
    },
  ],

  formSections: [
    {
      title: '基本信息',
      fields: ['document_id', 'version_number', 'title', 'type', 'status'],
    },
    {
      title: '版本详情',
      fields: ['description', 'changes'],
    },
  ],

  formColCount: 2,
  createTitle: '创建新版本',
  editTitle: '编辑版本',
  detailTitle: '版本详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
