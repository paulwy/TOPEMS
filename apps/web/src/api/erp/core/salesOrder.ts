import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  SalesOrder,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
} from './types';

const generateMockSalesOrders = (): SalesOrder[] => {
  const statuses: SalesOrder['status'][] = [
    'draft',
    'pending',
    'approved',
    'partially_shipped',
    'shipped',
    'completed',
    'cancelled',
  ];
  const customers = [
    { id: 'C001', name: '上海智造科技有限公司' },
    { id: 'C002', name: '北京创新电子有限公司' },
    { id: 'C003', name: '深圳未来科技有限公司' },
    { id: 'C004', name: '广州智能制造集团' },
    { id: 'C005', name: '杭州数字技术有限公司' },
  ];

  return Array.from({ length: 30 }, (_, i) => {
    const customer = customers[i % customers.length];
    const date = new Date();
    date.setDate(date.getDate() - i * 2);
    const deliveryDate = new Date(date);
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    return {
      id: `SO${String(i + 1).padStart(6, '0')}`,
      order_number: `SO2024${String(i + 1).padStart(6, '0')}`,
      customer_id: customer.id,
      customer_name: customer.name,
      total_amount: Math.round((Math.random() * 150000 + 10000) * 100) / 100,
      currency: 'CNY',
      order_date: date.toISOString().split('T')[0],
      delivery_date: deliveryDate.toISOString().split('T')[0],
      actual_delivery_date: i % 5 === 0 ? deliveryDate.toISOString().split('T')[0] : undefined,
      status: statuses[i % statuses.length],
      remark: i % 4 === 0 ? '重要客户订单' : '',
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      created_by: 'admin',
    };
  });
};

let mockSalesOrders = generateMockSalesOrders();

export const salesOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: SalesOrder[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const page = params?.page ?? 0;
    const pagesize = params?.pageSize ?? 10;
    const search = params?.search?.toLowerCase() ?? '';
    const status = params?.status ?? 'all';

    let filtered = [...mockSalesOrders];

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.customer_name.toLowerCase().includes(search)
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
      orders: SalesOrder[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<SalesOrder>> {
    const order = mockSalesOrders.find((o) => o.id === id);
    if (!order) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    return createMockSuccessResponse(order, 200, '查询成功') as ApiResponse<SalesOrder>;
  },

  async create(data: CreateSalesOrderRequest): Promise<ApiResponse<SalesOrder>> {
    const now = new Date().toISOString();
    const newOrder: SalesOrder = {
      id: `SO${Date.now()}`,
      order_number: data.order_number,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      total_amount: data.total_amount,
      currency: data.currency || 'CNY',
      order_date: data.order_date,
      delivery_date: data.delivery_date,
      actual_delivery_date: undefined,
      status: 'draft',
      remark: data.remark,
      created_at: now,
      updated_at: now,
      created_by: 'admin',
    };
    mockSalesOrders.unshift(newOrder);
    return createMockSuccessResponse(newOrder, 201, '创建成功') as ApiResponse<SalesOrder>;
  },

  async update(
    id: string,
    data: UpdateSalesOrderRequest
  ): Promise<ApiResponse<SalesOrder>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    const updated = {
      ...mockSalesOrders[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as SalesOrder;
    mockSalesOrders[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<SalesOrder>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<string>;
    }
    mockSalesOrders.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },

  async approve(id: string): Promise<ApiResponse<SalesOrder>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    mockSalesOrders[index] = {
      ...mockSalesOrders[index],
      status: 'approved',
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockSalesOrders[index],
      200,
      '审批通过'
    ) as ApiResponse<SalesOrder>;
  },

  async ship(id: string): Promise<ApiResponse<SalesOrder>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    mockSalesOrders[index] = {
      ...mockSalesOrders[index],
      status: 'shipped',
      actual_delivery_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockSalesOrders[index],
      200,
      '已发货'
    ) as ApiResponse<SalesOrder>;
  },

  async complete(id: string): Promise<ApiResponse<SalesOrder>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    mockSalesOrders[index] = {
      ...mockSalesOrders[index],
      status: 'completed',
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockSalesOrders[index],
      200,
      '订单已完成'
    ) as ApiResponse<SalesOrder>;
  },

  async cancel(id: string): Promise<ApiResponse<SalesOrder>> {
    const index = mockSalesOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockErrorResponse('销售订单不存在', 404) as ApiResponse<SalesOrder>;
    }
    mockSalesOrders[index] = {
      ...mockSalesOrders[index],
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    return createMockSuccessResponse(
      mockSalesOrders[index],
      200,
      '订单已取消'
    ) as ApiResponse<SalesOrder>;
  },
};
