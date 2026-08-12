import { z } from 'zod';
import type { EntitySchema } from '@/schema';
import { commonAuditSchema } from './_shared';
import { approvalStatus } from './customer';

export const contactStatus = z.enum(['active', 'inactive']);

export const contactZodSchema = z.object({
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
}).merge(commonAuditSchema);

export type Contact = z.infer<typeof contactZodSchema>;
export type ContactStatus = z.infer<typeof contactStatus>;

export const createContactSchema = contactZodSchema.omit({ id: true, tenantId: true, approvalStatus: true, createdAt: true, updatedAt: true, deletedAt: true });
export type CreateContactRequest = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();
export type UpdateContactRequest = z.infer<typeof updateContactSchema>;

export const contactSchema: EntitySchema<Contact> = {
  entity: 'crm_contact',
  title: '联系人管理',
  description: '管理联系人信息，包括姓名、联系方式、职位等',
  softDelete: true,
  actions: ['create', 'edit', 'detail', 'delete'],

  api: {
    module: 'crm',
    resource: 'contacts',
  },

  fields: [
    {
      name: 'firstName',
      label: '名',
      type: 'text',
      required: true,
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'lastName',
      label: '姓',
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: '电话',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'customerId',
      label: '客户ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '非活跃' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
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
      name: 'notes',
      label: '备注',
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
        active: '活跃',
        inactive: '非活跃',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '非活跃', value: 'inactive' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['firstName', 'lastName', 'email', 'phone', 'position', 'customerId'],
    },
    {
      title: '其他',
      fields: ['status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增联系人',
  editTitle: '编辑联系人',
  detailTitle: '联系人详情',
};
