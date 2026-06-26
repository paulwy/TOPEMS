export { accountApi } from './account';
export { voucherApi } from './voucher';
export { receivablePayableApi } from './receivable-payable';
export { reportApi } from './report';
export { voucherTemplateApi } from './voucher-template';
export { periodApi } from './period';
export { counterpartyFinanceApi } from './counterparty';

import { accountApi } from './account';
import { voucherApi } from './voucher';
import { receivablePayableApi } from './receivable-payable';
import { reportApi } from './report';
import { voucherTemplateApi } from './voucher-template';
import { periodApi } from './period';
import { counterpartyFinanceApi } from './counterparty';

export const financeApi = {
  account: accountApi,
  voucher: voucherApi,
  receivablePayable: receivablePayableApi,
  report: reportApi,
  voucherTemplate: voucherTemplateApi,
  period: periodApi,
  counterparty: counterpartyFinanceApi,
};

export default financeApi;
