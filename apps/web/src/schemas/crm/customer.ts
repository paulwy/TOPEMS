import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';

export const customerRating = z.enum(['A', 'B', 'C', 'D']);
export const customerType = z.enum(['enterprise', 'individual']);
export const approvalStatus = z.enum(['none', 'pending', 'approved', 'rejected']);

export const customerZodSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(120),
  customerType: customerType,
  industry: z.string().max(80).optional(),
  rating: customerRating.default('C'),
  region: z.string().max(40).optional(),
  ownerId: z.string().uuid(),
  tags: z.array(z.string().max(32)).default([]),
  approvalStatus: approvalStatus.default('none'),
}).merge(commonAuditSchema);

export type Customer = z.infer<typeof customerZodSchema>;
export type CustomerRating = z.infer<typeof customerRating>;
export type CustomerType = z.infer<typeof customerType>;
export type ApprovalStatus = z.infer<typeof approvalStatus>;

export const createCustomerSchema = customerZodSchema.omit({ id: true, tenantId: true, approvalStatus: true, createdAt: true, updatedAt: true, deletedAt: true });
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;

export const customerSchema: EntitySchema<Customer> = {
  entity: 'crm_customer',
  title: '客户管理',
  description: '管理客户基础信息、评级、审批状态和所有权',
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  fields: [
    {
      name: 'name',
      label: '客户名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'minLength', value: 2 }, { type: 'maxLength', value: 120 }],
    },
    {
      name: 'customerType',
      label: '客户类型',
      type: 'select',
      required: true,
      defaultValue: 'enterprise',
      options: {
        type: 'static',
        options: [
          { value: 'enterprise', label: '企业客户' },
          { value: 'individual', label: '个人客户' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'industry',
      label: '所属行业',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 80 }],
    },
    {
      name: 'rating',
      label: '客户评级',
      type: 'select',
      defaultValue: 'C',
      options: {
        type: 'static',
        options: [
          { value: 'A', label: 'A (重点)' },
          { value: 'B', label: 'B (普通)' },
          { value: 'C', label: 'C (潜在)' },
          { value: 'D', label: 'D (低价值)' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'region',
      label: '所在地区',
      type: 'text',
      listWidth: 100,
      showInList: false,
      validation: [{ type: 'maxLength', value: 40 }],
    },
    {
      name: 'ownerId',
      label: '负责人 ID',
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'tags',
      label: '标签',
      type: 'text',
      defaultValue: [],
      showInList: false,
    },
    {
      name: 'approvalStatus',
      label: '审批状态',
      type: 'select',
      defaultValue: 'none',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'none', label: '未发起' },
          { value: 'pending', label: '审批中' },
          { value: 'approved', label: '已通过' },
          { value: 'rejected', label: '已驳回' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'createdAt',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      listWidth: 160,
    },
    {
      name: 'updatedAt',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],
};
