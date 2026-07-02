import type { ApiResponse } from '../../client';
import { createMockSuccessResponse, createMockErrorResponse } from '../utils';
import type {
  PaginationParams,
  Inventory,
  CreateInventoryRequest,
  UpdateInventoryRequest,
} from './types';

const generateMockInventory = (): Inventory[] => {
  const materials = [
    { id: 'M001', code: 'MAT001', name: '电子元件A型', spec: '10x10mm', unit: '个' },
    { id: 'M002', code: 'MAT002', name: '电路板PCB-01', spec: '200x150mm', unit: '块' },
    { id: 'M003', code: 'MAT003', name: '不锈钢螺丝', spec: 'M8x30', unit: '个' },
    { id: 'M004', code: 'MAT004', name: '铝合金型材', spec: '6063-T5', unit: '米' },
    { id: 'M005', code: 'MAT005', name: '电容100uF', spec: '16V', unit: '个' },
    { id: 'M006', code: 'MAT006', name: '电阻10KΩ', spec: '1/4W', unit: '个' },
    { id: 'M007', code: 'MAT007', name: 'LED灯珠', spec: '5mm白光', unit: '个' },
    { id: 'M008', code: 'MAT008', name: '变压器', spec: '220V/12V 5A', unit: '个' },
  ];
  const warehouses = [
    { id: 'WH001', name: '主仓库' },
    { id: 'WH002', name: '原料仓库' },
    { id: 'WH003', name: '成品仓库' },
  ];

  return Array.from({ length: 40 }, (_, i) => {
    const material = materials[i % materials.length];
    const warehouse = warehouses[Math.floor(i / materials.length) % warehouses.length];
    const quantity = Math.floor(Math.random() * 5000 + 100);
    const safetyStock = Math.floor(quantity * 0.2);
    const unitCost = Math.round((Math.random() * 100 + 1) * 100) / 100;
    const date = new Date();
    date.setDate(date.getDate() - i * 5);

    return {
      id: `INV${String(i + 1).padStart(6, '0')}`,
      material_id: material.id,
      material_code: material.code,
      material_name: material.name,
      specification: material.spec,
      unit: material.unit,
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      location_id: `LOC${String((i % 10) + 1).padStart(3, '0')}`,
      location_name: `A区-${Math.floor(i / 10) + 1}排`,
      quantity,
      available_quantity: Math.floor(quantity * 0.9),
      reserved_quantity: Math.floor(quantity * 0.1),
      safety_stock: safetyStock,
      max_stock: quantity * 3,
      unit_cost: unitCost,
      total_cost: Math.round(quantity * unitCost * 100) / 100,
      batch_number: `BATCH${String(i + 1).padStart(4, '0')}`,
      production_date: date.toISOString().split('T')[0],
      expiry_date: undefined,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    };
  });
};

const mockInventory = generateMockInventory();

export const inventoryApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      items: Inventory[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const page = params?.page ?? 0;
    const pagesize = params?.pageSize ?? 10;
    const search = params?.search?.toLowerCase() ?? '';
    const status = params?.status ?? 'all';

    let filtered = [...mockInventory];

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.material_code.toLowerCase().includes(search) ||
          item.material_name.toLowerCase().includes(search) ||
          item.warehouse_name.toLowerCase().includes(search)
      );
    }

    if (status !== 'all') {
      if (status === 'low_stock') {
        filtered = filtered.filter((item) => item.quantity < (item.safety_stock || 0));
      } else if (status === 'normal') {
        filtered = filtered.filter(
          (item) =>
            item.quantity >= (item.safety_stock || 0) &&
            item.quantity <= (item.max_stock || Infinity)
        );
      } else if (status === 'overstock') {
        filtered = filtered.filter((item) => item.quantity > (item.max_stock || Infinity));
      } else if (status === 'out_of_stock') {
        filtered = filtered.filter((item) => item.quantity === 0);
      }
    }

    const total = filtered.length;
    const start = page * pagesize;
    const items = filtered.slice(start, start + pagesize);

    return createMockSuccessResponse(
      {
        items,
        total,
        page,
        pagesize,
      },
      200,
      '查询成功'
    ) as ApiResponse<{
      items: Inventory[];
      total: number;
      page: number;
      pagesize: number;
    }>;
  },

  async get(id: string): Promise<ApiResponse<Inventory>> {
    const item = mockInventory.find((i) => i.id === id);
    if (!item) {
      return createMockErrorResponse('库存记录不存在', 404) as ApiResponse<Inventory>;
    }
    return createMockSuccessResponse(item, 200, '查询成功') as ApiResponse<Inventory>;
  },

  async create(data: CreateInventoryRequest): Promise<ApiResponse<Inventory>> {
    const now = new Date().toISOString();
    const newItem: Inventory = {
      id: `INV${Date.now()}`,
      material_id: data.material_id,
      material_code: data.material_code,
      material_name: data.material_name,
      specification: data.specification,
      unit: data.unit,
      warehouse_id: data.warehouse_id,
      warehouse_name: data.warehouse_name,
      location_id: data.location_id,
      location_name: data.location_name,
      quantity: data.quantity,
      available_quantity: data.quantity,
      reserved_quantity: 0,
      safety_stock: data.safety_stock,
      max_stock: data.max_stock,
      unit_cost: data.unit_cost,
      total_cost: data.unit_cost ? Math.round(data.quantity * data.unit_cost * 100) / 100 : 0,
      batch_number: data.batch_number,
      production_date: data.production_date,
      expiry_date: data.expiry_date,
      created_at: now,
      updated_at: now,
    };
    mockInventory.unshift(newItem);
    return createMockSuccessResponse(newItem, 201, '创建成功') as ApiResponse<Inventory>;
  },

  async update(id: string, data: UpdateInventoryRequest): Promise<ApiResponse<Inventory>> {
    const index = mockInventory.findIndex((i) => i.id === id);
    if (index === -1) {
      return createMockErrorResponse('库存记录不存在', 404) as ApiResponse<Inventory>;
    }
    const updated = {
      ...mockInventory[index],
      ...data,
      updated_at: new Date().toISOString(),
    } as Inventory;
    mockInventory[index] = updated;
    return createMockSuccessResponse(updated, 200, '更新成功') as ApiResponse<Inventory>;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const index = mockInventory.findIndex((i) => i.id === id);
    if (index === -1) {
      return createMockErrorResponse('库存记录不存在', 404) as ApiResponse<string>;
    }
    mockInventory.splice(index, 1);
    return createMockSuccessResponse('删除成功', 200, '删除成功') as ApiResponse<string>;
  },

  async getLowStock(): Promise<ApiResponse<Inventory[]>> {
    const lowStockItems = mockInventory.filter((item) => item.quantity < (item.safety_stock || 0));
    return createMockSuccessResponse(lowStockItems, 200, '查询成功') as ApiResponse<Inventory[]>;
  },
};
