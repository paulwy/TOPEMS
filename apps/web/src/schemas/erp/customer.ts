/**
 * 客户管理 Schema — 驱动 CustomerManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、多筛选条件等高级功能。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

/**
 * 客户管理 Schema
 */
export const customerSchema: EntitySchema = {
  entity: 'customer',
  title: i18n.t('schema:erp.customer.meta.title'),
  description: i18n.t('schema:erp.customer.meta.description'),

  api: {
    module: 'erp',
    resource: 'customers',
  },

  fields: [
    {
      name: 'customer_code',
      label: i18n.t('schema:erp.customer.customer_code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'customer_name',
      label: i18n.t('schema:erp.customer.customer_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'short_name',
      label: i18n.t('schema:erp.customer.short_name.label'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'category',
      label: i18n.t('schema:erp.customer.category.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '大型企业', label: i18n.t('schema:erp.customer.category.option.大型企业') },
          { value: '中型企业', label: i18n.t('schema:erp.customer.category.option.中型企业') },
          { value: '小型企业', label: i18n.t('schema:erp.customer.category.option.小型企业') },
          { value: '政府机构', label: i18n.t('schema:erp.customer.category.option.政府机构') },
          { value: '个人客户', label: i18n.t('schema:erp.customer.category.option.个人客户') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'industry',
      label: i18n.t('schema:erp.customer.industry.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '电子制造', label: i18n.t('schema:erp.customer.industry.option.电子制造') },
          { value: '机械制造', label: i18n.t('schema:erp.customer.industry.option.机械制造') },
          { value: '化工', label: i18n.t('schema:erp.customer.industry.option.化工') },
          { value: '金融', label: i18n.t('schema:erp.customer.industry.option.金融') },
          { value: '互联网', label: i18n.t('schema:erp.customer.industry.option.互联网') },
          { value: '医疗', label: i18n.t('schema:erp.customer.industry.option.医疗') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'credit_rating',
      label: i18n.t('schema:erp.customer.credit_rating.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'AAA', label: i18n.t('schema:erp.customer.credit_rating.option.AAA') },
          { value: 'AA', label: i18n.t('schema:erp.customer.credit_rating.option.AA') },
          { value: 'A', label: i18n.t('schema:erp.customer.credit_rating.option.A') },
          { value: 'BBB', label: i18n.t('schema:erp.customer.credit_rating.option.BBB') },
          { value: 'BB', label: i18n.t('schema:erp.customer.credit_rating.option.BB') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.customer.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.customer.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.customer.status.option.inactive') },
          { value: 'blacklisted', label: i18n.t('schema:erp.customer.status.option.blacklisted') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'contact_person',
      label: i18n.t('schema:erp.customer.contact_person.label'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'contact_phone',
      label: i18n.t('schema:erp.customer.contact_phone.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'contact_email',
      label: i18n.t('schema:erp.customer.contact_email.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'address',
      label: i18n.t('schema:erp.customer.address.label'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'country',
      label: i18n.t('schema:erp.customer.country.label'),
      type: 'text',
      defaultValue: '中国',
      showInList: false,
    },
    {
      name: 'province',
      label: i18n.t('schema:erp.customer.province.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'city',
      label: i18n.t('schema:erp.customer.city.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'zip_code',
      label: i18n.t('schema:erp.customer.zip_code.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'tax_number',
      label: i18n.t('schema:erp.customer.tax_number.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_name',
      label: i18n.t('schema:erp.customer.bank_name.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_account',
      label: i18n.t('schema:erp.customer.bank_account.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'credit_limit',
      label: i18n.t('schema:erp.customer.credit_limit.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'remark',
      label: i18n.t('schema:erp.customer.remark.label'),
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
        active: i18n.t('schema:erp.customer.status.option.active'),
        inactive: i18n.t('schema:erp.customer.status.option.inactive'),
        blacklisted: i18n.t('schema:erp.customer.status.option.blacklisted'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.customer.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.customer.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.customer.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.customer.filter.status.option.inactive'), value: 'inactive' },
          {
            label: i18n.t('schema:erp.customer.filter.status.option.blacklisted'),
            value: 'blacklisted',
          },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.customer.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.customer.filter.category.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.customer.filter.category.option.大型企业'),
            value: '大型企业',
          },
          {
            label: i18n.t('schema:erp.customer.filter.category.option.中型企业'),
            value: '中型企业',
          },
          {
            label: i18n.t('schema:erp.customer.filter.category.option.小型企业'),
            value: '小型企业',
          },
          {
            label: i18n.t('schema:erp.customer.filter.category.option.政府机构'),
            value: '政府机构',
          },
          {
            label: i18n.t('schema:erp.customer.filter.category.option.个人客户'),
            value: '个人客户',
          },
        ],
      },
      {
        id: 'industry',
        label: i18n.t('schema:erp.customer.filter.industry.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.customer.filter.industry.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.customer.filter.industry.option.电子制造'),
            value: '电子制造',
          },
          {
            label: i18n.t('schema:erp.customer.filter.industry.option.机械制造'),
            value: '机械制造',
          },
          { label: i18n.t('schema:erp.customer.filter.industry.option.化工'), value: '化工' },
          { label: i18n.t('schema:erp.customer.filter.industry.option.金融'), value: '金融' },
          { label: i18n.t('schema:erp.customer.filter.industry.option.互联网'), value: '互联网' },
          { label: i18n.t('schema:erp.customer.filter.industry.option.医疗'), value: '医疗' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.customer.section.0.title'),
      fields: ['customer_code', 'customer_name', 'short_name', 'category', 'industry', 'status'],
    },
    {
      title: i18n.t('schema:erp.customer.section.1.title'),
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
      title: i18n.t('schema:erp.customer.section.2.title'),
      fields: ['tax_number', 'bank_name', 'bank_account', 'credit_limit', 'credit_rating'],
    },
    {
      title: i18n.t('schema:erp.customer.section.3.title'),
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('schema:erp.customer.meta.createTitle'),
  editTitle: i18n.t('schema:erp.customer.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.customer.meta.detailTitle'),
};
