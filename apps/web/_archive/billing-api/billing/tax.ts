/**
 * Billing · 税务管理 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /billing/tax-rules
 *   POST   /billing/tax-rules
 *   GET    /billing/tax-rules/{id}
 *   PUT    /billing/tax-rules/{id}
 *   DELETE /billing/tax-rules/{id}
 *   GET    /billing/tax-rates
 *   POST   /billing/tax-calculations
 *   GET    /billing/tax-filings
 *   POST   /billing/tax-filings
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type TaxFilingStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'paid';

export interface TaxRule {
  id: string;
  tenant_id: string;
  name: string;
  jurisdiction: string;
  region?: string;
  tax_type: string;
  rate: number;
  is_compound: boolean;
  applies_to: Array<string>;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  jurisdiction: string;
  region?: string;
  postal_code?: string;
  combined_rate: number;
  state_rate: number;
  county_rate: number;
  city_rate: number;
  special_rate: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxes: Array<{
    jurisdiction: string;
    tax_type: string;
    rate: number;
    amount: number;
  }>;
  total_tax: number;
  grand_total: number;
}

export interface TaxFiling {
  id: string;
  tenant_id: string;
  period: string;
  jurisdiction: string;
  tax_type: string;
  status: TaxFilingStatus;
  total_tax_due: number;
  total_tax_collected: number;
  net_payment: number;
  submitted_at?: string;
  filed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxRuleRequest {
  name: string;
  jurisdiction: string;
  region?: string;
  tax_type: string;
  rate: number;
  is_compound?: boolean;
  applies_to?: Array<string>;
  effective_from: string;
  effective_to?: string;
}

export interface CreateTaxCalculationRequest {
  tenant_id: string;
  items: Array<{
    amount: number;
    category?: string;
  }>;
  shipping_address?: {
    country: string;
    region?: string;
    postal_code?: string;
  };
  billing_address?: {
    country: string;
    region?: string;
    postal_code?: string;
  };
}

export interface CreateTaxFilingRequest {
  period: string;
  jurisdiction: string;
  tax_type: string;
}

export const taxApi = {
  listTaxRules: async (params?: {
    jurisdiction?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<TaxRule[]>> => {
    return apiClient.billing.get('/billing/tax-rules', { params });
  },

  getTaxRule: async (id: string): Promise<ApiResponse<TaxRule>> => {
    return apiClient.billing.get(`/billing/tax-rules/${id}`);
  },

  createTaxRule: async (data: CreateTaxRuleRequest): Promise<ApiResponse<TaxRule>> => {
    return apiClient.billing.post('/billing/tax-rules', data);
  },

  updateTaxRule: async (
    id: string,
    data: Partial<CreateTaxRuleRequest>
  ): Promise<ApiResponse<TaxRule>> => {
    return apiClient.billing.put(`/billing/tax-rules/${id}`, data);
  },

  deleteTaxRule: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.billing.delete(`/billing/tax-rules/${id}`);
  },

  getTaxRates: async (params: {
    jurisdiction?: string;
    region?: string;
    postal_code?: string;
  }): Promise<ApiResponse<TaxRate[]>> => {
    return apiClient.billing.get('/billing/tax-rates', { params });
  },

  calculateTax: async (
    data: CreateTaxCalculationRequest
  ): Promise<ApiResponse<TaxCalculationResult>> => {
    return apiClient.billing.post('/billing/tax-calculations', data);
  },

  listTaxFilings: async (params?: {
    status?: TaxFilingStatus;
    jurisdiction?: string;
    period_from?: string;
    period_to?: string;
  }): Promise<ApiResponse<TaxFiling[]>> => {
    return apiClient.billing.get('/billing/tax-filings', { params });
  },

  createTaxFiling: async (data: CreateTaxFilingRequest): Promise<ApiResponse<TaxFiling>> => {
    return apiClient.billing.post('/billing/tax-filings', data);
  },
};

export default taxApi;
