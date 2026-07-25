/**
 * 检测方法管理 Schema — 驱动 LimsTestMethodPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const testMethodSchema: EntitySchema = {
  entity: 'test_method',
  title: '检测方法管理',
  description: '管理检测方法基础信息，包括方法编号、名称、分类、标准、状态等',

  api: {
    module: 'lims',
    resource: 'testMethods',
  },

  fields: [
    {
      name: 'method_code',
      label: '方法编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'method_name',
      label: '方法名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category_id',
      label: '方法分类',
      type: 'select',
      defaultValue: '',
      options: {
        type: 'static',
        options: [
          { value: '', label: '请选择分类' },
          { value: '理化分析', label: '理化分析' },
          { value: '微生物检测', label: '微生物检测' },
          { value: '仪器分析', label: '仪器分析' },
          { value: '感官检验', label: '感官检验' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        return row.category_name ? String(row.category_name) : String(row.category_id || '-');
      },
    },
    {
      name: 'standard',
      label: '参考标准',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '草稿',
      options: {
        type: 'static',
        options: [
          { value: '草稿', label: '草稿' },
          { value: '已发布', label: '已发布' },
          { value: '已归档', label: '已归档' },
        ],
      },
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
    columns: ['method_code', 'method_name', 'category_id', 'standard', 'status', 'version'],
    searchFields: ['method_code', 'method_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        草稿: 'default',
        已发布: 'success',
        已归档: 'primary',
      },
      labelMap: {
        草稿: '草稿',
        已发布: '已发布',
        已归档: '已归档',
      },
    },
    filters: [
      {
        id: 'category',
        label: '方法分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '理化分析', value: '理化分析' },
          { label: '微生物检测', value: '微生物检测' },
          { label: '仪器分析', value: '仪器分析' },
          { label: '感官检验', value: '感官检验' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: '草稿' },
          { label: '已发布', value: '已发布' },
          { label: '已归档', value: '已归档' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['method_code', 'method_name', 'category_id', 'standard'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增检测方法',
  editTitle: '编辑检测方法',
  detailTitle: '检测方法详情',
};
