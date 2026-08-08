/**
 * 商机管理 Schema — 驱动 OpportunityManagementPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const opportunitySchema: EntitySchema = {
  entity: 'opportunity',
  title: '商机管理',

  api: {
    module: 'crm',
    resource: 'opportunities',
  },

  fields: [
    {
      name: 'opp_no',
      label: '商机编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'title',
      label: '商机标题',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'customer_name',
      label: '客户名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'stage',
      label: '商机阶段',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'lead', label: '线索' },
          { value: 'qualified', label: '已确认' },
          { value: 'proposal', label: '方案阶段' },
          { value: 'negotiation', label: '谈判阶段' },
          { value: 'won', label: '已赢单' },
          { value: 'lost', label: '已输单' },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      showInList: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `¥${((row.amount as number) || 0).toLocaleString()}`
        ),
    },
    {
      name: 'close_date',
      label: '预计成交日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'owner',
      label: '负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: '进行中' },
          { value: 'won', label: '已赢单' },
          { value: 'lost', label: '已输单' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['opp_no', 'title', 'customer_name', 'stage', 'amount', 'close_date', 'status'],
    searchFields: ['opp_no', 'title', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        open: 'info',
        won: 'success',
        lost: 'error',
        archived: 'default',
      },
      labelMap: {
        open: '进行中',
        won: '已赢单',
        lost: '已输单',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'stage',
        label: '商机阶段',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '线索', value: 'lead' },
          { label: '已确认', value: 'qualified' },
          { label: '方案阶段', value: 'proposal' },
          { label: '谈判阶段', value: 'negotiation' },
          { label: '已赢单', value: 'won' },
          { label: '已输单', value: 'lost' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '进行中', value: 'open' },
          { label: '已赢单', value: 'won' },
          { label: '已输单', value: 'lost' },
          { label: '已归档', value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['opp_no', 'title', 'customer_id', 'customer_name'],
    },
    {
      title: '阶段与金额',
      fields: ['stage', 'priority', 'amount', 'close_date'],
    },
    {
      title: '其他',
      fields: ['owner', 'status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增商机',
  editTitle: '编辑商机',
  detailTitle: '商机详情',
};
