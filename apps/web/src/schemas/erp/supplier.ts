/**
 * 供应商管理 Schema — 驱动 SupplierManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、筛选等高级功能。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';

/**
 * 供应商管理 Schema
 */
export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: i18n.t('schema:erp.supplier.meta.title'),
  description: i18n.t('schema:erp.supplier.meta.description'),

  api: {
    module: 'erp',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'supplier_code',
      label: i18n.t('schema:erp.supplier.supplier_code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: i18n.t('schema:erp.supplier.supplier_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'short_name',
      label: i18n.t('schema:erp.supplier.short_name.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'category',
      label: i18n.t('schema:erp.supplier.category.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '原材料供应商', label: i18n.t('schema:erp.supplier.category.option.原材料供应商') },
          { value: '配件供应商', label: i18n.t('schema:erp.supplier.category.option.配件供应商') },
          { value: '设备供应商', label: i18n.t('schema:erp.supplier.category.option.设备供应商') },
          { value: '服务供应商', label: i18n.t('schema:erp.supplier.category.option.服务供应商') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'credit_rating',
      label: i18n.t('schema:erp.supplier.credit_rating.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'AAA', label: i18n.t('schema:erp.supplier.credit_rating.option.AAA') },
          { value: 'AA', label: i18n.t('schema:erp.supplier.credit_rating.option.AA') },
          { value: 'A', label: i18n.t('schema:erp.supplier.credit_rating.option.A') },
          { value: 'BBB', label: i18n.t('schema:erp.supplier.credit_rating.option.BBB') },
          { value: 'BB', label: i18n.t('schema:erp.supplier.credit_rating.option.BB') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.supplier.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.supplier.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.supplier.status.option.inactive') },
          { value: 'blacklisted', label: i18n.t('schema:erp.supplier.status.option.blacklisted') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'contact_person',
      label: i18n.t('schema:erp.supplier.contact_person.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'contact_phone',
      label: i18n.t('schema:erp.supplier.contact_phone.label'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_email',
      label: i18n.t('schema:erp.supplier.contact_email.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'address',
      label: i18n.t('schema:erp.supplier.address.label'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'country',
      label: i18n.t('schema:erp.supplier.country.label'),
      type: 'text',
      defaultValue: '中国',
      showInList: false,
    },
    {
      name: 'province',
      label: i18n.t('schema:erp.supplier.province.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'city',
      label: i18n.t('schema:erp.supplier.city.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'zip_code',
      label: i18n.t('schema:erp.supplier.zip_code.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'tax_number',
      label: i18n.t('schema:erp.supplier.tax_number.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_name',
      label: i18n.t('schema:erp.supplier.bank_name.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_account',
      label: i18n.t('schema:erp.supplier.bank_account.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'remark',
      label: i18n.t('schema:erp.supplier.remark.label'),
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
        active: i18n.t('schema:erp.supplier.status.option.active'),
        inactive: i18n.t('schema:erp.supplier.status.option.inactive'),
        blacklisted: i18n.t('schema:erp.supplier.status.option.blacklisted'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.supplier.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.supplier.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.supplier.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.supplier.filter.status.option.inactive'), value: 'inactive' },
          { label: i18n.t('schema:erp.supplier.filter.status.option.blacklisted'), value: 'blacklisted' },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.supplier.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.supplier.filter.category.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.supplier.filter.category.option.原材料供应商'), value: '原材料供应商' },
          { label: i18n.t('schema:erp.supplier.filter.category.option.配件供应商'), value: '配件供应商' },
          { label: i18n.t('schema:erp.supplier.filter.category.option.设备供应商'), value: '设备供应商' },
          { label: i18n.t('schema:erp.supplier.filter.category.option.服务供应商'), value: '服务供应商' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.supplier.section.0.title'),
      fields: [
        'supplier_code',
        'supplier_name',
        'short_name',
        'category',
        'status',
        'credit_rating',
      ],
    },
    {
      title: i18n.t('schema:erp.supplier.section.1.title'),
      fields: [
        'contact_person',
        'contact_phone',
        'contact_email',
        'address',
        'country',
        'province',
        'city',
        'zip_code',
      ],
    },
    {
      title: i18n.t('schema:erp.supplier.section.2.title'),
      fields: ['tax_number', 'bank_name', 'bank_account'],
    },
    {
      title: i18n.t('schema:erp.supplier.section.3.title'),
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('schema:erp.supplier.meta.createTitle'),
  editTitle: i18n.t('schema:erp.supplier.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.supplier.meta.detailTitle'),
};
