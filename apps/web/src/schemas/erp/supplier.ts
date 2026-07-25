/**
 * 供应商管理 Schema — 驱动 SupplierManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、筛选等高级功能。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { erpApi } from '@/api/erp';

/**
 * 供应商管理 Schema
 */
export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: '供应商管理',
  description: '管理供应商基础信息，包括编码、名称、联系人、信用等级等',

  api: {
    module: 'erp',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'supplier_code',
      label: '供应商编码',
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
      listWidth: 160,
    },
    {
      name: 'short_name',
      label: '简称',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'category',
      label: '供应商分类',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '原材料供应商', label: '原材料供应商' },
          { value: '配件供应商', label: '配件供应商' },
          { value: '设备供应商', label: '设备供应商' },
          { value: '服务供应商', label: '服务供应商' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'credit_rating',
      label: '信用等级',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'AAA', label: 'AAA (极好)' },
          { value: 'AA', label: 'AA (优良)' },
          { value: 'A', label: 'A (良好)' },
          { value: 'BBB', label: 'BBB (一般)' },
          { value: 'BB', label: 'BB (较差)' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '正常合作' },
          { value: 'inactive', label: '暂停合作' },
          { value: 'blacklisted', label: '黑名单' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'contact_person',
      label: '联系人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'contact_phone',
      label: '联系电话',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_email',
      label: '电子邮箱',
      type: 'text',
      showInList: false,
    },
    {
      name: 'address',
      label: '详细地址',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'country',
      label: '国家',
      type: 'text',
      defaultValue: '中国',
      showInList: false,
    },
    {
      name: 'province',
      label: '省份',
      type: 'text',
      showInList: false,
    },
    {
      name: 'city',
      label: '城市',
      type: 'text',
      showInList: false,
    },
    {
      name: 'zip_code',
      label: '邮编',
      type: 'text',
      showInList: false,
    },
    {
      name: 'tax_number',
      label: '税号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_name',
      label: '开户银行',
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_account',
      label: '银行账号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'remark',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'supplier_code',
      'supplier_name',
      'contact_person',
      'contact_phone',
      'category',
      'credit_rating',
      'status',
    ],
    searchFields: ['supplier_code', 'supplier_name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        blacklisted: 'error',
      },
      labelMap: {
        active: '正常合作',
        inactive: '暂停合作',
        blacklisted: '黑名单',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常合作', value: 'active' },
          { label: '暂停合作', value: 'inactive' },
          { label: '黑名单', value: 'blacklisted' },
        ],
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '原材料供应商', value: '原材料供应商' },
          { label: '配件供应商', value: '配件供应商' },
          { label: '设备供应商', value: '设备供应商' },
          { label: '服务供应商', value: '服务供应商' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['supplier_code', 'supplier_name', 'short_name', 'category', 'status', 'credit_rating'],
    },
    {
      title: '联系信息',
      fields: ['contact_person', 'contact_phone', 'contact_email', 'address', 'country', 'province', 'city', 'zip_code'],
    },
    {
      title: '财务信息',
      fields: ['tax_number', 'bank_name', 'bank_account'],
    },
    {
      title: '备注',
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: '新增供应商',
  editTitle: '编辑供应商',
  detailTitle: '供应商详情',
};
