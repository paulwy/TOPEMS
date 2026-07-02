import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
} from './types';

const generateMockMaterials = (): Material[] => {
  const categories = ['电子元件', '机械零件', '化工原料', '包装材料', '五金工具'];
  const statuses: Material['status'][] = ['active', 'inactive', 'obsolete'];
  const suppliers = [
    { id: 'S001', name: '上海精密仪器有限公司' },
    { id: 'S002', name: '苏州电子科技有限公司' },
    { id: 'S003', name: '深圳五金制品厂' },
  ];
  const units = ['个', '块', '米', '千克', '套', '箱'];

  return Array.from({ length: 45 }, (_, i) => {
    const category = categories[i % categories.length];
    const supplier = suppliers[i % suppliers.length];
    const date = new Date();
    date.setDate(date.getDate() - i * 2);

    return {
      id: `M${String(i + 1).padStart(6, '0')}`,
      material_code: `MAT${String(i + 1).padStart(6, '0')}`,
      material_name: `${category}-${String.fromCharCode(65 + (i % 26))}${String(i + 1).padStart(3, '0')}`,
      specification: `规格${i + 1}`,
      category,
      unit: units[i % units.length],
      unit_price: Math.round((Math.random() * 500 + 10) * 100) / 100,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: statuses[i % statuses.length],
      description: `这是${category}类物料的描述信息`,
      barcode: `BAR${String(i + 1).padStart(8, '0')}`,
      weight: Math.round(Math.random() * 1000) / 100,
      volume: Math.round(Math.random() * 500) / 100,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    };
  });
};

const mockMaterials = generateMockMaterials();

export const materialApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      materials: Material[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const page = params?.page ?? 0;
    const pagesize = params?.pageSize ?? 10;
    const search = params?.search?.toLowerCase() ?? '';
    const status = params?.status ?? 'all';
    const category = params?.category ?? 'all';

    let filtered = [...mockMaterials];

    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.material_code.toLowerCase().includes(search) ||
          m.material_name.toLowerCase().includes(search)
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((m) => m.status === status);
    }

    if (category !== 'all') {
      filtered = filtered.filter((m) => m.category === category);
    }

    const total = filtered.length;
    const start = page * pagesize;
    const materials = filtered.slice(start, start + pagesize);

    return createMockSuccessResponse(
      {
        materials,
        total,
        page,
        pagesize,
      },
      200,
      '查询成功'
    ) as ApiResponse<{
      materials: Material[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<Material>> {
    const material = mockMaterials.find((m) => m.id === id);
    if (!material) {
      return createMockErrorResponse('物料不存在', 404) as ApiResponse<Material>;
    }
    return createMockSuccessResponse(material, 200, '查询成功') as ApiResponse<Material>;
  },

  async create(data: CreateMaterialRequest): Promise<ApiResponse<Material>> {
    const now = new Date().toISOString();
    const newMaterial: Material = {
      id: `M${Date.now()}`,
      material_code: data.material_code,
      material_name: data.material_name,
      specification: data.specification,
      category: data.category,
      unit: data.unit,
      unit_price: data.unit_price,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      status: (data.status as Material['status']) || 'active',
      description: data.description,
      barcode: data.barcode,
      weight: data.weight,
      volume: data.volume,
      created_at: now,
      updated_at: now,
    };
    mockMaterials.unshift(newMaterial);
    return createMockSuccessResponse(newMaterial, 201, '创建成功') as ApiResponse<Material>;
  },

  async update(id: string, data: UpdateMaterialRequest): Promise<ApiResponse<Material>> {
    const index = mockMaterials.findIndex((m) => m.id === id);
    if (index === -1) {
      return createMockErrorResponse('物料不存在', 404) as ApiResponse<Material>;
    }
    const updated = {
      ...mockMaterials[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as Material;
    mockMaterials[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<Material>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockMaterials.findIndex((m) => m.id === id);
    if (index === -1) {
      return createMockErrorResponse('物料不存在', 404) as ApiResponse<string>;
    }
    mockMaterials.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },
};
