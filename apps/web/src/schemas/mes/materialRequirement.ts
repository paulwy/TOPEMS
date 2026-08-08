import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const materialRequirementSchema: EntitySchema = {
  entity: 'mes_material_requirement',
  title: '物料需求',
  description: '管理物料需求计划，包括需求单号、产品、物料、数量、优先级和状态',

  api: {
    module: 'mes',
    resource: 'materialRequirements',
  },

  fields: [
    {
      name: 'mrp_no',
      label: '需求单号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: '生产订单',
      type: 'text',
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      required: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'material_code',
      label: '物料编码',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'material_name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'specification',
      label: '规格型号',
      type: 'text',
      sortable: true,
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'required_quantity',
      label: '需求数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: '可用数量',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'shortfall_quantity',
      label: '缺口数量',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'required_date',
      label: '需求日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '普通' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const priorityMap: Record<string, { label: string; bg: string; color: string }> = {
          urgent: { label: '紧急', bg: 'error.lighter', color: 'error.dark' },
          high: { label: '高', bg: 'warning.light', color: 'warning.700' },
          normal: { label: '普通', bg: 'primary.100', color: 'primary.dark' },
          low: { label: '低', bg: 'grey.100', color: 'text.secondary' },
        };
        const p = priorityMap[(row.priority as string) || 'normal'] || priorityMap.normal;
        return React.createElement(Chip, {
          size: 'small',
          label: p.label,
          sx: { backgroundColor: p.bg, color: p.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
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
          { value: 'confirmed', label: '已确认' },
          { value: 'released', label: '已下达' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
          confirmed: { label: '已确认', bg: 'primary.100', color: 'primary.dark' },
          released: { label: '已下达', bg: 'warning.light', color: 'warning.700' },
          completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
          cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
        };
        const s = statusMap[(row.status as string) || 'draft'] || {
          label: row.status,
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'source_type',
      label: '来源类型',
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'remark',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'mrp_no',
      'order_number',
      'product_name',
      'material_name',
      'material_code',
      'specification',
      'required_quantity',
      'available_quantity',
      'shortfall_quantity',
      'required_date',
      'priority',
      'status',
    ],
    searchFields: ['mrp_no', 'product_name', 'material_name', 'material_code'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已确认', value: 'confirmed' },
          { label: '已下达', value: 'released' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: [
        'product_code',
        'product_name',
        'material_code',
        'material_name',
        'specification',
        'unit',
      ],
    },
    {
      title: '需求信息',
      fields: ['required_quantity', 'required_date', 'priority', 'status'],
    },
    {
      title: '其他',
      fields: ['source_type', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: '新建物料需求',
  editTitle: '编辑物料需求',
  detailTitle: '物料需求详情',
};
