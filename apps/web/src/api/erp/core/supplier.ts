import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from './types';

const generateMockSuppliers = (): Supplier[] => {
  const categories = ['原材料供应商', '零部件供应商', '设备供应商', '服务供应商', '办公用品供应商'];
  const statuses: Supplier['status'][] = ['active', 'inactive', 'blacklisted'];
  const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB'];
  const cities = ['上海', '北京', '深圳', '广州', '苏州', '杭州', '南京', '成都'];

  return Array.from({ length: 25 }, (_, i) => {
    const category = categories[i % categories.length];
    const city = cities[i % cities.length];
    const date = new Date();
    date.setDate(date.getDate() - i * 7);

    return {
      id: `S${String(i + 1).padStart(6, '0')}`,
      supplier_code: `SUP${String(i + 1).padStart(6, '0')}`,
      supplier_name: `${city}${category.slice(0, 2)}有限公司`,
      short_name: `${city}${category.slice(0, 2)}`,
      contact_person: `联系人${i + 1}`,
      contact_phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      contact_email: `supplier${i + 1}@example.com`,
      address: `${city}市浦东新区科技园${i + 1}号`,
      country: '中国',
      province: `${city}省`,
      city,
      zip_code: `2000${String(i).padStart(2, '0')}`,
      tax_number: `91310000MA1FL${String(i + 1).padStart(6, '0')}`,
      bank_account: `62220212${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
      bank_name: '中国工商银行',
      credit_rating: ratings[i % ratings.length],
      status: statuses[i % statuses.length],
      category,
      remark: i % 5 === 0 ? '优质供应商，长期合作' : '',
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    };
  });
};

const mockSuppliers = generateMockSuppliers();

export const supplierApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      suppliers: Supplier[];
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

    let filtered = [...mockSuppliers];

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.supplier_code.toLowerCase().includes(search) ||
          s.supplier_name.toLowerCase().includes(search) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(search))
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((s) => s.status === status);
    }

    if (category !== 'all') {
      filtered = filtered.filter((s) => s.category === category);
    }

    const total = filtered.length;
    const start = page * pagesize;
    const suppliers = filtered.slice(start, start + pagesize);

    return createMockSuccessResponse(
      {
        suppliers,
        total,
        page,
        pagesize,
      },
      200,
      '查询成功'
    ) as ApiResponse<{
      suppliers: Supplier[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<Supplier>> {
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (!supplier) {
      return createMockErrorResponse('供应商不存在', 404) as ApiResponse<Supplier>;
    }
    return createMockSuccessResponse(supplier, 200, '查询成功') as ApiResponse<Supplier>;
  },

  async create(data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> {
    const now = new Date().toISOString();
    const newSupplier: Supplier = {
      id: `S${Date.now()}`,
      supplier_code: data.supplier_code,
      supplier_name: data.supplier_name,
      short_name: data.short_name,
      contact_person: data.contact_person,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      address: data.address,
      country: data.country,
      province: data.province,
      city: data.city,
      zip_code: data.zip_code,
      tax_number: data.tax_number,
      bank_account: data.bank_account,
      bank_name: data.bank_name,
      credit_rating: data.credit_rating,
      status: (data.status as Supplier['status']) || 'active',
      category: data.category,
      remark: data.remark,
      created_at: now,
      updated_at: now,
    };
    mockSuppliers.unshift(newSupplier);
    return createMockSuccessResponse(newSupplier, 201, '创建成功') as ApiResponse<Supplier>;
  },

  async update(id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> {
    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      return createMockErrorResponse('供应商不存在', 404) as ApiResponse<Supplier>;
    }
    const updated = {
      ...mockSuppliers[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as Supplier;
    mockSuppliers[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<Supplier>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      return createMockErrorResponse('供应商不存在', 404) as ApiResponse<string>;
    }
    mockSuppliers.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },
};
