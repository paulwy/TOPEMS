import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PlanType = 'basic' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'void';
export type PaymentMethod = 'credit_card' | 'alipay' | 'wechat' | 'bank_transfer';

export interface BillingPlan {
  id: string;
  name: string;
  type: PlanType;
  description?: string;
  price: number;
  currency: string;
  cycle: BillingCycle;
  features: Array<{
    name: string;
    limit?: number;
    unlimited?: boolean;
  }>;
  trial_days?: number;
  is_default?: boolean;
  created_at?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan?: BillingPlan;
  status: SubscriptionStatus;
  started_at: string;
  expires_at?: string;
  auto_renew: boolean;
  payment_method?: PaymentMethod;
  amount: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  subscription_id?: string;
  tenant_id: string;
  number: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date?: string;
  paid_date?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  paid_at?: string;
}

export interface BillingStats {
  total_revenue: number;
  monthly_revenue: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  overdue_invoices: number;
  by_plan: Record<PlanType, number>;
  revenue_trend: Array<{ month: string; amount: number }>;
}

export const billingApi = {
  // ==================== 计费计划 ====================

  listPlans: async (params?: {
    type?: PlanType;
    active?: boolean;
  }): Promise<ApiResponse<BillingPlan[]>> => {
    return apiClient.billing.get('/plans', { params });
  },

  getPlan: async (id: string): Promise<ApiResponse<BillingPlan>> => {
    return apiClient.billing.get(`/plans/${id}`);
  },

  createPlan: async (data: Omit<BillingPlan, 'id' | 'created_at'>): Promise<ApiResponse<BillingPlan>> => {
    return apiClient.billing.post('/plans', data);
  },

  updatePlan: async (id: string, data: Partial<BillingPlan>): Promise<ApiResponse<BillingPlan>> => {
    return apiClient.billing.put(`/plans/${id}`, data);
  },

  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.billing.delete(`/plans/${id}`);
  },

  // ==================== 订阅管理 ====================

  getSubscription: async (tenantId: string): Promise<ApiResponse<Subscription>> => {
    return apiClient.billing.get(`/subscriptions/${tenantId}`);
  },

  createSubscription: async (data: {
    tenant_id: string;
    plan_id: string;
    cycle: BillingCycle;
    payment_method?: PaymentMethod;
  }): Promise<ApiResponse<Subscription>> => {
    return apiClient.billing.post('/subscriptions', data);
  },

  changePlan: async (subscriptionId: string, data: {
    new_plan_id: string;
    prorate?: boolean;
  }): Promise<ApiResponse<Subscription>> => {
    return apiClient.billing.post(`/subscriptions/${subscriptionId}/change-plan`, data);
  },

  cancelSubscription: async (subscriptionId: string, data?: {
    reason?: string;
    cancel_at_period_end?: boolean;
  }): Promise<ApiResponse<Subscription>> => {
    return apiClient.billing.post(`/subscriptions/${subscriptionId}/cancel`, data || {});
  },

  resumeSubscription: async (subscriptionId: string): Promise<ApiResponse<Subscription>> => {
    return apiClient.billing.post(`/subscriptions/${subscriptionId}/resume`, {});
  },

  // ==================== 发票管理 ====================

  listInvoices: async (params?: {
    status?: InvoiceStatus;
    tenant_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<Invoice[]>> => {
    return apiClient.billing.get('/invoices', { params });
  },

  getInvoice: async (id: string): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.get(`/invoices/${id}`);
  },

  createInvoice: async (data: {
    tenant_id: string;
    items: Array<{ description: string; quantity: number; unit_price: number }>;
    due_date?: string;
  }): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post('/invoices', data);
  },

  markInvoicePaid: async (id: string, data?: {
    payment_date?: string;
  }): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post(`/invoices/${id}/mark-paid`, data || {});
  },

  voidInvoice: async (id: string, data?: { reason?: string }): Promise<ApiResponse<Invoice>> => {
    return apiClient.billing.post(`/invoices/${id}/void`, data || {});
  },

  // ==================== 支付 ====================

  createPayment: async (data: {
    invoice_id: string;
    method: PaymentMethod;
    amount: number;
  }): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.post('/payments', data);
  },

  getPayment: async (id: string): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.get(`/payments/${id}`);
  },

  listPayments: async (params?: {
    invoice_id?: string;
    status?: PaymentRecord['status'];
    method?: PaymentMethod;
  }): Promise<ApiResponse<PaymentRecord[]>> => {
    return apiClient.billing.get('/payments', { params });
  },

  refundPayment: async (id: string, data?: {
    amount?: number;
    reason?: string;
  }): Promise<ApiResponse<PaymentRecord>> => {
    return apiClient.billing.post(`/payments/${id}/refund`, data || {});
  },

  // ==================== 统计 ====================

  getStats: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<BillingStats>> => {
    return apiClient.billing.get('/stats', { params });
  },

  getRevenueReport: async (params?: {
    start_date?: string;
    end_date?: string;
    by?: 'plan' | 'month';
  }): Promise<ApiResponse<Array<{ period: string; revenue: number; plan?: string }>>> => {
    return apiClient.billing.get('/reports/revenue', { params });
  },
};

export default billingApi;
