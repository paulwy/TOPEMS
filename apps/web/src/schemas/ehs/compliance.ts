import React from 'react';
import type { EntitySchema } from '@/schema';

export const regulationSchema: EntitySchema = {
  entity: 'ehs_regulation',
  title: '环境法规',
  description: '管理环境法规信息，包括类别、类型、发布机关、状态等',

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listEnvironmentalRegulations',
    createMethod: 'createEnvironmentalRegulation',
    updateMethod: 'updateEnvironmentalRegulation',
    deleteMethod: 'deleteEnvironmentalRegulation',
    getMethod: 'getEnvironmentalRegulation',
  },

  fields: [
    {
      name: 'regulation_no',
      label: '法规编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '法规名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      required: true,
      defaultValue: 'environmental',
      options: {
        type: 'static',
        options: [
          { value: 'environmental', label: '环境法规' },
          { value: 'safety', label: '安全法规' },
          { value: 'health', label: '职业健康' },
          { value: 'chemical', label: '化学品' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'regulation_type',
      label: '法规类型',
      type: 'select',
      required: true,
      defaultValue: 'law',
      options: {
        type: 'static',
        options: [
          { value: 'law', label: '法律' },
          { value: 'regulation', label: '法规' },
          { value: 'standard', label: '标准' },
          { value: 'policy', label: '政策' },
          { value: 'notice', label: '通知' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'issuing_authority',
      label: '发布机关',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => (row.issuing_authority ? String(row.issuing_authority) : '-'),
    },
    {
      name: 'issue_date',
      label: '发布日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.issue_date ? String(row.issue_date) : '-'),
    },
    {
      name: 'effective_date',
      label: '生效日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'content',
      label: '内容',
      type: 'textarea',
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
          { value: 'published', label: '已发布' },
          { value: 'effective', label: '已生效' },
          { value: 'expired', label: '已过期' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'regulation_no',
      'title',
      'regulation_type',
      'issuing_authority',
      'issue_date',
      'status',
    ],
    searchFields: ['title', 'regulation_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        effective: 'success',
        expired: 'error',
        archived: 'default',
      },
      labelMap: {
        draft: '草稿',
        published: '已发布',
        effective: '已生效',
        expired: '已过期',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '已生效', value: 'effective' },
          { label: '已过期', value: 'expired' },
          { label: '已归档', value: 'archived' },
        ],
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '环境法规', value: 'environmental' },
          { label: '安全法规', value: 'safety' },
          { label: '职业健康', value: 'health' },
          { label: '化学品', value: 'chemical' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['regulation_no', 'title', 'category', 'regulation_type'],
    },
    {
      title: '发布信息',
      fields: ['issuing_authority', 'issue_date', 'effective_date'],
    },
    {
      title: '内容与状态',
      fields: ['content', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新建法规',
  editTitle: '编辑法规',
  detailTitle: '法规详情',
};

export const assessmentSchema: EntitySchema = {
  entity: 'ehs_assessment',
  title: '合规评估',
  description: '管理合规评估记录，包括评估类型、评估人、结果等',

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listComplianceAssessments',
    createMethod: 'createComplianceAssessment',
    updateMethod: 'updateComplianceAssessment',
    deleteMethod: 'deleteComplianceAssessment',
    getMethod: 'getComplianceAssessment',
  },

  fields: [
    {
      name: 'assessment_no',
      label: '评估编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '评估名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'assessment_type',
      label: '评估类型',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'assessor',
      label: '评估人',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.assessor ? String(row.assessor) : '-'),
    },
    {
      name: 'assessment_date',
      label: '评估日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.assessment_date ? String(row.assessment_date) : '-'),
    },
    {
      name: 'result',
      label: '评估结果',
      type: 'select',
      defaultValue: 'compliant',
      options: {
        type: 'static',
        options: [
          { value: 'compliant', label: '合规' },
          { value: 'partially_compliant', label: '部分合规' },
          { value: 'non_compliant', label: '不合规' },
        ],
      },
      listWidth: 110,
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
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'approved', label: '已批准' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'assessment_no',
      'title',
      'assessment_type',
      'assessor',
      'assessment_date',
      'result',
      'status',
    ],
    searchFields: ['title', 'assessment_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        in_progress: 'warning',
        completed: 'success',
        approved: 'primary',
      },
      labelMap: {
        draft: '草稿',
        in_progress: '进行中',
        completed: '已完成',
        approved: '已批准',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已批准', value: 'approved' },
        ],
      },
      {
        id: 'result',
        label: '结果',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '合规', value: 'compliant' },
          { label: '部分合规', value: 'partially_compliant' },
          { label: '不合规', value: 'non_compliant' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['assessment_no', 'title', 'assessment_type'],
    },
    {
      title: '评估信息',
      fields: ['assessor', 'assessment_date', 'result'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  detailTitle: '评估详情',
};

export const permitSchema: EntitySchema = {
  entity: 'ehs_permit',
  title: '排污许可证',
  description: '管理排污许可证信息，包括许可证类型、持有人、有效期等',

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listDischargePermits',
    createMethod: 'createDischargePermit',
    updateMethod: 'updateDischargePermit',
    deleteMethod: 'deleteDischargePermit',
    getMethod: 'getDischargePermit',
  },

  fields: [
    {
      name: 'permit_no',
      label: '许可证编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '许可证名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'permit_type',
      label: '许可证类型',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'permit_category',
      label: '许可证类别',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'holder',
      label: '持有人',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.holder ? String(row.holder) : '-'),
    },
    {
      name: 'expiry_date',
      label: '有效期至',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.expiry_date ? String(row.expiry_date) : '-'),
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'valid',
      options: {
        type: 'static',
        options: [
          { value: 'valid', label: '有效' },
          { value: 'expired', label: '已过期' },
          { value: 'revoked', label: '已吊销' },
          { value: 'pending_renewal', label: '待续期' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'permit_no',
      'title',
      'permit_type',
      'permit_category',
      'holder',
      'expiry_date',
      'status',
    ],
    searchFields: ['title', 'permit_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        valid: 'success',
        expired: 'error',
        revoked: 'error',
        pending_renewal: 'warning',
      },
      labelMap: {
        valid: '有效',
        expired: '已过期',
        revoked: '已吊销',
        pending_renewal: '待续期',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '有效', value: 'valid' },
          { label: '已过期', value: 'expired' },
          { label: '已吊销', value: 'revoked' },
          { label: '待续期', value: 'pending_renewal' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['permit_no', 'title', 'permit_type', 'permit_category'],
    },
    {
      title: '持有人信息',
      fields: ['holder', 'expiry_date'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  detailTitle: '许可证详情',
};
