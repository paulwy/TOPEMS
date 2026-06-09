export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risk_level: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risk_level: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  evaluation_no: string;
  evaluation_date: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierEvaluationRequest {
  supplier_id: string;
  evaluation_no: string;
  evaluator?: string;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  price_score?: number;
  comments?: string;
  status: string;
}

export interface UpdateSupplierEvaluationRequest extends Partial<CreateSupplierEvaluationRequest> {}

export interface PurchaseOrder {
  id: string;
  po_no: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  actual_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  po_no: string;
  supplier_id: string;
  expected_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  remarks?: string;
}

export interface UpdatePurchaseOrderRequest extends Partial<CreatePurchaseOrderRequest> {}

export interface SupplierContract {
  id: string;
  contract_no: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierContractRequest {
  contract_no: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
}

export interface UpdateSupplierContractRequest extends Partial<CreateSupplierContractRequest> {}

export interface SupplierProduct {
  id: string;
  product_no: string;
  supplier_id: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  currency: string;
  min_order_qty?: number;
  lead_time_days?: number;
  status: string;
  specifications?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierProductRequest {
  product_no: string;
  supplier_id: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  currency: string;
  min_order_qty?: number;
  lead_time_days?: number;
  status: string;
  specifications?: string;
}

export interface UpdateSupplierProductRequest extends Partial<CreateSupplierProductRequest> {}

export interface SupplierCategory {
  id: string;
  category_no: string;
  name: string;
  description?: string;
  parent_id?: string;
  level: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SrmStatistics {
  total_suppliers: number;
  active_suppliers: number;
  total_evaluations: number;
  avg_score: number;
  total_orders: number;
  total_order_amount: number;
  pending_orders: number;
  completed_orders: number;
  total_contracts: number;
  active_contracts: number;
}

export interface SupplierWithStats extends Supplier {
  total_orders: number;
  total_amount: number;
  avg_evaluation_score?: number;
  last_order_date?: string;
}
