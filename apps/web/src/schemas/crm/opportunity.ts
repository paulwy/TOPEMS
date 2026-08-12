import React from 'react';
import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';

export const oppStage = z.enum(['draft', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'closed']);
export const oppPriority = z.enum(['high', 'medium', 'low']);
export const oppStatus = z.enum(['open', 'won', 'lost', 'archived']);

export const opportunityZodSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  oppNo: z.string().max(64),
  title: z.string().min(2).max(200),
  customerId: z.string().uuid().optional(),
  customerName: z.string().max(120).optional(),
  stage: oppStage.default('draft'),
  priority: oppPriority.default('medium'),
  amount: z.coerce.number().optional(),
  winRate: z.coerce.number().int().min(0).max(100).optional(),
  closeDate: z.coerce.date().optional(),
  ownerId: z.string().uuid().optional(),
  status: oppStatus.default('open'),
  description: z.string().optional(),
}).merge(commonAuditSchema);

export type Opportunity = z.infer<typeof opportunityZodSchema>;
export type OppStage = z.infer<typeof oppStage>;
export type OppPriority = z.infer<typeof oppPriority>;
export type OppStatus = z.infer<typeof oppStatus>;

export const createOpportunitySchema = opportunityZodSchema.omit({ id: true, tenantId: true, stage: true, status: true, createdAt: true, updatedAt: true, deletedAt: true });
export type CreateOpportunityRequest = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = createOpportunitySchema.partial();
export type UpdateOpportunityRequest = z.infer<typeof updateOpportunitySchema>;

export const opportunitySchema: EntitySchema<Opportunity> = {
  entity: 'crm_opportunity',
  title: '商机管理',
  description: '管理商机全生命周期，含阶段推进与赢率追踪',
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  api: {
    module: 'crm',
    resource: 'opportunities',
  },

  fields: [
    {
      name: 'oppNo',
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
      validation: [{ type: 'minLength', value: 2 }, { type: 'maxLength', value: 200 }],
    },
    {
      name: 'customerId',
      label: '客户ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'customerName',
      label: '客户名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'stage',
      label: '商机阶段',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'lead', label: '线索' },
          { value: 'qualified', label: '已确认' },
          { value: 'proposal', label: '方案阶段' },
          { value: 'negotiation', label: '谈判阶段' },
          { value: 'won', label: '已赢单' },
          { value: 'lost', label: '已输单' },
          { value: 'closed', label: '已关闭' },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'medium',
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
      name: 'winRate',
      label: '赢率(%)',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'closeDate',
      label: '预计成交日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'ownerId',
      label: '负责人ID',
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
    {
      name: 'createdAt',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['oppNo', 'title', 'customerName', 'stage', 'priority', 'amount', 'winRate', 'closeDate', 'status'],
    searchFields: ['oppNo', 'title', 'customerName'],
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
          { label: '草稿', value: 'draft' },
          { label: '线索', value: 'lead' },
          { label: '已确认', value: 'qualified' },
          { label: '方案阶段', value: 'proposal' },
          { label: '谈判阶段', value: 'negotiation' },
          { label: '已赢单', value: 'won' },
          { label: '已输单', value: 'lost' },
          { label: '已关闭', value: 'closed' },
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

  formSections: [
    {
      title: '基本信息',
      fields: ['oppNo', 'title', 'customerId', 'customerName'],
    },
    {
      title: '阶段与金额',
      fields: ['stage', 'priority', 'amount', 'winRate', 'closeDate'],
    },
    {
      title: '其他',
      fields: ['ownerId', 'status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增商机',
  editTitle: '编辑商机',
  detailTitle: '商机详情',
};
