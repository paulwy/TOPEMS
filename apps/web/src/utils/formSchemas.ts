import { z } from 'zod';
import i18n from '@/i18n';

export const fieldName = () =>
  z.string().min(2, i18n.t('shared.form_schemas.2_1')).max(50, i18n.t('shared.form_schemas.50_0'));

const fieldCode = () =>
  z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, i18n.t('shared.form_schemas.k2'))
    .min(2, i18n.t('shared.form_schemas.2_3'))
    .max(32, i18n.t('shared.form_schemas.32_4'));

const fieldDescription = () =>
  z.string().max(500, i18n.t('shared.form_schemas.500_5')).optional().or(z.literal(''));

z.string()
  .regex(/^1[3-9]\d{9}$/, i18n.t('shared.form_schemas.k7'))
  .or(z.literal(''));

const fieldAmount = () =>
  z
    .number()
    .min(0, i18n.t('shared.form_schemas.k8'))
    .refine((val) => Number.isFinite(val), i18n.t('shared.form_schemas.k9'));

z.number().min(0, i18n.t('shared.form_schemas.k11')).max(100, i18n.t('shared.form_schemas.100_10'));

z.object({
  start: z.string().min(1, i18n.t('shared.form_schemas.k12')),
  end: z.string().min(1, i18n.t('shared.form_schemas.k13')),
}).refine((data) => new Date(data.start) <= new Date(data.end), {
  message: i18n.t('shared.form_schemas.k14'),
  path: ['end'],
});

z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

z.object({
  field: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
}).optional();

const baseEntitySchema = z.object({
  id: z.string().optional(),
  name: fieldName(),
  code: fieldCode().optional(),
  description: fieldDescription(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
});

export const materialSchema = baseEntitySchema.extend({
  category: z.string().optional(),
  unit: z.string().min(1, i18n.t('shared.form_schemas.k15')).optional(),
  specification: z.string().max(100).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
});

export const orderSchema = z.object({
  orderNo: fieldCode(),
  orderDate: z.string().min(1, i18n.t('shared.form_schemas.k16')),
  expectedDate: z.string().optional(),
  totalAmount: fieldAmount().optional(),
  status: z
    .enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
    .default('draft'),
  remark: fieldDescription(),
});

export const projectSchema = baseEntitySchema.extend({
  startDate: z.string().min(1, i18n.t('shared.form_schemas.k17')),
  endDate: z.string().optional(),
  manager: fieldName().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  progress: z.number().min(0).max(100).default(0),
  budget: fieldAmount().optional(),
});

export type Material = z.infer<typeof materialSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Project = z.infer<typeof projectSchema>;
