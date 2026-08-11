import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export type TaxFormType = 'VAT' | 'CIT' | 'PIT' | 'STAMP' | 'CUSTOMS' | 'OTHER';
export type TaxFormStatus = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'amended';
export type TaxScenarioType = 'forecast' | 'optimization' | 'comparison' | 'what-if';

export interface TaxForm {
  id: string;
  tenant_id: string;
  form_type: TaxFormType;
  tax_period: string;
  jurisdiction?: string;
  status: TaxFormStatus;
  total_tax?: number;
  currency?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaxFormGenerateRequest {
  form_type: TaxFormType;
  tax_period: string;
  jurisdiction?: string;
  entity_ids?: string[];
  auto_calculate?: boolean;
}

export interface TaxFormSubmitRequest {
  comment?: string;
  attachments?: string[];
}

export interface TaxSummary {
  period: string;
  jurisdiction?: string;
  forms_total: number;
  forms_submitted: number;
  forms_approved: number;
  forms_pending: number;
  total_tax_amount: number;
  total_credits: number;
  total_payable: number;
  by_type: Record<TaxFormType, { count: number; amount: number }>;
  generated_at: string;
}

export interface TaxSchedule {
  upcoming: Array<{
    form_type: TaxFormType;
    due_date: string;
    amount_estimate?: number;
    entity?: string;
  }>;
  overdue: Array<{
    form_type: TaxFormType;
    due_date: string;
    days_overdue: number;
    amount_due?: number;
  }>;
  by_month: Array<{
    month: string;
    total_due: number;
    total_paid: number;
    status: 'on_track' | 'at_risk' | 'overdue';
  }>;
}

export interface TaxCalculateRequest {
  form_type: TaxFormType;
  tax_period?: string;
  amount: number;
  currency?: string;
  jurisdiction?: string;
  region?: string;
  entity_type?: string;
  related_id?: string;
  meta?: Record<string, unknown>;
}

export interface TaxRate {
  id: string;
  jurisdiction: string;
  region?: string;
  tax_type: TaxFormType;
  bracket_min?: number;
  bracket_max?: number;
  rate: number;
  description?: string;
  effective_from?: string;
  effective_to?: string;
}

export interface TaxBreakdown {
  gross_amount: number;
  tax_free_amount: number;
  taxable_amount: number;
  rate: number;
  tax_amount: number;
  breakdown: Array<{
    component: string;
    rate: number;
    amount: number;
  }>;
  jurisdiction: string;
  form_type: TaxFormType;
}

export interface TaxValidation {
  is_valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field?: string; message: string }>;
  suggestions: string[];
}

export interface TaxPlan {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  period: string;
  strategy: string;
  estimated_savings?: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  assumptions?: Record<string, unknown>;
  scenarios?: TaxScenario[];
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface TaxScenario {
  id: string;
  plan_id?: string;
  name: string;
  type: TaxScenarioType;
  assumptions: Record<string, unknown>;
  projected_revenue?: number;
  projected_cost?: number;
  projected_tax?: number;
  projected_savings?: number;
  risk_level?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface TaxSuggestion {
  id: string;
  title: string;
  category: 'deduction' | 'credit' | 'exemption' | 'deferral' | 'restructure';
  description: string;
  estimated_benefit?: number;
  confidence: number;
  applicable_forms?: TaxFormType[];
  action?: string;
}

export interface TaxComparison {
  id: string;
  scenarios: Array<{
    name: string;
    revenue: number;
    cost: number;
    tax: number;
    net: number;
  }>;
  best_scenario?: string;
  comparison: Array<{
    metric: string;
    values: Record<string, number>;
    winner?: string;
  }>;
  generated_at: string;
}

export const taxApi = {
  // ==================== 自动税务申报 ====================

  generateForm: (data: TaxFormGenerateRequest): Promise<ApiResponse<TaxForm>> => {
    return apiClient.finance.post('/finance-v56/tax/generate', data);
  },

  listForms: (params?: {
    form_type?: TaxFormType;
    status?: TaxFormStatus;
    tax_period?: string;
    jurisdiction?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: TaxForm[]; total: number }>> => {
    return apiClient.finance.get('/finance-v56/tax/forms', { params });
  },

  getForm: (id: string): Promise<ApiResponse<TaxForm>> => {
    return apiClient.finance.get(`/finance-v56/tax/forms/${id}`);
  },

  submitForm: (id: string, data?: TaxFormSubmitRequest): Promise<ApiResponse<TaxForm>> => {
    return apiClient.finance.post(`/finance-v56/tax/forms/${id}/submit`, data || {});
  },

  amendForm: (
    id: string,
    data?: {
      reason?: string;
      changes?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<TaxForm>> => {
    return apiClient.finance.post(`/finance-v56/tax/forms/${id}/amend`, data || {});
  },

  // ==================== 税务概览 ====================

  getSummary: (params?: {
    period?: string;
    jurisdiction?: string;
  }): Promise<ApiResponse<TaxSummary>> => {
    return apiClient.finance.get('/finance-v56/tax/summary', { params });
  },

  getSchedule: (params?: {
    period?: string;
    jurisdiction?: string;
  }): Promise<ApiResponse<TaxSchedule>> => {
    return apiClient.finance.get('/finance-v56/tax/schedule', { params });
  },

  // ==================== 税率计算 ====================

  calculate: (data: TaxCalculateRequest): Promise<ApiResponse<TaxBreakdown>> => {
    return apiClient.finance.post('/finance-v56/tax/calculate', data);
  },

  listRates: (params?: {
    tax_type?: TaxFormType;
    jurisdiction?: string;
    region?: string;
  }): Promise<ApiResponse<TaxRate[]>> => {
    return apiClient.finance.get('/finance-v56/tax/rates', { params });
  },

  lookupRate: (data: {
    tax_type: TaxFormType;
    jurisdiction: string;
    amount?: number;
    date?: string;
  }): Promise<ApiResponse<TaxRate>> => {
    return apiClient.finance.get('/finance-v56/tax/rates/lookup', { params: data });
  },

  getBreakdown: (data: TaxCalculateRequest): Promise<ApiResponse<TaxBreakdown>> => {
    return apiClient.finance.get('/finance-v56/tax/breakdown', { params: data });
  },

  validate: (data: {
    form_type: TaxFormType;
    tax_period: string;
    data: Record<string, unknown>;
  }): Promise<ApiResponse<TaxValidation>> => {
    return apiClient.finance.get('/finance-v56/tax/validate', { params: data });
  },

  // ==================== 税务筹划 ====================

  createPlan: (data: {
    name: string;
    description?: string;
    period: string;
    strategy?: string;
    assumptions?: Record<string, unknown>;
  }): Promise<ApiResponse<TaxPlan>> => {
    return apiClient.finance.post('/finance-v56/tax/plan', data);
  },

  createScenario: (data: {
    plan_id?: string;
    name: string;
    type: TaxScenarioType;
    assumptions: Record<string, unknown>;
  }): Promise<ApiResponse<TaxScenario>> => {
    return apiClient.finance.post('/finance-v56/tax/scenario', data);
  },

  getSuggestions: (params?: {
    period?: string;
    form_type?: TaxFormType;
  }): Promise<ApiResponse<TaxSuggestion[]>> => {
    return apiClient.finance.get('/finance-v56/tax/suggestions', { params });
  },

  getComparison: (planId?: string): Promise<ApiResponse<TaxComparison>> => {
    return apiClient.finance.get('/finance-v56/tax/comparison', {
      params: planId ? { plan_id: planId } : {},
    });
  },

  listPlans: (params?: {
    status?: TaxPlan['status'];
    period?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: TaxPlan[]; total: number }>> => {
    return apiClient.finance.get('/finance-v56/tax/plans', { params });
  },

  approvePlan: (id: string, data?: { comment?: string }): Promise<ApiResponse<TaxPlan>> => {
    return apiClient.finance.put(`/finance-v56/tax/plans/${id}/approve`, data || {});
  },

  getComplianceStatus: (): Promise<
    ApiResponse<{
      compliance_rate: number;
      non_compliant_forms: number;
      overdue_forms: number;
      upcoming_deadlines: Array<{ form_type: TaxFormType; due_date: string }>;
      last_audit?: string;
    }>
  > => {
    return apiClient.finance.get('/finance-v56/tax/compliance');
  },
};

export default taxApi;
