import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';
import { approvalStatus } from './customer';
import i18n from '@/i18n';

const contactStatus = z.enum(['active', 'inactive']);

const contactZodSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(100).optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    position: z.string().max(100).optional(),
    status: contactStatus.default('active'),
    notes: z.string().optional(),
    approvalStatus: approvalStatus.default('none'),
  })
  .merge(commonAuditSchema);

export type Contact = z.infer<typeof contactZodSchema>;

const createContactSchema = contactZodSchema.omit({
  id: true,
  tenantId: true,
  approvalStatus: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreateContactRequest = z.infer<typeof createContactSchema>;

const updateContactSchema = createContactSchema.partial();
export type UpdateContactRequest = z.infer<typeof updateContactSchema>;

export const contactSchema: EntitySchema<Contact> = {
  entity: 'crm_contact',
  title: i18n.t('shared.contact.k0'),
  description: i18n.t('shared.contact.k1'),
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  api: {
    module: 'crm',
    resource: 'contacts',
  },

  fields: [
    {
      name: 'firstName',
      label: i18n.t('shared.contact.k2'),
      type: 'text',
      required: true,
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'lastName',
      label: i18n.t('shared.contact.k3'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'email',
      label: i18n.t('shared.contact.k4'),
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: i18n.t('shared.contact.k5'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'position',
      label: i18n.t('shared.contact.k6'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'customerId',
      label: i18n.t('shared.contact.id_7'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'status',
      label: i18n.t('shared.contact.k8'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('shared.contact.k9') },
          { value: 'inactive', label: i18n.t('shared.contact.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'approvalStatus',
      label: i18n.t('shared.contact.k11'),
      type: 'select',
      defaultValue: 'none',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'none', label: i18n.t('shared.contact.k12') },
          { value: 'pending', label: i18n.t('shared.contact.k13') },
          { value: 'approved', label: i18n.t('shared.contact.k14') },
          { value: 'rejected', label: i18n.t('shared.contact.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'notes',
      label: i18n.t('shared.contact.k16'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'createdAt',
      label: i18n.t('shared.contact.k17'),
      type: 'datetime',
      readonly: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['firstName', 'lastName', 'email', 'phone', 'position', 'status', 'approvalStatus'],
    searchFields: ['firstName', 'lastName', 'email'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('shared.contact.k18'),
        inactive: i18n.t('shared.contact.k19'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('shared.contact.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.contact.k21'), value: 'all' },
          { label: i18n.t('shared.contact.k22'), value: 'active' },
          { label: i18n.t('shared.contact.k23'), value: 'inactive' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.contact.k24'),
      fields: ['firstName', 'lastName', 'email', 'phone', 'position', 'customerId'],
    },
    {
      title: i18n.t('shared.contact.k25'),
      fields: ['status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.contact.k26'),
  editTitle: i18n.t('shared.contact.k27'),
  detailTitle: i18n.t('shared.contact.k28'),
};
