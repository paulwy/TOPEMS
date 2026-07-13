import { accountApi } from './account';
import { voucherApi } from './voucher';
import { receivablePayableApi } from './receivablePayable';
import { reportApi } from './report';
import { voucherTemplateApi } from './voucherTemplate';
import { periodApi } from './period';
import { counterpartyFinanceApi } from './counterparty';
import { paymentApi } from './payment';

export { accountApi } from './account';
export { voucherApi } from './voucher';
export { receivablePayableApi } from './receivablePayable';
export { reportApi } from './report';
export { voucherTemplateApi } from './voucherTemplate';
export { periodApi } from './period';
export { counterpartyFinanceApi } from './counterparty';
export { paymentApi } from './payment';

export const financeApi = {
  account: accountApi,
  voucher: voucherApi,
  receivablePayable: receivablePayableApi,
  report: reportApi,
  voucherTemplate: voucherTemplateApi,
  period: periodApi,
  counterparty: counterpartyFinanceApi,
  payment: paymentApi,
};

export default financeApi;
