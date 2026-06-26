import apiClient from '../client';
import type { ApiResponse } from '../client';

export * from './types';
export * from './utils';

export { voucherApi } from './finance/voucher';
export { receivableApi, payableApi } from './finance/receivable-payable';
export { assetApi, fixedAssetApi } from './finance/asset';
export { budgetApi, expenseApi } from './finance/budget';
export { accountingSubjectApi, openingBalanceApi } from './finance/accounting';
export { financeReportApi } from './finance/report';
export { bankAccountApi, bankTransactionApi } from './finance/bank';

export { officeSupplyApi } from './admin/office-supplies';
export { meetingRoomApi, meetingBookingApi } from './admin/meeting';
export { vehicleApi, vehicleRequestApi } from './admin/vehicle';
export { announcementApi } from './admin/announcement';

export const erpApi = {
  async health(): Promise<ApiResponse<string>> {
    return apiClient.erp.get<string>('/health');
  },
};

export default erpApi;
