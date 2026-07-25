import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const riskLevelConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: '低风险', color: 'success' },
  medium: { label: '中风险', color: 'warning' },
  high: { label: '高风险', color: 'error' },
};

export const supplierAdmissionSchema: EntitySchema = {
  entity: 'supplierAdmission',
  title: '供应商准入管理',
  description: '管理供应商准入流程，包括资质审核、风险评估、正式准入等',

  api: {
    module: 'scm',
    resource: 'supplierAdmissions',
  },

  fields: [
    {
      name: 'admission_no',
      label: '申请单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'short_name',
      label: '简称',
      type: 'text',
      showInList: false,
    },
    {
      name: 'supplier_category',
      label: '供应商类别',
      type: 'select',
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: '原材料供应商' },
          { value: 'component', label: '零部件供应商' },
          { value: 'equipment', label: '设备供应商' },
          { value: 'service', label: '服务供应商' },
          { value: 'packaging', label: '包装材料供应商' },
          { value: 'other', label: '其他供应商' },
        ],
      },
      listWidth: 140,
    },
    {
      name: 'contact_person',
      label: '联系人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_phone',
      label: '联系电话',
      type: 'text',
      listWidth: 130,
    },
    {
      name: 'contact_email',
      label: '联系邮箱',
      type: 'text',
      showInList: false,
    },
    {
      name: 'applicant',
      label: '申请人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'address',
      label: '地址',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'business_license',
      label: '营业执照号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'tax_registration',
      label: '税务登记号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'organization_code',
      label: '组织机构代码',
      type: 'text',
      showInList: false,
    },
    {
      name: 'legal_representative',
      label: '法定代表人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'registered_capital',
      label: '注册资本',
      type: 'text',
      showInList: false,
    },
    {
      name: 'established_date',
      label: '成立日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'business_scope',
      label: '经营范围',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'risk_level',
      label: '风险等级',
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低风险' },
          { value: 'medium', label: '中风险' },
          { value: 'high', label: '高风险' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.risk_level ?? 'medium');
        const config = riskLevelConfig[value] || riskLevelConfig.medium;
        return React.createElement(Chip, {
          label: config.label,
          size: 'small',
          color: config.color,
          variant: 'outlined',
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      hideInForm: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'pending', label: '待审核' },
          { value: 'auditing', label: '审核中' },
          { value: 'approved', label: '已通过' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'active', label: '已准入' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'application_date',
      label: '申请日期',
      type: 'date',
      hideInForm: true,
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'admission_no',
      'supplier_name',
      'supplier_category',
      'contact_person',
      'contact_phone',
      'risk_level',
      'status',
      'applicant',
      'application_date',
    ],
    searchFields: ['admission_no', 'supplier_name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        auditing: 'primary',
        approved: 'success',
        rejected: 'error',
        active: 'success',
        cancelled: 'default',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审核',
        auditing: '审核中',
        approved: '已通过',
        rejected: '已拒绝',
        active: '已准入',
        cancelled: '已取消',
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
          { label: '待审核', value: 'pending' },
          { label: '审核中', value: 'auditing' },
          { label: '已通过', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已准入', value: 'active' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      {
        id: 'supplier_category',
        label: '供应商类别',
        type: 'select',
        options: [
          { label: '全部类别', value: 'all' },
          { label: '原材料供应商', value: 'raw_material' },
          { label: '零部件供应商', value: 'component' },
          { label: '设备供应商', value: 'equipment' },
          { label: '服务供应商', value: 'service' },
          { label: '包装材料供应商', value: 'packaging' },
          { label: '其他供应商', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: [
        'admission_no',
        'supplier_name',
        'short_name',
        'supplier_category',
        'contact_person',
        'contact_phone',
        'contact_email',
        'applicant',
        'address',
      ],
    },
    {
      title: '资质信息',
      fields: [
        'business_license',
        'tax_registration',
        'organization_code',
        'legal_representative',
        'registered_capital',
        'established_date',
        'business_scope',
      ],
    },
    {
      title: '其他',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商准入',
  editTitle: '编辑供应商准入',
  detailTitle: '供应商准入详情',
};
