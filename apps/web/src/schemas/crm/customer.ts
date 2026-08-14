import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';
import i18n from '@/i18n';

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
  title: i18n.t('shared.customer.k0'),
  description: i18n.t('shared.customer.k1'),
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.customer.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'minLength', value: 2 }, { type: 'maxLength', value: 120 }],
    },
    {
      name: 'customerType',
      label: i18n.t('shared.customer.k3'),
      type: 'select',
      required: true,
      defaultValue: 'enterprise',
      options: {
        type: 'static',
        options: [
          { value: 'enterprise', label: i18n.t('shared.customer.k4') },
          { value: 'individual', label: i18n.t('shared.customer.k5') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'industry',
      label: i18n.t('shared.customer.k6'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 80 }],
    },
    {
      name: 'rating',
      label: i18n.t('shared.customer.k7'),
      type: 'select',
      defaultValue: 'C',
      options: {
        type: 'static',
        options: [
          { value: 'A', label: i18n.t('shared.customer.a_0') },
          { value: 'B', label: i18n.t('shared.customer.b_1') },
          { value: 'C', label: i18n.t('shared.customer.c_2') },
          { value: 'D', label: i18n.t('shared.customer.d_3') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'region',
      label: i18n.t('shared.customer.k8'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      validation: [{ type: 'maxLength', value: 40 }],
    },
    {
      name: 'ownerId',
      label: i18n.t('shared.customer.id_9'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'tags',
      label: i18n.t('shared.customer.k10'),
      type: 'text',
      defaultValue: [],
      showInList: false,
    },
    {
      name: 'approvalStatus',
      label: i18n.t('shared.customer.k11'),
      type: 'select',
      defaultValue: 'none',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'none', label: i18n.t('shared.customer.k12') },
          { value: 'pending', label: i18n.t('shared.customer.k13') },
          { value: 'approved', label: i18n.t('shared.customer.k14') },
          { value: 'rejected', label: i18n.t('shared.customer.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'createdAt',
      label: i18n.t('shared.customer.k16'),
      type: 'datetime',
      readonly: true,
      listWidth: 160,
    },
    {
      name: 'updatedAt',
      label: i18n.t('shared.customer.k17'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],
};
