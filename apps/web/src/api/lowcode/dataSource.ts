import type { DataSource, TableInfo, ColumnInfo } from './types';

const mockDataSources: DataSource[] = [
  {
    id: 'ds-001',
    name: '主业务数据库',
    type: 'mysql',
    config: {
      host: 'localhost',
      port: 3306,
      database: 'topems_business',
      username: 'root',
    },
    status: 'active',
    description: '核心业务数据库，存储所有业务数据',
    lastTestAt: '2024-06-28T10:00:00Z',
    tables: ['lc_customer', 'lc_sales_order', 'lc_product', 'lc_employee', 'lc_department'],
    createdBy: 'admin',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
  },
  {
    id: 'ds-002',
    name: '数据仓库',
    type: 'postgresql',
    config: {
      host: '192.168.1.100',
      port: 5432,
      database: 'topems_dw',
      username: 'dw_user',
    },
    status: 'active',
    description: '数据仓库，用于报表和分析',
    lastTestAt: '2024-06-27T15:30:00Z',
    tables: ['dim_customer', 'dim_product', 'fact_sales', 'fact_inventory'],
    createdBy: 'admin',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-06-15T09:00:00Z',
  },
  {
    id: 'ds-003',
    name: 'MongoDB日志库',
    type: 'mongodb',
    config: {
      host: '192.168.1.101',
      port: 27017,
      database: 'topems_logs',
    },
    status: 'inactive',
    description: '日志和非结构化数据存储',
    lastTestAt: '2024-05-20T11:00:00Z',
    tables: ['system_logs', 'operation_logs', 'access_logs'],
    createdBy: 'admin',
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-05-20T11:00:00Z',
  },
  {
    id: 'ds-004',
    name: 'ERP系统接口',
    type: 'api',
    config: {
      apiUrl: 'https://erp.example.com/api',
      apiKey: '******',
    },
    status: 'error',
    description: '对接外部ERP系统的API数据源',
    lastTestAt: '2024-06-28T08:00:00Z',
    createdBy: 'admin',
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-06-28T08:00:00Z',
  },
  {
    id: 'ds-005',
    name: 'Oracle财务库',
    type: 'oracle',
    config: {
      host: '192.168.1.102',
      port: 1521,
      database: 'FINDB',
      username: 'finance_user',
    },
    status: 'active',
    description: '财务系统Oracle数据库',
    lastTestAt: '2024-06-28T09:30:00Z',
    tables: ['GL_ACCOUNTS', 'AP_INVOICES', 'AR_RECEIPTS'],
    createdBy: 'finance_admin',
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2024-06-25T16:00:00Z',
  },
];

const mockTables: Record<string, TableInfo[]> = {
  'ds-001': [
    {
      name: 'lc_customer',
      comment: '客户表',
      rowCount: 1256,
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, comment: '主键ID' },
        { name: 'name', type: 'VARCHAR(200)', nullable: false, comment: '客户名称' },
        {
          name: 'code',
          type: 'VARCHAR(50)',
          nullable: false,
          isPrimaryKey: false,
          comment: '客户编号',
        },
        { name: 'type', type: 'VARCHAR(20)', nullable: true, comment: '客户类型' },
        { name: 'contact', type: 'VARCHAR(100)', nullable: true, comment: '联系人' },
        { name: 'phone', type: 'VARCHAR(50)', nullable: true, comment: '联系电话' },
        { name: 'email', type: 'VARCHAR(200)', nullable: true, comment: '电子邮箱' },
        { name: 'address', type: 'TEXT', nullable: true, comment: '地址' },
        { name: 'created_at', type: 'DATETIME', nullable: false, comment: '创建时间' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, comment: '更新时间' },
      ],
    },
    {
      name: 'lc_sales_order',
      comment: '销售订单表',
      rowCount: 3420,
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, comment: '主键ID' },
        { name: 'order_no', type: 'VARCHAR(50)', nullable: false, comment: '订单编号' },
        { name: 'customer_id', type: 'BIGINT', nullable: false, comment: '客户ID' },
        { name: 'order_date', type: 'DATE', nullable: false, comment: '订单日期' },
        { name: 'status', type: 'VARCHAR(20)', nullable: false, comment: '订单状态' },
        { name: 'total_amount', type: 'DECIMAL(15,2)', nullable: false, comment: '订单总额' },
        { name: 'created_at', type: 'DATETIME', nullable: false, comment: '创建时间' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, comment: '更新时间' },
      ],
    },
    { name: 'lc_product', comment: '产品表', rowCount: 856 },
    { name: 'lc_employee', comment: '员工表', rowCount: 568 },
    { name: 'lc_department', comment: '部门表', rowCount: 32 },
  ],
};

export async function listDataSources(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  let data = [...mockDataSources];

  if (params?.search) {
    const search = params.search.toLowerCase();
    data = data.filter(
      (d) => d.name.toLowerCase().includes(search) || d.description?.toLowerCase().includes(search)
    );
  }

  if (params?.type) {
    data = data.filter((d) => d.type === params.type);
  }

  if (params?.status) {
    data = data.filter((d) => d.status === params.status);
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

export async function getDataSource(id: string) {
  const ds = mockDataSources.find((d) => d.id === id);
  return {
    code: 0,
    success: true,
    data: ds,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function createDataSource(data: Partial<DataSource>) {
  const newDs: DataSource = {
    id: `ds-${Date.now()}`,
    name: data.name || '',
    type: data.type || 'mysql',
    config: data.config || {},
    status: 'inactive',
    description: data.description,
    createdBy: 'current_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDataSources.unshift(newDs);
  return {
    code: 0,
    success: true,
    data: newDs,
    message: '创建成功',
    timestamp: new Date().toISOString(),
  };
}

export async function updateDataSource(id: string, data: Partial<DataSource>) {
  const index = mockDataSources.findIndex((d) => d.id === id);
  if (index !== -1) {
    mockDataSources[index] = {
      ...mockDataSources[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return {
      code: 0,
      success: true,
      data: mockDataSources[index],
      message: '更新成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '数据源不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteDataSource(id: string) {
  const index = mockDataSources.findIndex((d) => d.id === id);
  if (index !== -1) {
    mockDataSources.splice(index, 1);
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
    message: '数据源不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function testDataSource(id: string) {
  const ds = mockDataSources.find((d) => d.id === id);
  if (ds) {
    ds.lastTestAt = new Date().toISOString();
    const success = ds.type !== 'api';
    ds.status = success ? 'active' : 'error';
    return {
      code: 0,
      success,
      data: {
        success,
        message: success ? '连接成功' : '连接失败：API密钥无效',
        responseTime: Math.floor(Math.random() * 200) + 50,
      },
      message: success ? '连接成功' : '连接失败',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '数据源不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function listTables(dataSourceId: string) {
  const tables = mockTables[dataSourceId] || [];
  return {
    code: 0,
    success: true,
    data: tables,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function getTableInfo(dataSourceId: string, tableName: string) {
  const tables = mockTables[dataSourceId] || [];
  const table = tables.find((t) => t.name === tableName);
  return {
    code: 0,
    success: true,
    data: table,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}
