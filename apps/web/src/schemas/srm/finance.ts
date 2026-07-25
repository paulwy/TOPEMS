import React from 'react';
import type { EntitySchema } from '@/schema';

export const financeSchema: EntitySchema = {
  entity: 'srmFinance',
  title: 'SRM财务',
  description: '管理采购订单和供应商合同的财务视图',

  api: {
    module: 'srm',
    resource: 'finance',
  },

  fields: [
    {
      name: 'record_no',
      label: '单据编号',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      defaultValue: 'order',
      options: {
        type: 'static',
        options: [
          { value: 'order', label: '订单' },
          { value: 'contract', label: '合同' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'supplier_name',
      label: '供应商',
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      listWidth: 140,
      align: 'right',
      renderCell: (row: Record<string, unknown>) => {
        const amount = (row as Record<string, unknown>).amount as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600, color: 'grey.800' };
        return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString()}`);
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'processing', label: '处理中' },
          { value: 'delivered', label: '已交付' },
          { value: 'completed', label: '已完成' },
          { value: 'active', label: '有效' },
          { value: 'cancelled', label: '已取消' },
          { value: 'expired', label: '已过期' },
          { value: 'draft', label: '草稿' },
          { value: 'terminated', label: '已终止' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'date',
      label: '日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['record_no', 'type', 'supplier_name', 'amount', 'status', 'date', 'description'],
    searchFields: ['record_no', 'supplier_name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        待处理: 'warning',
        处理中: 'primary',
        已交付: 'success',
        已完成: 'info',
        已取消: 'default',
        有效: 'success',
        已过期: 'error',
        草稿: 'default',
        已终止: 'warning',
      },
      labelMap: {
        待处理: '待处理',
        处理中: '处理中',
        已交付: '已交付',
        已完成: '已完成',
        已取消: '已取消',
        有效: '有效',
        已过期: '已过期',
        草稿: '草稿',
        已终止: '已终止',
      },
    },
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['type', 'record_no', 'supplier_id', 'supplier_name'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'date', 'status'],
    },
    {
      title: '备注',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增财务单据',
  editTitle: '编辑财务单据',
  detailTitle: '财务单据详情',
};
