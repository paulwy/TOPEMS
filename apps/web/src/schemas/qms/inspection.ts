import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const inspectionTypeMap: Record<string, string> = {
  incoming: '来料检验',
  process: '过程检验',
  final: '成品检验',
  routine: '例行检验',
};

export const inspectionSchema: EntitySchema = {
  entity: 'quality_check',
  title: '质量检验',
  description: '管理质量检验记录，跟踪检验类型、产品、合格数量、合格率和检验状态',

  api: {
    module: 'qms',
    resource: 'inspection',
    listMethod: 'listChecks',
    createMethod: 'createCheck',
    updateMethod: 'updateCheck',
    deleteMethod: 'deleteCheck',
  },

  fields: [
    {
      name: 'inspection_no',
      label: '检验单号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'inspection_type',
      label: '检验类型',
      type: 'select',
      required: true,
      defaultValue: 'incoming',
      options: {
        type: 'static',
        options: [
          { value: 'incoming', label: '来料检验' },
          { value: 'process', label: '过程检验' },
          { value: 'final', label: '成品检验' },
          { value: 'routine', label: '例行检验' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.inspection_type ?? '');
        const label = inspectionTypeMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      placeholder: '请输入产品名称',
    },
    {
      name: 'quantity',
      label: '检验数量',
      type: 'number',
      defaultValue: 100,
      listWidth: 100,
    },
    {
      name: 'qualified_quantity',
      label: '合格数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'unqualified_quantity',
      label: '不合格数量',
      type: 'number',
      listWidth: 110,
    },
    {
      name: 'qualification_rate',
      label: '合格率',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const rate = Number(row.qualification_rate ?? 0);
        const color = rate >= 95 ? 'success.dark' : rate >= 90 ? '#ca8a04' : 'error.dark';
        return React.createElement(
          'span',
          { style: { color, fontWeight: 500 } },
          rate !== undefined && rate !== null ? `${rate.toFixed(1)}%` : '-'
        );
      },
    },
    {
      name: 'assignee',
      label: '分配人员',
      type: 'text',
      listWidth: 110,
    },
    {
      name: 'inspector',
      label: '检验员',
      type: 'text',
      listWidth: 110,
    },
    {
      name: 'inspected_at',
      label: '检验日期',
      type: 'date',
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
          { value: 'pending', label: '待分配' },
          { value: 'in_progress', label: '进行中' },
          { value: 'pending_audit', label: '待审核' },
          { value: 'completed', label: '已完成' },
          { value: 'rejected', label: '已驳回' },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'result',
      label: '结果',
      type: 'text',
      showInList: false,
      showInDetail: true,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'memo',
      label: '备注',
      type: 'textarea',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      sortable: true,
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['product_name', 'inspection_no'],
    filters: [
      {
        id: 'inspection_type',
        label: '检验类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '来料检验', value: 'incoming' },
          { label: '过程检验', value: 'process' },
          { label: '成品检验', value: 'final' },
          { label: '例行检验', value: 'routine' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待分配', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '待审核', value: 'pending_audit' },
          { label: '已完成', value: 'completed' },
          { label: '已驳回', value: 'rejected' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        in_progress: 'primary',
        pending_audit: 'secondary',
        completed: 'success',
        rejected: 'error',
      },
      labelMap: {
        pending: '待分配',
        in_progress: '进行中',
        pending_audit: '待审核',
        completed: '已完成',
        rejected: '已驳回',
      },
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['inspection_type', 'product_name', 'quantity'],
    },
    {
      title: '检验结果',
      fields: ['qualified_quantity', 'unqualified_quantity', 'memo'],
    },
  ],

  formColCount: 2,
  createTitle: '新建检验',
  editTitle: '编辑检验',
  detailTitle: '检验详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
