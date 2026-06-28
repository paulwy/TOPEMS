import type { LowCodeApp, AppVersion, AppPublishParams } from './types';

const mockApps: LowCodeApp[] = [
  {
    id: 'app-001',
    name: '客户关系管理',
    label: '客户关系管理',
    code: 'crm-app',
    description: '完整的客户关系管理应用，包含客户、商机、合同等管理功能',
    icon: 'Users',
    color: '#1976d2',
    status: 'published',
    version: '2.1.0',
    currentVersion: '2.1.0',
    category: '销售管理',
    modelCount: 2,
    pageCount: 3,
    formCount: 2,
    workflowCount: 2,
    createdBy: 'admin',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-06-25T14:30:00Z',
    publishedAt: '2024-03-15T10:00:00Z',
    pages: [
      { id: 'p-001', name: '客户列表', path: '/customers', type: 'list' },
      { id: 'p-002', name: '客户详情', path: '/customers/:id', type: 'detail' },
      { id: 'p-003', name: '商机列表', path: '/opportunities', type: 'list' },
    ],
    forms: [
      { id: 'f-001', name: '客户表单', modelId: 'dm-001' },
      { id: 'f-002', name: '商机表单', modelId: 'dm-002' },
    ],
    dataModels: ['dm-001', 'dm-002'],
    workflows: ['wf-001', 'wf-002'],
  },
  {
    id: 'app-002',
    name: '员工管理系统',
    label: '员工管理系统',
    code: 'hr-app',
    description: '员工信息管理、考勤、薪资等人力资源管理功能',
    icon: 'UserCheck',
    color: '#388e3c',
    status: 'testing',
    version: '1.0.0',
    currentVersion: '1.0.0',
    category: '人力资源',
    modelCount: 2,
    pageCount: 2,
    formCount: 1,
    workflowCount: 1,
    createdBy: 'hr_admin',
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-06-28T11:00:00Z',
    pages: [
      { id: 'p-004', name: '员工列表', path: '/employees', type: 'list' },
      { id: 'p-005', name: '部门架构', path: '/departments', type: 'tree' },
    ],
    forms: [
      { id: 'f-003', name: '员工信息表单', modelId: 'dm-004' },
    ],
    dataModels: ['dm-004', 'dm-005'],
    workflows: ['wf-003'],
  },
  {
    id: 'app-003',
    name: '产品管理',
    label: '产品管理',
    code: 'product-app',
    description: '产品信息、分类、库存管理',
    icon: 'Package',
    color: '#f57c00',
    status: 'developing',
    version: '0.5.0',
    currentVersion: '0.5.0',
    category: '供应链',
    modelCount: 1,
    pageCount: 1,
    formCount: 1,
    workflowCount: 0,
    createdBy: 'admin',
    createdAt: '2024-05-10T10:00:00Z',
    updatedAt: '2024-06-28T16:00:00Z',
    pages: [
      { id: 'p-006', name: '产品列表', path: '/products', type: 'list' },
    ],
    forms: [
      { id: 'f-004', name: '产品表单', modelId: 'dm-003' },
    ],
    dataModels: ['dm-003'],
    workflows: [],
  },
  {
    id: 'app-004',
    name: '设备巡检',
    label: '设备巡检',
    code: 'inspection-app',
    description: '设备巡检计划、巡检记录、异常处理',
    icon: 'ClipboardCheck',
    color: '#7b1fa2',
    status: 'draft',
    version: '0.1.0',
    currentVersion: '0.1.0',
    category: '设备管理',
    modelCount: 0,
    pageCount: 0,
    formCount: 0,
    workflowCount: 0,
    createdBy: 'admin',
    createdAt: '2024-06-20T14:00:00Z',
    updatedAt: '2024-06-28T09:00:00Z',
    pages: [],
    forms: [],
    dataModels: [],
    workflows: [],
  },
  {
    id: 'app-005',
    name: '采购申请',
    label: '采购申请',
    code: 'purchase-app',
    description: '采购申请流程、审批、订单跟踪',
    icon: 'ShoppingCart',
    color: '#c62828',
    status: 'published',
    version: '1.2.0',
    currentVersion: '1.2.0',
    category: '供应链',
    modelCount: 0,
    pageCount: 2,
    formCount: 0,
    workflowCount: 1,
    createdBy: 'admin',
    createdAt: '2024-02-15T11:00:00Z',
    updatedAt: '2024-06-10T13:00:00Z',
    publishedAt: '2024-04-01T09:00:00Z',
    pages: [
      { id: 'p-007', name: '采购申请', path: '/purchase-requisitions', type: 'list' },
      { id: 'p-008', name: '采购订单', path: '/purchase-orders', type: 'list' },
    ],
    forms: [],
    dataModels: [],
    workflows: ['wf-004'],
  },
  {
    id: 'app-006',
    name: '质量管理',
    label: '质量管理',
    code: 'quality-app',
    description: '质量检验、不合格品处理、质量追溯',
    icon: 'ShieldCheck',
    color: '#00838f',
    status: 'archived',
    version: '0.8.0',
    currentVersion: '0.8.0',
    category: '质量管理',
    modelCount: 0,
    pageCount: 0,
    formCount: 0,
    workflowCount: 0,
    createdBy: 'admin',
    createdAt: '2024-01-20T08:30:00Z',
    updatedAt: '2024-04-15T10:00:00Z',
    pages: [],
    forms: [],
    dataModels: [],
    workflows: [],
  },
];

const mockVersions: Record<string, AppVersion[]> = {
  'app-001': [
    { id: 'v-001', version: '2.1.0', description: '新增商机管理模块', status: 'published', publishedAt: '2024-06-25T14:30:00Z', publishedBy: 'admin', createdAt: '2024-06-20T10:00:00Z' },
    { id: 'v-002', version: '2.0.0', description: '重大版本升级，重构数据模型', status: 'published', publishedAt: '2024-05-10T09:00:00Z', publishedBy: 'admin', createdAt: '2024-04-25T08:00:00Z' },
    { id: 'v-003', version: '1.5.0', description: '优化客户列表性能', status: 'deprecated', publishedAt: '2024-03-15T10:00:00Z', publishedBy: 'admin', createdAt: '2024-03-01T09:00:00Z' },
    { id: 'v-004', version: '1.0.0', description: '初始版本发布', status: 'deprecated', publishedAt: '2024-01-20T11:00:00Z', publishedBy: 'admin', createdAt: '2024-01-10T08:00:00Z' },
  ],
  'app-002': [
    { id: 'v-005', version: '1.0.0', description: '员工管理系统首个测试版本', status: 'draft', createdAt: '2024-05-20T10:00:00Z' },
  ],
  'app-005': [
    { id: 'v-006', version: '1.2.0', description: '新增采购订单模块', status: 'published', publishedAt: '2024-06-10T13:00:00Z', publishedBy: 'admin', createdAt: '2024-05-25T09:00:00Z' },
    { id: 'v-007', version: '1.0.0', description: '采购申请初始版本', status: 'published', publishedAt: '2024-04-01T09:00:00Z', publishedBy: 'admin', createdAt: '2024-02-15T11:00:00Z' },
  ],
};

export async function listApps(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
}) {
  let data = [...mockApps];
  
  if (params?.search) {
    const search = params.search.toLowerCase();
    data = data.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.code.toLowerCase().includes(search) ||
      a.description?.toLowerCase().includes(search)
    );
  }
  
  if (params?.status) {
    data = data.filter(a => a.status === params.status);
  }

  if (params?.category) {
    data = data.filter(a => a.category === params.category);
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = data.length;
  const start = (page - 1) * pageSize;
  const items = data.slice(start, start + pageSize);

  return {
    code: 0,
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function getApp(id: string) {
  const app = mockApps.find(a => a.id === id);
  return {
    code: 0,
    success: true,
    data: app,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function createApp(data: Partial<LowCodeApp>) {
  const newApp: LowCodeApp = {
    id: `app-${Date.now()}`,
    name: data.name || '',
    code: data.code || '',
    description: data.description || '',
    icon: data.icon || 'Box',
    color: data.color || '#1976d2',
    status: 'draft',
    version: '0.1.0',
    category: data.category,
    pages: [],
    forms: [],
    dataModels: [],
    workflows: [],
    createdBy: 'current_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockApps.unshift(newApp);
  return {
    code: 0,
    success: true,
    data: newApp,
    message: '创建成功',
    timestamp: new Date().toISOString(),
  };
}

export async function updateApp(id: string, data: Partial<LowCodeApp>) {
  const index = mockApps.findIndex(a => a.id === id);
  if (index !== -1) {
    mockApps[index] = {
      ...mockApps[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return {
      code: 0,
      success: true,
      data: mockApps[index],
      message: '更新成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '应用不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteApp(id: string) {
  const index = mockApps.findIndex(a => a.id === id);
  if (index !== -1) {
    mockApps.splice(index, 1);
    return {
      code: 0,
      success: true,
      data: null,
      message: '删除成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '应用不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function getAppVersions(appId: string) {
  const versions = mockVersions[appId] || [];
  return {
    code: 0,
    success: true,
    data: versions,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function publishApp(params: AppPublishParams) {
  const app = mockApps.find(a => a.id === params.appId);
  if (app) {
    const newVersion: AppVersion = {
      id: `v-${Date.now()}`,
      version: params.version,
      description: params.description,
      status: 'published',
      publishedAt: new Date().toISOString(),
      publishedBy: 'current_user',
      createdAt: new Date().toISOString(),
    };
    
    if (!mockVersions[params.appId]) {
      mockVersions[params.appId] = [];
    }
    mockVersions[params.appId].unshift(newVersion);
    
    app.status = 'published';
    app.version = params.version;
    app.publishedAt = new Date().toISOString();
    app.updatedAt = new Date().toISOString();
    
    return {
      code: 0,
      success: true,
      data: newVersion,
      message: '发布成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '应用不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function getAppOverview() {
  const total = mockApps.length;
  const published = mockApps.filter(a => a.status === 'published').length;
  const developing = mockApps.filter(a => a.status === 'developing').length;
  const testing = mockApps.filter(a => a.status === 'testing').length;
  const draft = mockApps.filter(a => a.status === 'draft').length;
  
  const categoryStats: Record<string, number> = {};
  mockApps.forEach(a => {
    if (a.category) {
      categoryStats[a.category] = (categoryStats[a.category] || 0) + 1;
    }
  });

  const recentApps = mockApps.slice(0, 5);

  return {
    code: 0,
    success: true,
    data: {
      total,
      published,
      developing,
      testing,
      draft,
      categoryStats,
      recentApps,
      totalApps: total,
      totalModels: 12,
      totalWorkflows: 8,
      totalUsers: 56,
    },
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}
