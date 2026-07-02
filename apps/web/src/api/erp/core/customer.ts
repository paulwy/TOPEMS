import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './types';

const generateMockCustomers = (): Customer[] => {
  const categories = ['大型企业', '中型企业', '小型企业', '政府机构', '个人客户'];
  const industries = ['电子制造', '机械制造', '化工', '金融', '互联网', '医疗'];
  const statuses: Customer['status'][] = ['active', 'inactive', 'blacklisted'];
  const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB'];
  const cities = ['上海', '北京', '深圳', '广州', '苏州', '杭州', '南京', '成都', '武汉', '西安'];

  return Array.from({ length: 30 }, (_, i) => {
    const category = categories[i % categories.length];
    const industry = industries[i % industries.length];
    const city = cities[i % cities.length];
    const date = new Date();
    date.setDate(date.getDate() - i * 5);

    return {
      id: `C${String(i + 1).padStart(6, '0')}`,
      customer_code: `CUS${String(i + 1).padStart(6, '0')}`,
      customer_name: `${city}${industry.slice(0, 2)}科技有限公司`,
      short_name: `${city}${industry.slice(0, 2)}`,
      contact_person: `客户联系人${i + 1}`,
      contact_phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      contact_email: `customer${i + 1}@example.com`,
      address: `${city}市高新区创业路${i + 1}号`,
      country: '中国',
      province: `${city}省`,
      city,
      zip_code: `1000${String(i).padStart(2, '0')}`,
      tax_number: `91110000MA1FL${String(i + 1).padStart(6, '0')}`,
      bank_account: `62284812${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
      bank_name: '中国建设银行',
      credit_limit: Math.floor(Math.random() * 5000000 + 100000),
      credit_rating: ratings[i % ratings.length],
      status: statuses[i % statuses.length],
      category,
      industry,
      remark: i % 6 === 0 ? 'VIP客户，优先处理' : '',
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    };
  });
};

const mockCustomers = generateMockCustomers();

export const customerApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      customers: Customer[];
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
    const industry = params?.industry ?? 'all';

    let filtered = [...mockCustomers];

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.customer_code.toLowerCase().includes(search) ||
          c.customer_name.toLowerCase().includes(search) ||
          (c.contact_person && c.contact_person.toLowerCase().includes(search))
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (category !== 'all') {
      filtered = filtered.filter((c) => c.category === category);
    }

    if (industry !== 'all') {
      filtered = filtered.filter((c) => c.industry === industry);
    }

    const total = filtered.length;
    const start = page * pagesize;
    const customers = filtered.slice(start, start + pagesize);

    return createMockSuccessResponse(
      {
        customers,
        total,
        page,
        pagesize,
      },
      200,
      '查询成功'
    ) as ApiResponse<{
      customers: Customer[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<Customer>> {
    const customer = mockCustomers.find((c) => c.id === id);
    if (!customer) {
      return createMockErrorResponse('客户不存在', 404) as ApiResponse<Customer>;
    }
    return createMockSuccessResponse(customer, 200, '查询成功') as ApiResponse<Customer>;
  },

  async create(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: `C${Date.now()}`,
      customer_code: data.customer_code,
      customer_name: data.customer_name,
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
      credit_limit: data.credit_limit,
      credit_rating: data.credit_rating,
      status: (data.status as Customer['status']) || 'active',
      category: data.category,
      industry: data.industry,
      remark: data.remark,
      created_at: now,
      updated_at: now,
    };
    mockCustomers.unshift(newCustomer);
    return createMockSuccessResponse(newCustomer, 201, '创建成功') as ApiResponse<Customer>;
  },

  async update(id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    const index = mockCustomers.findIndex((c) => c.id === id);
    if (index === -1) {
      return createMockErrorResponse('客户不存在', 404) as ApiResponse<Customer>;
    }
    const updated = {
      ...mockCustomers[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as Customer;
    mockCustomers[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<Customer>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockCustomers.findIndex((c) => c.id === id);
    if (index === -1) {
      return createMockErrorResponse('客户不存在', 404) as ApiResponse<string>;
    }
    mockCustomers.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },
};
