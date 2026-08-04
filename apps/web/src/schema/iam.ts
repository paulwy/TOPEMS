/**
 * IAM 模块 Schema 定义
 *
 * 为 IAM 模块的 CRUD 页面提供 Schema 驱动配置。
 */

import type { EntitySchema, SchemaField } from './types';

// ============ 用户 Schema ============

export const iamUserFields: SchemaField[] = [
  {
    name: 'username',
    label: '用户名',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
    sortable: true,
  },
  {
    name: 'email',
    label: '邮箱',
    type: 'email',
    required: true,
    validation: [{ type: 'required' }, { type: 'email' }],
    listWidth: 180,
  },
  {
    name: 'full_name',
    label: '姓名',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    required: true,
    defaultValue: 'active',
    options: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '停用' },
      { value: 'locked', label: '锁定' },
    ],
    listWidth: 100,
  },
  {
    name: 'last_login',
    label: '最后登录',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const iamUserSchema: EntitySchema = {
  entity: 'iam-user',
  title: '用户',
  description: 'IAM 用户管理',
  fields: iamUserFields,
  actions: ['create', 'edit', 'delete', 'detail'],
  list: {
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
          { value: 'locked', label: '锁定' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 20,
    selectable: true,
  },
  formColCount: 2,
  createTitle: '新建用户',
  editTitle: '编辑用户',
  detailTitle: '用户详情',
};

// ============ 角色 Schema ============

export const iamRoleFields: SchemaField[] = [
  {
    name: 'name',
    label: '角色名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
    sortable: true,
  },
  {
    name: 'code',
    label: '角色编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
  },
  {
    name: 'is_system',
    label: '系统角色',
    type: 'checkbox',
    defaultValue: false,
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const iamRoleSchema: EntitySchema = {
  entity: 'iam-role',
  title: '角色',
  description: 'IAM 角色管理',
  fields: iamRoleFields,
  actions: ['create', 'edit', 'delete', 'detail'],
  list: {
    pageSize: 20,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '新建角色',
  editTitle: '编辑角色',
  detailTitle: '角色详情',
};

// ============ 权限 Schema ============

export const iamPermissionFields: SchemaField[] = [
  {
    name: 'name',
    label: '权限名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 180,
  },
  {
    name: 'code',
    label: '权限编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 180,
  },
  {
    name: 'resource',
    label: '资源',
    type: 'text',
    required: true,
    listWidth: 120,
  },
  {
    name: 'action',
    label: '操作',
    type: 'select',
    required: true,
    options: [
      { value: 'read', label: '读取' },
      { value: 'write', label: '写入' },
      { value: 'delete', label: '删除' },
      { value: 'admin', label: '管理' },
    ],
    listWidth: 100,
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    options: [
      { value: 'system', label: '系统' },
      { value: 'iam', label: 'IAM' },
      { value: 'workflow', label: '工作流' },
      { value: 'erp', label: 'ERP' },
      { value: 'crm', label: 'CRM' },
      { value: 'hrm', label: '人力资源' },
      { value: 'mes', label: '制造执行' },
    ],
    listWidth: 100,
  },
];

export const iamPermissionSchema: EntitySchema = {
  entity: 'iam-permission',
  title: '权限',
  description: 'IAM 权限管理',
  fields: iamPermissionFields,
  actions: ['create', 'edit', 'delete'],
  list: {
    filters: [
      {
        id: 'action',
        label: '操作',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'read', label: '读取' },
          { value: 'write', label: '写入' },
          { value: 'delete', label: '删除' },
          { value: 'admin', label: '管理' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'system', label: '系统' },
          { value: 'iam', label: 'IAM' },
          { value: 'workflow', label: '工作流' },
          { value: 'erp', label: 'ERP' },
          { value: 'crm', label: 'CRM' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 50,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '新建权限',
  editTitle: '编辑权限',
};

// ============ 用户组 Schema ============

export const iamGroupFields: SchemaField[] = [
  {
    name: 'name',
    label: '组名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
    sortable: true,
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
  },
  {
    name: 'member_count',
    label: '成员数',
    type: 'number',
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const iamGroupSchema: EntitySchema = {
  entity: 'iam-group',
  title: '用户组',
  description: 'IAM 用户组管理',
  fields: iamGroupFields,
  actions: ['create', 'edit', 'delete', 'detail'],
  list: {
    pageSize: 20,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '新建用户组',
  editTitle: '编辑用户组',
  detailTitle: '用户组详情',
};
