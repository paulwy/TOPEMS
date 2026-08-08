import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const workReportSchema: EntitySchema = {
  entity: 'mes_work_report',
  title: '工作报告',
  description: '管理工作报告，包括报工单号、生产订单、工序、工位、操作员、数量等',

  api: {
    module: 'mes',
    resource: 'workReports',
  },

  fields: [
    {
      name: 'report_no',
      label: '报工单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
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
    },
    {
      name: 'process_name',
      label: '工序',
      type: 'text',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: '工作站',
      type: 'text',
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'team_name',
      label: '班组',
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'worker_name',
      label: '操作人员',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'quantity_good',
      label: '合格数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'quantity_bad',
      label: '不良数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'quantity_total',
      label: '总数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
    },
    {
      name: 'start_time',
      label: '开始时间',
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'end_time',
      label: '结束时间',
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'actual_duration',
      label: '实际时长',
      type: 'number',
      showInList: false,
    },
    {
      name: 'standard_duration',
      label: '标准时长',
      type: 'number',
      showInList: false,
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
          { value: 'submitted', label: '已提交' },
          { value: 'approved', label: '已审核' },
          { value: 'rejected', label: '已驳回' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
          submitted: { label: '已提交', bg: 'primary.100', color: 'primary.dark' },
          approved: { label: '已审核', bg: 'success.lighter', color: 'success.700' },
          rejected: { label: '已驳回', bg: 'error.lighter', color: 'error.dark' },
          cancelled: { label: '已取消', bg: 'grey.100', color: 'text.secondary' },
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
      name: 'report_type',
      label: '报工类型',
      type: 'text',
      showInList: false,
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
      'report_no',
      'order_number',
      'process_name',
      'work_station_name',
      'worker_name',
      'quantity_good',
      'quantity_bad',
      'quantity_total',
      'start_time',
      'end_time',
      'status',
    ],
    searchFields: ['report_no', 'order_number', 'worker_name'],
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
          { label: '已提交', value: 'submitted' },
          { label: '已审核', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['report_no', 'order_number', 'process_name', 'work_station_name', 'team_name'],
    },
    {
      title: '人员信息',
      fields: ['worker_name'],
    },
    {
      title: '数量信息',
      fields: ['quantity_good', 'quantity_bad', 'quantity_total'],
    },
    {
      title: '时间信息',
      fields: ['start_time', 'end_time', 'actual_duration', 'standard_duration'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'report_type', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: '新增报工',
  editTitle: '编辑报工',
  detailTitle: '报工详情',
};
