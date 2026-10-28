import { z } from 'zod';
import { commonAuditSchema } from './_shared';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const updateOpportunitySchema = createOpportunitySchema.partial();
export type UpdateOpportunityRequest = z.infer<typeof updateOpportunitySchema>;
