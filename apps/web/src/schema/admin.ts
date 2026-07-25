/**
 * Admin 模块 Schema 定义
 *
 * 为 admin 模块的 CRUD 页面提供 Schema 驱动配置。
 * 目标：将 ~300 行的手动页面代码缩减到 ~60 行。
 */

import type { EntitySchema, SchemaField } from './types';
import type { NestedTableConfig, WizardConfig } from './schemaExtensions';

export {
  dictTypeFields,
  dictTypeSchema,
  dictItemFields,
  dictItemSchema,
  toggleDictItemStatus,
} from '@/schemas/admin/dictionary';

// ============ 角色管理 Schema ============

export const roleFields: SchemaField[] = [
  {
    name: 'name',
    label: '角色名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }, { type: 'maxLength', value: 50 }],
    listWidth: 150,
    sortable: true,
  },
  {
    name: 'code',
    label: '角色编码',
    type: 'text',
    required: true,
    validation: [
      { type: 'required' },
      { type: 'pattern', value: /^[a-z_]+$/, message: '只能包含小写字母和下划线' },
    ],
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

export const roleSchema: EntitySchema = {
  entity: 'role',
  title: '角色',
  description: '管理系统角色，分配权限',
  fields: roleFields,
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

// ============ 租户管理 Schema ============

export const tenantFields: SchemaField[] = [
  {
    name: 'name',
    label: '租户名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 180,
    sortable: true,
  },
  {
    name: 'code',
    label: '租户编码',
    type: 'text',
    required: true,
    validation: [
      { type: 'required' },
      { type: 'pattern', value: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线' },
    ],
    listWidth: 120,
  },
  {
    name: 'contact_email',
    label: '联系邮箱',
    type: 'email',
    required: true,
    validation: [{ type: 'required' }, { type: 'email' }],
    listWidth: 180,
  },
  {
    name: 'contact_phone',
    label: '联系电话',
    type: 'text',
    validation: [{ type: 'phone' }],
    listWidth: 120,
  },
  {
    name: 'plan',
    label: '套餐',
    type: 'select',
    required: true,
    defaultValue: 'basic',
    options: [
      { value: 'basic', label: '基础版' },
      { value: 'professional', label: '专业版' },
      { value: 'enterprise', label: '企业版' },
    ],
    listWidth: 100,
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
      { value: 'suspended', label: '暂停' },
    ],
    listWidth: 100,
  },
  {
    name: 'max_users',
    label: '最大用户数',
    type: 'number',
    defaultValue: 10,
    listWidth: 100,
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

export const tenantSchema: EntitySchema = {
  entity: 'tenant',
  title: '租户',
  description: '管理系统租户，支持多租户隔离',
  fields: tenantFields,
  actions: ['create', 'edit', 'detail'],
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
          { value: 'suspended', label: '暂停' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'plan',
        label: '套餐',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'basic', label: '基础版' },
          { value: 'professional', label: '专业版' },
          { value: 'enterprise', label: '企业版' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 20,
    selectable: true,
  },
  formColCount: 2,
  createTitle: '新建租户',
  editTitle: '编辑租户',
  detailTitle: '租户详情',
};

// ============ 权限管理 Schema ============

export const permissionFields: SchemaField[] = [
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
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
  },
];

export const permissionSchema: EntitySchema = {
  entity: 'permission',
  title: '权限',
  description: '管理系统权限，定义资源访问控制',
  fields: permissionFields,
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
    ],
    pageSize: 50,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '新建权限',
  editTitle: '编辑权限',
};

// ============ 用户管理 Schema ============

export const userFields: SchemaField[] = [
  {
    name: 'username',
    label: '用户名',
    type: 'text',
    required: true,
    validation: [
      { type: 'required' },
      { type: 'pattern', value: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线' },
    ],
    listWidth: 120,
    sortable: true,
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
    name: 'email',
    label: '邮箱',
    type: 'email',
    required: true,
    validation: [{ type: 'required' }, { type: 'email' }],
    listWidth: 180,
  },
  {
    name: 'role',
    label: '角色',
    type: 'select',
    required: true,
    options: [
      { value: 'admin', label: '管理员' },
      { value: 'user', label: '普通用户' },
    ],
    listWidth: 100,
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
    ],
    listWidth: 100,
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

export const userSchema: EntitySchema = {
  entity: 'user',
  title: '用户',
  description: '管理系统用户，分配角色和权限',
  fields: userFields,
  actions: ['create', 'edit', 'delete', 'detail'],
  list: {
    filters: [
      {
        id: 'role',
        label: '角色',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'admin', label: '管理员' },
          { value: 'user', label: '普通用户' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
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

// ============ 审计日志 Schema ============

export const auditLogFields: SchemaField[] = [
  {
    name: 'id',
    label: 'ID',
    type: 'text',
    listWidth: 80,
    hideInForm: true,
  },
  {
    name: 'action',
    label: '操作',
    type: 'select',
    options: [
      { value: 'create', label: '创建' },
      { value: 'update', label: '更新' },
      { value: 'delete', label: '删除' },
      { value: 'login', label: '登录' },
      { value: 'logout', label: '登出' },
      { value: 'export', label: '导出' },
    ],
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'resource',
    label: '资源',
    type: 'text',
    listWidth: 120,
    hideInForm: true,
  },
  {
    name: 'resource_id',
    label: '资源ID',
    type: 'text',
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'user_name',
    label: '操作人',
    type: 'text',
    listWidth: 120,
    hideInForm: true,
  },
  {
    name: 'ip_address',
    label: 'IP地址',
    type: 'text',
    listWidth: 140,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const auditLogSchema: EntitySchema = {
  entity: 'audit-log',
  title: '审计日志',
  description: '记录系统操作日志，支持安全审计和合规检查',
  fields: auditLogFields,
  actions: [],
  list: {
    filters: [
      {
        id: 'action',
        label: '操作类型',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'create', label: '创建' },
          { value: 'update', label: '更新' },
          { value: 'delete', label: '删除' },
          { value: 'login', label: '登录' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'date_range',
        label: '时间范围',
        type: 'date-range',
      },
    ],
    pageSize: 50,
    selectable: false,
  },
  readonly: true,
};

// ============ 系统配置 Schema ============

export const systemConfigFields: SchemaField[] = [
  {
    name: 'key',
    label: '配置键',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 200,
  },
  {
    name: 'value',
    label: '配置值',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 300,
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    options: [
      { value: 'system', label: '系统' },
      { value: 'security', label: '安全' },
      { value: 'ui', label: '界面' },
      { value: 'email', label: '邮件' },
      { value: 'storage', label: '存储' },
      { value: 'integration', label: '集成' },
    ],
    listWidth: 120,
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
  },
  {
    name: 'is_secret',
    label: '敏感配置',
    type: 'checkbox',
    defaultValue: false,
    listWidth: 100,
  },
];

export const systemConfigSchema: EntitySchema = {
  entity: 'system-config',
  title: '系统配置',
  description: '管理系统全局配置项',
  fields: systemConfigFields,
  actions: ['create', 'edit', 'delete'],
  list: {
    filters: [
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'system', label: '系统' },
          { value: 'security', label: '安全' },
          { value: 'ui', label: '界面' },
          { value: 'email', label: '邮件' },
          { value: 'storage', label: '存储' },
          { value: 'integration', label: '集成' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 30,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '新建配置',
  editTitle: '编辑配置',
};

// ============ 插件管理 Schema ============

export const pluginFields: SchemaField[] = [
  {
    name: 'code',
    label: '插件编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
  },
  {
    name: 'name',
    label: '插件名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 180,
  },
  {
    name: 'version',
    label: '版本',
    type: 'text',
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    options: [
      { value: 'workflow', label: '工作流' },
      { value: 'erp', label: 'ERP' },
      { value: 'hrm', label: '人力资源' },
      { value: 'crm', label: '客户管理' },
      { value: 'mes', label: '制造执行' },
      { value: 'quality', label: '质量管理' },
      { value: 'scm', label: '供应链' },
      { value: 'wms', label: '仓储管理' },
      { value: 'bi', label: '商业智能' },
      { value: 'pm', label: '项目管理' },
      { value: 'ai', label: 'AI服务' },
      { value: 'gis', label: 'GIS' },
      { value: 'mobile', label: '移动端' },
      { value: 'rs', label: '研发管理' },
      { value: 'srm', label: '供应商' },
    ],
    listWidth: 120,
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { value: 'installed', label: '已安装' },
      { value: 'enabled', label: '已启用' },
      { value: 'disabled', label: '已禁用' },
      { value: 'upgradable', label: '可升级' },
    ],
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 200,
  },
  {
    name: 'author',
    label: '作者',
    type: 'text',
    listWidth: 120,
    hideInForm: true,
  },
];

export const pluginSchema: EntitySchema = {
  entity: 'plugin',
  title: '插件',
  description: '管理系统插件，支持安装、启用、禁用、升级',
  fields: pluginFields,
  actions: [],
  list: {
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'installed', label: '已安装' },
          { value: 'enabled', label: '已启用' },
          { value: 'disabled', label: '已禁用' },
          { value: 'upgradable', label: '可升级' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'workflow', label: '工作流' },
          { value: 'erp', label: 'ERP' },
          { value: 'hrm', label: '人力资源' },
          { value: 'crm', label: '客户管理' },
          { value: 'mes', label: '制造执行' },
          { value: 'quality', label: '质量管理' },
          { value: 'scm', label: '供应链' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 20,
    selectable: false,
  },
  readonly: true,
};

// ============ 系统通知 Schema ============

export const notificationFields: SchemaField[] = [
  {
    name: 'title',
    label: '标题',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 200,
  },
  {
    name: 'content',
    label: '内容',
    type: 'textarea',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 300,
  },
  {
    name: 'type',
    label: '类型',
    type: 'select',
    required: true,
    options: [
      { value: 'info', label: '信息' },
      { value: 'warning', label: '警告' },
      { value: 'error', label: '错误' },
      { value: 'success', label: '成功' },
    ],
    listWidth: 100,
  },
  {
    name: 'target',
    label: '目标',
    type: 'select',
    required: true,
    options: [
      { value: 'all', label: '所有用户' },
      { value: 'role_admin', label: '管理员' },
      { value: 'role_user', label: '普通用户' },
      { value: 'specific', label: '指定用户' },
    ],
    listWidth: 120,
  },
  {
    name: 'created_at',
    label: '发送时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const notificationSchema: EntitySchema = {
  entity: 'notification',
  title: '系统通知',
  description: '发送系统通知给指定用户或角色',
  fields: notificationFields,
  actions: ['create'],
  list: {
    filters: [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { value: 'all', label: '全部' },
          { value: 'info', label: '信息' },
          { value: 'warning', label: '警告' },
          { value: 'error', label: '错误' },
          { value: 'success', label: '成功' },
        ],
        defaultValue: 'all',
      },
    ],
    pageSize: 20,
    selectable: false,
  },
  formColCount: 2,
  createTitle: '发送通知',
};
