import type { EntitySchema } from '@/schema';

export const documentSchema: EntitySchema = {
  entity: 'pdm_document',
  title: '文档管理',
  description: '管理产品文档，包括文档编号、名称、类型、版本、状态等',

  api: {
    module: 'pdm',
    resource: 'documents',
  },

  fields: [
    {
      name: 'document_no',
      label: '文档编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '文档名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: '文档类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'specification', label: '规格书' },
          { value: 'manual', label: '手册' },
          { value: 'drawing', label: '图纸' },
          { value: 'report', label: '报告' },
          { value: 'procedure', label: '程序文件' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'category',
      label: '分类',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'current_version',
      label: '当前版本',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'version_count',
      label: '版本数',
      type: 'number',
      listWidth: 80,
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
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'uploader_name',
      label: '上传人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'document_no',
      'name',
      'type',
      'category',
      'current_version',
      'uploader_name',
      'status',
    ],
    searchFields: ['document_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        review: 'warning',
        approved: 'info',
        published: 'success',
        archived: 'default',
      },
      labelMap: {
        draft: '草稿',
        review: '审核中',
        approved: '已批准',
        published: '已发布',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '审核中', value: 'review' },
          { label: '已批准', value: 'approved' },
          { label: '已发布', value: 'published' },
          { label: '已归档', value: 'archived' },
        ],
      },
      {
        id: 'type',
        label: '文档类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '规格书', value: 'specification' },
          { label: '手册', value: 'manual' },
          { label: '图纸', value: 'drawing' },
          { label: '报告', value: 'report' },
          { label: '程序文件', value: 'procedure' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['document_no', 'name', 'type', 'category'],
    },
    {
      title: '版本信息',
      fields: ['current_version', 'version_count'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增文档',
  editTitle: '编辑文档',
  detailTitle: '文档详情',
};
