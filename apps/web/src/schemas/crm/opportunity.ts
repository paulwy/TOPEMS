import React from 'react';
import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';
import i18n from '@/i18n';

const oppStage = z.enum([
  'draft',
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'closed',
]);
const oppPriority = z.enum(['high', 'medium', 'low']);
const oppStatus = z.enum(['open', 'won', 'lost', 'archived']);

const opportunityZodSchema = z
  .object({
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
  })
  .merge(commonAuditSchema);

export type Opportunity = z.infer<typeof opportunityZodSchema>;
export type OppStage = z.infer<typeof oppStage>;
const createOpportunitySchema = opportunityZodSchema.omit({
  id: true,
  tenantId: true,
  stage: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreateOpportunityRequest = z.infer<typeof createOpportunitySchema>;

const updateOpportunitySchema = createOpportunitySchema.partial();
export type UpdateOpportunityRequest = z.infer<typeof updateOpportunitySchema>;

export const opportunitySchema: EntitySchema<Opportunity> = {
  entity: 'crm_opportunity',
  title: i18n.t('shared.opportunity.k0'),
  description: i18n.t('shared.opportunity.k1'),
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  api: {
    module: 'crm',
    resource: 'opportunities',
  },

  fields: [
    {
      name: 'oppNo',
      label: i18n.t('shared.opportunity.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'title',
      label: i18n.t('shared.opportunity.k3'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [
        { type: 'minLength', value: 2 },
        { type: 'maxLength', value: 200 },
      ],
    },
    {
      name: 'customerId',
      label: i18n.t('shared.opportunity.id_4'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'customerName',
      label: i18n.t('shared.opportunity.k5'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'stage',
      label: i18n.t('shared.opportunity.k6'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('shared.opportunity.k7') },
          { value: 'lead', label: i18n.t('shared.opportunity.k8') },
          { value: 'qualified', label: i18n.t('shared.opportunity.k9') },
          { value: 'proposal', label: i18n.t('shared.opportunity.k10') },
          { value: 'negotiation', label: i18n.t('shared.opportunity.k11') },
          { value: 'won', label: i18n.t('shared.opportunity.k12') },
          { value: 'lost', label: i18n.t('shared.opportunity.k13') },
          { value: 'closed', label: i18n.t('shared.opportunity.k14') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'priority',
      label: i18n.t('shared.opportunity.k15'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('shared.opportunity.k16') },
          { value: 'medium', label: i18n.t('shared.opportunity.k17') },
          { value: 'low', label: i18n.t('shared.opportunity.k18') },
        ],
      },
      showInList: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'amount',
      label: i18n.t('shared.opportunity.k19'),
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
      label: i18n.t('shared.opportunity.k20'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'closeDate',
      label: i18n.t('shared.opportunity.k21'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'ownerId',
      label: i18n.t('shared.opportunity.id_22'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('shared.opportunity.k23'),
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: i18n.t('shared.opportunity.k24') },
          { value: 'won', label: i18n.t('shared.opportunity.k25') },
          { value: 'lost', label: i18n.t('shared.opportunity.k26') },
          { value: 'archived', label: i18n.t('shared.opportunity.k27') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'description',
      label: i18n.t('shared.opportunity.k28'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'createdAt',
      label: i18n.t('shared.opportunity.k29'),
      type: 'datetime',
      readonly: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'oppNo',
      'title',
      'customerName',
      'stage',
      'priority',
      'amount',
      'winRate',
      'closeDate',
      'status',
    ],
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
        open: i18n.t('shared.opportunity.k30'),
        won: i18n.t('shared.opportunity.k31'),
        lost: i18n.t('shared.opportunity.k32'),
        archived: i18n.t('shared.opportunity.k33'),
      },
    },
    filters: [
      {
        id: 'stage',
        label: i18n.t('shared.opportunity.k34'),
        type: 'select',
        options: [
          { label: i18n.t('shared.opportunity.k35'), value: 'all' },
          { label: i18n.t('shared.opportunity.k36'), value: 'draft' },
          { label: i18n.t('shared.opportunity.k37'), value: 'lead' },
          { label: i18n.t('shared.opportunity.k38'), value: 'qualified' },
          { label: i18n.t('shared.opportunity.k39'), value: 'proposal' },
          { label: i18n.t('shared.opportunity.k40'), value: 'negotiation' },
          { label: i18n.t('shared.opportunity.k41'), value: 'won' },
          { label: i18n.t('shared.opportunity.k42'), value: 'lost' },
          { label: i18n.t('shared.opportunity.k43'), value: 'closed' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.opportunity.k44'),
        type: 'select',
        options: [
          { label: i18n.t('shared.opportunity.k45'), value: 'all' },
          { label: i18n.t('shared.opportunity.k46'), value: 'open' },
          { label: i18n.t('shared.opportunity.k47'), value: 'won' },
          { label: i18n.t('shared.opportunity.k48'), value: 'lost' },
          { label: i18n.t('shared.opportunity.k49'), value: 'archived' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.opportunity.k50'),
      fields: ['oppNo', 'title', 'customerId', 'customerName'],
    },
    {
      title: i18n.t('shared.opportunity.k51'),
      fields: ['stage', 'priority', 'amount', 'winRate', 'closeDate'],
    },
    {
      title: i18n.t('shared.opportunity.k52'),
      fields: ['ownerId', 'status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.opportunity.k53'),
  editTitle: i18n.t('shared.opportunity.k54'),
  detailTitle: i18n.t('shared.opportunity.k55'),
};
