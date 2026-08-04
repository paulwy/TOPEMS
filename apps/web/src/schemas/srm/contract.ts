import React from 'react';
import type { EntitySchema } from '@/schema';

export const contractSchema: EntitySchema = {
  entity: 'supplier_contract',
  title: '合同管理',
  description: '管理供应商合同，跟踪合同状态、归档合同文档',

  api: {
    module: 'srm',
    resource: 'contracts',
  },

  fields: [
    {
      name: 'contractNo',
      label: '合同编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'title',
      label: '合同名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const name = row.supplier_name as string | undefined;
        const id = row.supplier_id as string | undefined;
        return React.createElement('span', {}, name || id || '-');
      },
    },
    {
      name: 'contract_type',
      label: '合同类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: '采购合同', label: '采购合同' },
          { value: '销售合同', label: '销售合同' },
          { value: '服务合同', label: '服务合同' },
          { value: '框架协议', label: '框架协议' },
          { value: '其他', label: '其他' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'total_amount',
      label: '合同金额',
      type: 'number',
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        const currency = row.currency as string | undefined;
        if (amount == null) return '-';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `${currency || '¥'} ${amount.toLocaleString()}`
        );
      },
    },
    {
      name: 'currency',
      label: '币种',
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
        ],
      },
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'sign_date',
      label: '签署日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待签署' },
          { value: 'active', label: '执行中' },
          { value: 'completed', label: '已完成' },
          { value: 'terminated', label: '已终止' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'contractNo',
      'title',
      'supplier_id',
      'contract_type',
      'total_amount',
      'sign_date',
      'status',
    ],
    searchFields: ['contractNo', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        active: 'primary',
        completed: 'success',
        terminated: 'error',
      },
      labelMap: {
        pending: '待签署',
        active: '执行中',
        completed: '已完成',
        terminated: '已终止',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待签署', value: 'pending' },
          { label: '执行中', value: 'active' },
          { label: '已完成', value: 'completed' },
          { label: '已终止', value: 'terminated' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['contractNo', 'title', 'supplier_id', 'contract_type', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['total_amount', 'currency', 'sign_date', 'start_date', 'end_date'],
    },
    {
      title: '备注',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增合同',
  editTitle: '编辑合同',
  detailTitle: '合同详情',
};
