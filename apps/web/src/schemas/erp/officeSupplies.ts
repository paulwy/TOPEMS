/**
 * 办公用品管理 Schema — 驱动 OfficeSuppliesPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const officeSuppliesSchema: EntitySchema = {
  entity: 'office_supply',
  title: i18n.t('schema:erp.office_supply.meta.title'),
  description: i18n.t('schema:erp.office_supply.meta.description'),

  api: {
    module: 'erp',
    resource: 'officeSupplies',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:erp.office_supply.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'category',
      label: i18n.t('schema:erp.office_supply.category.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          {
            value: 'stationery',
            label: i18n.t('schema:erp.office_supply.category.option.stationery'),
          },
          {
            value: 'electronics',
            label: i18n.t('schema:erp.office_supply.category.option.electronics'),
          },
          {
            value: 'furniture',
            label: i18n.t('schema:erp.office_supply.category.option.furniture'),
          },
          {
            value: 'consumables',
            label: i18n.t('schema:erp.office_supply.category.option.consumables'),
          },
          { value: 'other', label: i18n.t('schema:erp.office_supply.category.option.other') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'quantity',
      label: i18n.t('schema:erp.office_supply.quantity.label'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 80,
    },
    {
      name: 'unit',
      label: i18n.t('schema:erp.office_supply.unit.label'),
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'price',
      label: i18n.t('schema:erp.office_supply.price.label'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.price as number | undefined;
        return price ? `¥${price.toFixed(2)}` : '-';
      },
    },
    {
      name: 'location',
      label: i18n.t('schema:erp.office_supply.location.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.office_supply.status.label'),
      type: 'select',
      defaultValue: 'in_stock',
      options: {
        type: 'static',
        options: [
          { value: 'in_stock', label: i18n.t('schema:erp.office_supply.status.option.in_stock') },
          { value: 'low_stock', label: i18n.t('schema:erp.office_supply.status.option.low_stock') },
          {
            value: 'out_of_stock',
            label: i18n.t('schema:erp.office_supply.status.option.out_of_stock'),
          },
          {
            value: 'discontinued',
            label: i18n.t('schema:erp.office_supply.status.option.discontinued'),
          },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'category', 'quantity', 'unit', 'price', 'location', 'status'],
    searchFields: ['name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_stock: 'success',
        low_stock: 'warning',
        out_of_stock: 'error',
        discontinued: 'default',
      },
      labelMap: {
        in_stock: i18n.t('schema:erp.office_supply.status.option.in_stock'),
        low_stock: i18n.t('schema:erp.office_supply.status.option.low_stock'),
        out_of_stock: i18n.t('schema:erp.office_supply.status.option.out_of_stock'),
        discontinued: i18n.t('schema:erp.office_supply.status.option.discontinued'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.office_supply.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.office_supply.filter.status.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.office_supply.filter.status.option.in_stock'),
            value: 'in_stock',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.status.option.low_stock'),
            value: 'low_stock',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.status.option.out_of_stock'),
            value: 'out_of_stock',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.status.option.discontinued'),
            value: 'discontinued',
          },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.office_supply.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.office_supply.filter.category.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.office_supply.filter.category.option.stationery'),
            value: 'stationery',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.category.option.electronics'),
            value: 'electronics',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.category.option.furniture'),
            value: 'furniture',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.category.option.consumables'),
            value: 'consumables',
          },
          {
            label: i18n.t('schema:erp.office_supply.filter.category.option.other'),
            value: 'other',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.office_supply.section.0.title'),
      fields: ['name', 'category', 'unit', 'location'],
    },
    {
      title: i18n.t('schema:erp.office_supply.section.1.title'),
      fields: ['quantity', 'price', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.office_supply.meta.createTitle'),
  editTitle: i18n.t('schema:erp.office_supply.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.office_supply.meta.detailTitle'),
};
