import apiClient from '../client';
import type { ApiResponse } from '../client';
import { assetApi } from '../asset/asset';
import {
  purchaseOrderApi,
  salesOrderApi,
  inventoryApi,
  materialApi,
  supplierApi,
  customerApi,
  productionOrderApi,
  customerExtendedApi,
  salesOrderExtendedApi,
  addressbookApi,
  announcementApi,
  auditApi,
  fixedAssetApi,
  officeSupplyApi,
  vehicleApi,
  dictApi,
  openingBalanceApi,
  searchApi,
  consolidationApi,
  leaveRequestApi,
  hrProxyApi,
  dbStructureApi,
  mdmRefsApi,
  mdmLifecycleApi,
} from './core';

export * from './types';
export * from './utils';
export * from './core';

// 资产 API：使用统一 Asset schema（@/api/erp/types），覆盖 core/asset.ts 的旧实现
export { assetApi } from '../asset/asset';

export { voucherApi } from '../finance/voucher';
export { receivableApi, payableApi } from './receivablePayable';
export { budgetApi } from '../finance/budget';
export { reportApi, financeReportApi } from '../finance/report';
export { expenseApi } from '../finance/expense';
export { accountingSubjectApi } from '../finance/accountingSubject';
export { bankAccountApi } from './bankAccount';

export { officeSupplyApi } from './admin/officeSupplies';
export { meetingRoomApi, meetingBookingApi } from './admin/meeting';
export { vehicleApi, vehicleRequestApi } from './core/vehicle';
export { announcementApi } from './core/announcement';

export { auditApi } from './audit';
export { databaseApi } from './database';

export interface ErpDashboardStats {
  total_assets: number;
  active_assets: number;
  total_orders: number;
  pending_orders: number;
  total_inventory: number;
  low_stock_items: number;
  total_suppliers: number;
  active_suppliers: number;
  total_customers: number;
  active_customers: number;
  total_vouchers: number;
  pending_vouchers: number;
}

export const erpApi = {
  purchaseOrders: purchaseOrderApi,
  salesOrders: salesOrderApi,
  inventory: inventoryApi,
  materials: materialApi,
  suppliers: supplierApi,
  customers: customerApi,
  productionOrders: productionOrderApi,
  customerExtended: customerExtendedApi,
  salesOrderExtended: salesOrderExtendedApi,
  addressbook: addressbookApi,
  announcements: announcementApi,
  assets: assetApi,
  audit: auditApi,
  fixedAssets: fixedAssetApi,
  officeSupplies: officeSupplyApi,
  vehicles: vehicleApi,
  dictionary: dictApi,
  openingBalances: openingBalanceApi,
  search: searchApi,
  consolidation: consolidationApi,
  leaveRequests: leaveRequestApi,
  hr: hrProxyApi,
  dbStructure: dbStructureApi,
  mdm: mdmRefsApi,
  mdmLifecycle: mdmLifecycleApi,

  async health(): Promise<ApiResponse<string>> {
    return apiClient.erp.get<string>('/health');
  },

  async getDashboard(): Promise<ApiResponse<ErpDashboardStats>> {
    return apiClient.erp.get<ErpDashboardStats>('/dashboard');
  },
};

export default erpApi;
