import type {
  DataModel,
  ModelField,
  ModelRelation,
  DataPreviewParams,
  DataPreviewResult,
} from './types';

const mockDataModels: DataModel[] = [
  {
    id: 'dm-001',
    name: 'customer',
    label: '客户',
    description: '客户信息管理模型',
    tableName: 'lc_customer',
    status: 'published',
    version: '1.0.0',
    dataSourceId: 'ds-001',
    recordCount: 1256,
    createdBy: 'admin',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-06-20T14:20:00Z',
    fields: [
      {
        id: 'f-001',
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: 'f-002',
        name: 'name',
        label: '客户名称',
        type: 'string',
        length: 200,
        required: true,
        searchable: true,
        sortable: true,
        order: 1,
      },
      {
        id: 'f-003',
        name: 'code',
        label: '客户编号',
        type: 'string',
        length: 50,
        required: true,
        unique: true,
        searchable: true,
        sortable: true,
        order: 2,
      },
      {
        id: 'f-004',
        name: 'type',
        label: '客户类型',
        type: 'select',
        required: false,
        searchable: true,
        order: 3,
        options: [
          { label: '企业客户', value: 'enterprise' },
          { label: '个人客户', value: 'individual' },
          { label: '合作伙伴', value: 'partner' },
        ],
      },
      {
        id: 'f-005',
        name: 'industry',
        label: '所属行业',
        type: 'select',
        order: 4,
        options: [
          { label: '制造业', value: 'manufacturing' },
          { label: '零售业', value: 'retail' },
          { label: '服务业', value: 'service' },
          { label: '科技', value: 'technology' },
        ],
      },
      {
        id: 'f-006',
        name: 'contact',
        label: '联系人',
        type: 'string',
        length: 100,
        searchable: true,
        order: 5,
      },
      { id: 'f-007', name: 'phone', label: '联系电话', type: 'string', length: 50, order: 6 },
      { id: 'f-008', name: 'email', label: '电子邮箱', type: 'string', length: 200, order: 7 },
      { id: 'f-009', name: 'address', label: '地址', type: 'text', order: 8 },
      {
        id: 'f-010',
        name: 'level',
        label: '客户等级',
        type: 'select',
        order: 9,
        options: [
          { label: 'VIP', value: 'vip' },
          { label: '普通', value: 'normal' },
          { label: '潜在', value: 'potential' },
        ],
      },
      {
        id: 'f-011',
        name: 'creditLimit',
        label: '信用额度',
        type: 'currency',
        precision: 15,
        scale: 2,
        order: 10,
      },
      {
        id: 'f-012',
        name: 'isActive',
        label: '是否启用',
        type: 'boolean',
        defaultValue: true,
        order: 11,
      },
      { id: 'f-013', name: 'remark', label: '备注', type: 'richText', order: 12 },
      {
        id: 'f-014',
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 13,
      },
      {
        id: 'f-015',
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 14,
      },
      {
        id: 'f-016',
        name: 'createdBy',
        label: '创建人',
        type: 'createdBy',
        isSystem: true,
        order: 15,
      },
      {
        id: 'f-017',
        name: 'updatedBy',
        label: '更新人',
        type: 'updatedBy',
        isSystem: true,
        order: 16,
      },
    ],
    relations: [
      {
        id: 'r-001',
        name: 'orders',
        type: 'oneToMany',
        sourceModelId: 'dm-001',
        sourceFieldId: 'f-001',
        targetModelId: 'dm-002',
        targetFieldId: 'f-020',
        description: '客户订单',
      },
    ],
  },
  {
    id: 'dm-002',
    name: 'salesOrder',
    label: '销售订单',
    description: '销售订单管理模型',
    tableName: 'lc_sales_order',
    status: 'published',
    version: '1.1.0',
    dataSourceId: 'ds-001',
    recordCount: 3420,
    createdBy: 'admin',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-06-25T16:30:00Z',
    fields: [
      {
        id: 'f-018',
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: 'f-019',
        name: 'orderNo',
        label: '订单编号',
        type: 'string',
        length: 50,
        required: true,
        unique: true,
        searchable: true,
        sortable: true,
        order: 1,
      },
      {
        id: 'f-020',
        name: 'customerId',
        label: '客户ID',
        type: 'relation',
        relationModelId: 'dm-001',
        relationField: 'name',
        relationType: 'manyToOne',
        required: true,
        order: 2,
      },
      {
        id: 'f-021',
        name: 'orderDate',
        label: '订单日期',
        type: 'date',
        required: true,
        sortable: true,
        order: 3,
      },
      { id: 'f-022', name: 'deliveryDate', label: '交货日期', type: 'date', order: 4 },
      {
        id: 'f-023',
        name: 'status',
        label: '订单状态',
        type: 'select',
        required: true,
        searchable: true,
        sortable: true,
        order: 5,
        options: [
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '生产中', value: 'producing' },
          { label: '已发货', value: 'shipped' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      {
        id: 'f-024',
        name: 'totalAmount',
        label: '订单总额',
        type: 'currency',
        precision: 15,
        scale: 2,
        required: true,
        sortable: true,
        order: 6,
      },
      { id: 'f-025', name: 'discount', label: '折扣率', type: 'percent', order: 7 },
      {
        id: 'f-026',
        name: 'priority',
        label: '优先级',
        type: 'select',
        order: 8,
        options: [
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
      },
      { id: 'f-027', name: 'attachments', label: '附件', type: 'file', order: 9 },
      { id: 'f-028', name: 'remark', label: '备注', type: 'text', order: 10 },
      {
        id: 'f-029',
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 11,
      },
      {
        id: 'f-030',
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 12,
      },
    ],
  },
  {
    id: 'dm-003',
    name: 'product',
    label: '产品',
    description: '产品信息管理模型',
    tableName: 'lc_product',
    status: 'draft',
    version: '0.1.0',
    dataSourceId: 'ds-001',
    recordCount: 0,
    createdBy: 'admin',
    createdAt: '2024-06-01T11:00:00Z',
    updatedAt: '2024-06-28T10:15:00Z',
    fields: [
      {
        id: 'f-031',
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: 'f-032',
        name: 'sku',
        label: '产品编码',
        type: 'string',
        length: 100,
        required: true,
        unique: true,
        searchable: true,
        order: 1,
      },
      {
        id: 'f-033',
        name: 'name',
        label: '产品名称',
        type: 'string',
        length: 200,
        required: true,
        searchable: true,
        sortable: true,
        order: 2,
      },
      {
        id: 'f-034',
        name: 'category',
        label: '产品分类',
        type: 'multiSelect',
        order: 3,
        options: [
          { label: '电子产品', value: 'electronics' },
          { label: '机械设备', value: 'machinery' },
          { label: '原材料', value: 'raw_material' },
          { label: '包装材料', value: 'packaging' },
        ],
      },
      {
        id: 'f-035',
        name: 'price',
        label: '单价',
        type: 'currency',
        precision: 12,
        scale: 2,
        required: true,
        order: 4,
      },
      { id: 'f-036', name: 'stock', label: '库存数量', type: 'integer', defaultValue: 0, order: 5 },
      { id: 'f-037', name: 'image', label: '产品图片', type: 'image', order: 6 },
      { id: 'f-038', name: 'description', label: '产品描述', type: 'richText', order: 7 },
      {
        id: 'f-039',
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 8,
      },
      {
        id: 'f-040',
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 9,
      },
    ],
  },
  {
    id: 'dm-004',
    name: 'employee',
    label: '员工',
    description: '员工信息管理模型',
    tableName: 'lc_employee',
    status: 'published',
    version: '2.0.0',
    dataSourceId: 'ds-001',
    recordCount: 568,
    createdBy: 'hr_admin',
    createdAt: '2024-01-20T08:30:00Z',
    updatedAt: '2024-06-15T13:45:00Z',
    fields: [
      {
        id: 'f-041',
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: 'f-042',
        name: 'empNo',
        label: '工号',
        type: 'string',
        length: 50,
        required: true,
        unique: true,
        searchable: true,
        order: 1,
      },
      {
        id: 'f-043',
        name: 'name',
        label: '姓名',
        type: 'string',
        length: 100,
        required: true,
        searchable: true,
        sortable: true,
        order: 2,
      },
      {
        id: 'f-044',
        name: 'gender',
        label: '性别',
        type: 'select',
        order: 3,
        options: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ],
      },
      { id: 'f-045', name: 'birthday', label: '出生日期', type: 'date', order: 4 },
      {
        id: 'f-046',
        name: 'entryDate',
        label: '入职日期',
        type: 'date',
        required: true,
        sortable: true,
        order: 5,
      },
      {
        id: 'f-047',
        name: 'department',
        label: '部门',
        type: 'relation',
        relationModelId: 'dm-005',
        relationField: 'name',
        relationType: 'manyToOne',
        order: 6,
      },
      { id: 'f-048', name: 'position', label: '职位', type: 'string', length: 100, order: 7 },
      {
        id: 'f-049',
        name: 'salary',
        label: '薪资',
        type: 'currency',
        precision: 12,
        scale: 2,
        order: 8,
      },
      {
        id: 'f-050',
        name: 'isActive',
        label: '在职',
        type: 'boolean',
        defaultValue: true,
        order: 9,
      },
      {
        id: 'f-051',
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 10,
      },
      {
        id: 'f-052',
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 11,
      },
    ],
  },
  {
    id: 'dm-005',
    name: 'department',
    label: '部门',
    description: '部门组织架构模型',
    tableName: 'lc_department',
    status: 'published',
    version: '1.0.0',
    dataSourceId: 'ds-001',
    recordCount: 32,
    createdBy: 'hr_admin',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-05-20T09:30:00Z',
    fields: [
      {
        id: 'f-053',
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: 'f-054',
        name: 'code',
        label: '部门编码',
        type: 'string',
        length: 50,
        required: true,
        unique: true,
        order: 1,
      },
      {
        id: 'f-055',
        name: 'name',
        label: '部门名称',
        type: 'string',
        length: 100,
        required: true,
        searchable: true,
        sortable: true,
        order: 2,
      },
      {
        id: 'f-056',
        name: 'parentId',
        label: '上级部门',
        type: 'relation',
        relationModelId: 'dm-005',
        relationField: 'name',
        relationType: 'manyToOne',
        order: 3,
      },
      { id: 'f-057', name: 'manager', label: '部门负责人', type: 'string', length: 100, order: 4 },
      { id: 'f-058', name: 'sort', label: '排序', type: 'integer', defaultValue: 0, order: 5 },
      {
        id: 'f-059',
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 6,
      },
      {
        id: 'f-060',
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 7,
      },
    ],
  },
];

const generateMockPreviewData = (model: DataModel, page = 1, pageSize = 10): DataPreviewResult => {
  const nonSystemFields = model.fields.filter((f) => !f.isSystem);
  const columns = nonSystemFields.map((f) => ({
    key: f.name,
    title: f.label,
    type: f.type,
  }));

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < pageSize; i++) {
    const row: Record<string, unknown> = {};
    const idx = (page - 1) * pageSize + i + 1;
    nonSystemFields.forEach((field) => {
      switch (field.type) {
        case 'string':
          row[field.name] = `${field.label}${idx}`;
          break;
        case 'integer':
          row[field.name] = idx * 10;
          break;
        case 'float':
        case 'currency':
          row[field.name] = Number((idx * 100.5).toFixed(2));
          break;
        case 'percent':
          row[field.name] = Number((Math.random() * 100).toFixed(2));
          break;
        case 'date':
          row[field.name] = `2024-0${(idx % 9) + 1}-${String((idx % 28) + 1).padStart(2, '0')}`;
          break;
        case 'datetime':
          row[field.name] =
            `2024-0${(idx % 9) + 1}-${String((idx % 28) + 1).padStart(2, '0')} 10:30:00`;
          break;
        case 'boolean':
          row[field.name] = idx % 2 === 0;
          break;
        case 'select':
          row[field.name] = field.options?.[idx % (field.options?.length || 1)]?.value || '';
          break;
        case 'multiSelect':
          row[field.name] = field.options?.slice(0, (idx % 3) + 1).map((o) => o.value) || [];
          break;
        case 'relation':
          row[field.name] = `关联记录${idx}`;
          break;
        default:
          row[field.name] = `${field.label}值${idx}`;
      }
    });
    rows.push(row);
  }

  return {
    columns,
    rows,
    total: model.recordCount || 100,
    page,
    pageSize,
  };
};

export async function listDataModels(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dataSourceId?: string;
}) {
  let data = [...mockDataModels];

  if (params?.search) {
    const search = params.search.toLowerCase();
    data = data.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.label.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
    );
  }

  if (params?.status) {
    data = data.filter((m) => m.status === params.status);
  }

  if (params?.dataSourceId) {
    data = data.filter((m) => m.dataSourceId === params.dataSourceId);
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

export async function getDataModel(id: string) {
  const model = mockDataModels.find((m) => m.id === id);
  return {
    code: 0,
    success: true,
    data: model,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function createDataModel(data: Partial<DataModel>) {
  const newModel: DataModel = {
    id: `dm-${Date.now()}`,
    name: data.name || '',
    label: data.label || '',
    description: data.description || '',
    tableName: data.tableName || `lc_${data.name}`,
    fields: [
      {
        id: `f-${Date.now()}-1`,
        name: 'id',
        label: 'ID',
        type: 'id',
        isSystem: true,
        required: true,
        order: 0,
      },
      {
        id: `f-${Date.now()}-2`,
        name: 'createdAt',
        label: '创建时间',
        type: 'createdAt',
        isSystem: true,
        order: 1,
      },
      {
        id: `f-${Date.now()}-3`,
        name: 'updatedAt',
        label: '更新时间',
        type: 'updatedAt',
        isSystem: true,
        order: 2,
      },
    ],
    relations: [],
    status: 'draft',
    version: '0.1.0',
    dataSourceId: data.dataSourceId,
    recordCount: 0,
    createdBy: 'current_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDataModels.unshift(newModel);
  return {
    code: 0,
    success: true,
    data: newModel,
    message: '创建成功',
    timestamp: new Date().toISOString(),
  };
}

export async function updateDataModel(id: string, data: Partial<DataModel>) {
  const index = mockDataModels.findIndex((m) => m.id === id);
  if (index !== -1) {
    mockDataModels[index] = {
      ...mockDataModels[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return {
      code: 0,
      success: true,
      data: mockDataModels[index],
      message: '更新成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteDataModel(id: string) {
  const index = mockDataModels.findIndex((m) => m.id === id);
  if (index !== -1) {
    mockDataModels.splice(index, 1);
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
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function addField(modelId: string, field: Partial<ModelField>) {
  const model = mockDataModels.find((m) => m.id === modelId);
  if (model) {
    const newField: ModelField = {
      id: `f-${Date.now()}`,
      name: field.name || '',
      label: field.label || '',
      type: field.type || 'string',
      length: field.length,
      required: field.required || false,
      unique: field.unique || false,
      searchable: field.searchable || false,
      sortable: field.sortable || false,
      description: field.description,
      options: field.options,
      order: model.fields.length,
      ...field,
    };
    model.fields.push(newField);
    model.updatedAt = new Date().toISOString();
    return {
      code: 0,
      success: true,
      data: newField,
      message: '字段添加成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function updateField(modelId: string, fieldId: string, field: Partial<ModelField>) {
  const model = mockDataModels.find((m) => m.id === modelId);
  if (model) {
    const fieldIndex = model.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex !== -1) {
      model.fields[fieldIndex] = {
        ...model.fields[fieldIndex],
        ...field,
      };
      model.updatedAt = new Date().toISOString();
      return {
        code: 0,
        success: true,
        data: model.fields[fieldIndex],
        message: '字段更新成功',
        timestamp: new Date().toISOString(),
      };
    }
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '字段不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteField(modelId: string, fieldId: string) {
  const model = mockDataModels.find((m) => m.id === modelId);
  if (model) {
    const fieldIndex = model.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex !== -1 && !model.fields[fieldIndex].isSystem) {
      model.fields.splice(fieldIndex, 1);
      model.updatedAt = new Date().toISOString();
      return {
        code: 0,
        success: true,
        data: null,
        message: '字段删除成功',
        timestamp: new Date().toISOString(),
      };
    }
  }
  return {
    code: 400,
    success: false,
    data: null,
    message: '无法删除系统字段或字段不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function addRelation(modelId: string, relation: Partial<ModelRelation>) {
  const model = mockDataModels.find((m) => m.id === modelId);
  if (model) {
    const newRelation: ModelRelation = {
      id: `r-${Date.now()}`,
      name: relation.name || '',
      type: relation.type || 'oneToMany',
      sourceModelId: modelId,
      sourceFieldId: relation.sourceFieldId || '',
      targetModelId: relation.targetModelId || '',
      targetFieldId: relation.targetFieldId || '',
      description: relation.description,
    };
    model.relations = model.relations || [];
    model.relations.push(newRelation);
    model.updatedAt = new Date().toISOString();
    return {
      code: 0,
      success: true,
      data: newRelation,
      message: '关系添加成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteRelation(modelId: string, relationId: string) {
  const model = mockDataModels.find((m) => m.id === modelId);
  if (model && model.relations) {
    const index = model.relations.findIndex((r) => r.id === relationId);
    if (index !== -1) {
      model.relations.splice(index, 1);
      model.updatedAt = new Date().toISOString();
      return {
        code: 0,
        success: true,
        data: null,
        message: '关系删除成功',
        timestamp: new Date().toISOString(),
      };
    }
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '关系不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function getDataPreview(params: DataPreviewParams) {
  const model = mockDataModels.find((m) => m.id === params.modelId);
  if (model) {
    const result = generateMockPreviewData(model, params.page, params.pageSize);
    return {
      code: 0,
      success: true,
      data: result,
      message: 'success',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function publishModel(id: string) {
  const model = mockDataModels.find((m) => m.id === id);
  if (model) {
    model.status = 'published';
    model.updatedAt = new Date().toISOString();
    return {
      code: 0,
      success: true,
      data: model,
      message: '发布成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '模型不存在',
    timestamp: new Date().toISOString(),
  };
}
