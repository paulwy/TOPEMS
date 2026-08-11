import { billingApi } from './billing';
import { invoiceApi } from './invoice';
import { paymentApi } from './payment';
import { refundApi } from './refund';
import { statementApi } from './statement';
import { dashboardApi } from './dashboard';
import { taxApi } from './tax';
import { reminderApi } from './reminder';
import { batchApi } from './batch';

export type {
  PlanType,
  BillingCycle,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  BillingPlan,
  Subscription,
  Invoice,
  PaymentRecord,
  BillingStats,
} from './billing';

export { billingApi } from './billing';
export { invoiceApi } from './invoice';
export { paymentApi } from './payment';
export { refundApi } from './refund';
export { statementApi } from './statement';
export { dashboardApi } from './dashboard';
export { taxApi } from './tax';
export { reminderApi } from './reminder';
export { batchApi } from './batch';

export type {
  InvoiceItem,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  ListInvoiceQuery,
} from './invoice';

export type { PaymentStatus, CreatePaymentRequest, PaymentQuery } from './payment';

export type { RefundStatus, RefundRecord, CreateRefundRequest, RefundQuery } from './refund';

export type {
  MetricUsage,
  UsageMetrics,
  CostBreakdown,
  PeriodInfo,
  UsageSummary,
  UsageRecord,
  RevenueReportItem,
  OutstandingItem,
  MetricType,
} from './statement';

export type {
  BillingDashboardSummary,
  RevenueTrendPoint,
  InvoiceHealthMetric,
  CollectionMetric,
} from './dashboard';

export type {
  TaxRule,
  TaxRate,
  TaxCalculationResult,
  TaxFiling,
  TaxFilingStatus,
  CreateTaxRuleRequest,
  CreateTaxCalculationRequest,
  CreateTaxFilingRequest,
} from './tax';

export type { BillReminder, CreateReminderRequest, ReminderType } from './reminder';

export type { BatchTask, BatchTaskStatus } from './batch';

export const billingModule = {
  ...billingApi,
  invoices: invoiceApi,
  payments: paymentApi,
  refunds: refundApi,
  statements: statementApi,
  dashboard: dashboardApi,
  tax: taxApi,
  reminders: reminderApi,
  batch: batchApi,
};

export default billingModule;
