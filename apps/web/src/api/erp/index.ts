import apiClient from '../client';
import type { ApiResponse } from '../client';
import {
  purchaseOrderApi,
  salesOrderApi,
  inventoryApi,
  materialApi,
  supplierApi,
  customerApi,
} from './core';

export * from './types';
export * from './utils';
export * from './core';

export { voucherApi } from './finance/voucher';
export { receivableApi, payableApi } from './finance/receivablePayable';
export { assetApi, fixedAssetApi } from './finance/asset';
export { budgetApi, expenseApi } from './finance/budget';
export { accountingSubjectApi, openingBalanceApi } from './finance/accounting';
export { financeReportApi } from './finance/report';
export { bankAccountApi, bankTransactionApi } from './finance/bank';

export { officeSupplyApi } from './admin/officeSupplies';
export { meetingRoomApi, meetingBookingApi, meetingRoomCrudApi, meetingBookingCrudApi } from './admin/meeting';
export { vehicleApi, vehicleRequestApi } from './admin/vehicle';
export { announcementApi, announcementCrudApi } from './admin/announcement';

export { auditApi } from './audit';
export { databaseApi } from './database';

export const erpApi = {
  purchaseOrders: purchaseOrderApi,
  salesOrders: salesOrderApi,
  inventory: inventoryApi,
  materials: materialApi,
  suppliers: supplierApi,
  customers: customerApi,

  async health(): Promise<ApiResponse<string>> {
    return apiClient.erp.get<string>('/health');
  },
};

export default erpApi;
