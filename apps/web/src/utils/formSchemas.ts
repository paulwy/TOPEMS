import { z } from 'zod';

export const fieldName = () =>
  z.string().min(2, '名称至少 2 个字符').max(50, '名称不能超过 50 个字符');

export const fieldCode = () =>
  z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '必须以字母开头，只允许字母数字下划线')
    .min(2, '编码至少 2 个字符')
    .max(32, '编码不能超过 32 个字符');

export const fieldDescription = () =>
  z.string().max(500, '描述不能超过 500 个字符').optional().or(z.literal(''));

export const fieldEmail = () => z.string().email('请输入有效的邮箱地址').or(z.literal(''));

export const fieldPhone = () =>
  z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码')
    .or(z.literal(''));

export const fieldAmount = () =>
  z
    .number()
    .min(0, '金额不能为负数')
    .refine((val) => Number.isFinite(val), '请输入有效的金额');

export const fieldPercentage = () =>
  z.number().min(0, '百分比不能为负数').max(100, '百分比不能超过 100');

export const fieldDateRange = () =>
  z
    .object({
      start: z.string().min(1, '请选择开始日期'),
      end: z.string().min(1, '请选择结束日期'),
    })
    .refine((data) => new Date(data.start) <= new Date(data.end), {
      message: '结束日期不能早于开始日期',
      path: ['end'],
    });

export const fieldPagination = () =>
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(10),
  });

export const fieldSort = () =>
  z
    .object({
      field: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('asc'),
    })
    .optional();

export const baseEntitySchema = z.object({
  id: z.string().optional(),
  name: fieldName(),
  code: fieldCode().optional(),
  description: fieldDescription(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
});

export const partySchema = baseEntitySchema.extend({
  contactPerson: fieldName().optional(),
  phone: fieldPhone().optional(),
  email: fieldEmail().optional(),
  address: z.string().max(200).optional(),
});

export const materialSchema = baseEntitySchema.extend({
  category: z.string().optional(),
  unit: z.string().min(1, '请选择单位').optional(),
  specification: z.string().max(100).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
});

export const orderSchema = z.object({
  orderNo: fieldCode(),
  orderDate: z.string().min(1, '请选择订单日期'),
  expectedDate: z.string().optional(),
  totalAmount: fieldAmount().optional(),
  status: z
    .enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
    .default('draft'),
  remark: fieldDescription(),
});

export const projectSchema = baseEntitySchema.extend({
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().optional(),
  manager: fieldName().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  progress: z.number().min(0).max(100).default(0),
  budget: fieldAmount().optional(),
});

export type BaseEntity = z.infer<typeof baseEntitySchema>;
export type Party = z.infer<typeof partySchema>;
export type Material = z.infer<typeof materialSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Project = z.infer<typeof projectSchema>;
