import React from 'react';
import type { EntitySchema } from '@/schema';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'primary' },
  bidding: { label: '投标中', color: 'warning' },
  opened: { label: '已开标', color: 'info' },
  evaluating: { label: '评标中', color: 'primary' },
  awarded: { label: '已定标', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
  completed: { label: '已完成', color: 'success' },
};

export const biddingSchema: EntitySchema = {
  entity: 'srm_bidding',
  title: '招投标管理',
  description: '管理招标项目、投标、开标、评标、定标全流程',

  api: {
    module: 'srm',
    resource: 'biddings',
  },

  fields: [
    {
      name: 'bidding_no',
      label: '招标编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: '项目类别',
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: '原材料' },
          { value: 'component', label: '零部件' },
          { value: 'equipment', label: '设备' },
          { value: 'service', label: '服务' },
          { value: 'engineering', label: '工程' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'bidding_type',
      label: '招标方式',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: '公开招标' },
          { value: 'invite', label: '邀请招标' },
          { value: 'competitive', label: '竞争性谈判' },
          { value: 'single_source', label: '单一来源' },
          { value: 'inquiry', label: '询价采购' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'budget_amount',
      label: '预算金额',
      type: 'number',
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.budget_amount as number | undefined;
        if (!amount) return '-';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `¥${amount.toLocaleString()}`
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
      name: 'bid_deadline',
      label: '投标截止日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'open_date',
      label: '开标日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
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
          { value: 'published', label: '已发布' },
          { value: 'bidding', label: '投标中' },
          { value: 'opened', label: '已开标' },
          { value: 'evaluating', label: '评标中' },
          { value: 'awarded', label: '已定标' },
          { value: 'cancelled', label: '已取消' },
          { value: 'completed', label: '已完成' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'supplier_count',
      label: '投标数',
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 80,
    },
    {
      name: 'winner_supplier_name',
      label: '中标供应商',
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 140,
    },
    {
      name: 'description',
      label: '项目描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'bidding_no',
      'title',
      'category',
      'bidding_type',
      'budget_amount',
      'supplier_count',
      'status',
      'winner_supplier_name',
      'bid_deadline',
    ],
    searchFields: ['bidding_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'primary',
        bidding: 'warning',
        opened: 'info',
        evaluating: 'primary',
        awarded: 'success',
        cancelled: 'error',
        completed: 'success',
      },
      labelMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label])),
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'category',
        label: '项目类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '原材料', value: 'raw_material' },
          { label: '零部件', value: 'component' },
          { label: '设备', value: 'equipment' },
          { label: '服务', value: 'service' },
          { label: '工程', value: 'engineering' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['bidding_no', 'title', 'category', 'bidding_type', 'status'],
    },
    {
      title: '预算与日期',
      fields: ['budget_amount', 'currency', 'bid_deadline', 'open_date'],
    },
    {
      title: '描述与备注',
      fields: ['description', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新建招标项目',
  editTitle: '编辑招标项目',
  detailTitle: '招标项目详情',
};
