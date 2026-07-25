/**
 * 客户管理 Schema — 驱动 CustomerManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、多筛选条件等高级功能。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

/**
 * 客户管理 Schema
 */
export const customerSchema: EntitySchema = {
  entity: 'customer',
  title: '客户管理',
  description: '管理客户基础信息，包括编码、名称、联系人、信用等级等',

  api: {
    module: 'erp',
    resource: 'customers',
  },

  fields: [
    {
      name: 'customer_code',
      label: '客户编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'customer_name',
      label: '客户名称',
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
      label: '客户分类',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '大型企业', label: '大型企业' },
          { value: '中型企业', label: '中型企业' },
          { value: '小型企业', label: '小型企业' },
          { value: '政府机构', label: '政府机构' },
          { value: '个人客户', label: '个人客户' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'industry',
      label: '所属行业',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '电子制造', label: '电子制造' },
          { value: '机械制造', label: '机械制造' },
          { value: '化工', label: '化工' },
          { value: '金融', label: '金融' },
          { value: '互联网', label: '互联网' },
          { value: '医疗', label: '医疗' },
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
      name: 'credit_limit',
      label: '信用额度',
      type: 'number',
      defaultValue: 0,
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
      'customer_code',
      'customer_name',
      'contact_person',
      'contact_phone',
      'category',
      'industry',
      'credit_rating',
      'status',
    ],
    searchFields: ['customer_code', 'customer_name', 'contact_person'],
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
          { label: '大型企业', value: '大型企业' },
          { label: '中型企业', value: '中型企业' },
          { label: '小型企业', value: '小型企业' },
          { label: '政府机构', value: '政府机构' },
          { label: '个人客户', value: '个人客户' },
        ],
      },
      {
        id: 'industry',
        label: '行业',
        type: 'select',
        options: [
          { label: '全部行业', value: 'all' },
          { label: '电子制造', value: '电子制造' },
          { label: '机械制造', value: '机械制造' },
          { label: '化工', value: '化工' },
          { label: '金融', value: '金融' },
          { label: '互联网', value: '互联网' },
          { label: '医疗', value: '医疗' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['customer_code', 'customer_name', 'short_name', 'category', 'industry', 'status'],
    },
    {
      title: '联系信息',
      fields: ['contact_person', 'contact_phone', 'contact_email', 'address', 'country', 'province', 'city', 'zip_code'],
    },
    {
      title: '财务与信用',
      fields: ['tax_number', 'bank_name', 'bank_account', 'credit_limit', 'credit_rating'],
    },
    {
      title: '备注',
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: '新增客户',
  editTitle: '编辑客户',
  detailTitle: '客户详情',
};
