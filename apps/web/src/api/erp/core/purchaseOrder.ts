import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from './types';

const generateMockPurchaseOrders = (): PurchaseOrder[] => {
  const statuses: PurchaseOrder['status'][] = [
    'draft',
    'pending',
    'approved',
    'partially_received',
    'received',
    'cancelled',
  ];
  const suppliers = [
    { id: 'S001', name: '上海精密仪器有限公司' },
    { id: 'S002', name: '苏州电子科技有限公司' },
    { id: 'S003', name: '深圳五金制品厂' },
    { id: 'S004', name: '广州化工材料公司' },
    { id: 'S005', name: '北京机械设备厂' },
  ];

  return Array.from({ length: 35 }, (_, i) => {
    const supplier = suppliers[i % suppliers.length];
    const date = new Date();
    date.setDate(date.getDate() - i * 3);
    const expectedDate = new Date(date);
    expectedDate.setDate(expectedDate.getDate() + 14);

    return {
      id: `PO${String(i + 1).padStart(6, '0')}`,
      order_number: `PO2024${String(i + 1).padStart(6, '0')}`,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      total_amount: Math.round((Math.random() * 100000 + 5000) * 100) / 100,
      currency: 'CNY',
      order_date: date.toISOString().split('T')[0],
      expected_date: expectedDate.toISOString().split('T')[0],
      status: statuses[i % statuses.length],
      remark: i % 3 === 0 ? '加急订单，请优先处理' : '',
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      created_by: 'admin',
    };
  });
};

let mockPurchaseOrders = generateMockPurchaseOrders();

export const purchaseOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: PurchaseOrder[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const page = params?.page ?? 0;
    const pagesize = params?.pageSize ?? 10;
    const search = params?.search?.toLowerCase() ?? '';
    const status = params?.status ?? 'all';

    let filtered = [...mockPurchaseOrders];

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.supplier_name.toLowerCase().includes(search)
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((o) => o.status === status);
    }

    const total = filtered.length;
    const start = page * pagesize;
    const orders = filtered.slice(start, start + pagesize);

    return createMockSuccessResponse(
      {
        orders,
        total,
        page,
        pagesize,
      },
      200,
      '查询成功'
    ) as ApiResponse<{
      orders: PurchaseOrder[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<PurchaseOrder>> {
    const order = mockPurchaseOrders.find((o) => o.id === id);
    if (!order) {
      return createMockErrorResponse('采购订单不存在', 404) as ApiResponse<PurchaseOrder>;
    }
    return createMockSuccessResponse(order, 200, '查询成功') as ApiResponse<PurchaseOrder>;
  },

  async create(data: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    const now = new Date().toISOString();
    const newOrder: PurchaseOrder = {
      id: `PO${Date.now()}`,
      order_number: data.order_number,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      total_amount: data.total_amount,
      currency: data.currency || 'CNY',
      order_date: data.order_date,
      expected_date: data.expected_date,
      status: 'draft',
      remark: data.remark,
      created_at: now,
      updated_at: now,
      created_by: 'admin',
    };
    mockPurchaseOrders.unshift(newOrder);
    return createMockSuccessResponse(newOrder, 201, '创建成功') as ApiResponse<PurchaseOrder>;
  },

  async update(
    id: string,
    data: UpdatePurchaseOrderRequest
  ): Promise<ApiResponse<PurchaseOrder>> {
    const index = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('采购订单不存在', 404) as ApiResponse<PurchaseOrder>;
    }
    const updated = {
      ...mockPurchaseOrders[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as PurchaseOrder;
    mockPurchaseOrders[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<PurchaseOrder>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('采购订单不存在', 404) as ApiResponse<string>;
    }
    mockPurchaseOrders.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },

  async approve(id: string): Promise<ApiResponse<PurchaseOrder>> {
    const index = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('采购订单不存在', 404) as ApiResponse<PurchaseOrder>;
    }
    mockPurchaseOrders[index] = {
      ...mockPurchaseOrders[index],
      status: 'approved',
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockPurchaseOrders[index],
      200,
      '审批通过'
    ) as ApiResponse<PurchaseOrder>;
  },

  async cancel(id: string): Promise<ApiResponse<PurchaseOrder>> {
    const index = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('采购订单不存在', 404) as ApiResponse<PurchaseOrder>;
    }
    mockPurchaseOrders[index] = {
      ...mockPurchaseOrders[index],
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockPurchaseOrders[index],
      200,
      '订单已取消'
    ) as ApiResponse<PurchaseOrder>;
  },
};
