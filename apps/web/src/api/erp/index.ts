import apiClient from '../client';
import type { ApiResponse } from '../client';
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
  assetApi,
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

export { voucherApi } from './finance/voucher';
export { receivableApi, payableApi } from './finance/receivablePayable';
export { assetApi, fixedAssetApi } from './finance/asset';
export { assetCategoryApi } from './finance/assetCategory';
export { budgetApi, expenseApi } from './finance/budget';
export { accountingSubjectApi, openingBalanceApi } from './finance/accounting';
export { financeReportApi } from './finance/report';
export { bankAccountApi, bankTransactionApi } from './finance/bank';

export { officeSupplyApi } from './admin/officeSupplies';
export {
  meetingRoomApi,
  meetingBookingApi,
  meetingRoomCrudApi,
  meetingBookingCrudApi,
} from './admin/meeting';
export { vehicleApi, vehicleRequestApi } from './admin/vehicle';
export { announcementApi, announcementCrudApi } from './admin/announcement';

export { auditApi } from './audit';
export { databaseApi } from './database';
export { masterDataSyncApi } from './masterData';

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
