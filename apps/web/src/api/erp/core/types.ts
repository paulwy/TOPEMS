import type { PaginationParams as BasePaginationParams } from '../../client';

export interface PaginationParams extends BasePaginationParams {
  status?: string;
  category?: string;
  industry?: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  currency?: string;
  order_date: string;
  expected_date?: string;
  actual_date?: string;
  status: 'draft' | 'pending' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  remark?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  received_quantity?: number;
  remark?: string;
}

export interface CreatePurchaseOrderRequest {
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  currency?: string;
  order_date: string;
  expected_date?: string;
  remark?: string;
  items?: CreatePurchaseOrderItemRequest[];
}

export interface CreatePurchaseOrderItemRequest {
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  remark?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  supplier_name?: string;
  total_amount?: number;
  currency?: string;
  expected_date?: string;
  actual_date?: string;
  status?: string;
  remark?: string;
  items?: CreatePurchaseOrderItemRequest[];
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  currency?: string;
  order_date: string;
  delivery_date?: string;
  actual_delivery_date?: string;
  status:
    'draft' | 'pending' | 'approved' | 'partially_shipped' | 'shipped' | 'completed' | 'cancelled';
  remark?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  shipped_quantity?: number;
  remark?: string;
}

export interface CreateSalesOrderRequest {
  order_number: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  currency?: string;
  order_date: string;
  delivery_date?: string;
  remark?: string;
  items?: CreateSalesOrderItemRequest[];
}

export interface CreateSalesOrderItemRequest {
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  remark?: string;
}

export interface UpdateSalesOrderRequest {
  customer_id?: string;
  customer_name?: string;
  total_amount?: number;
  currency?: string;
  delivery_date?: string;
  actual_delivery_date?: string;
  status?: string;
  remark?: string;
  items?: CreateSalesOrderItemRequest[];
}

export interface Inventory {
  id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id?: string;
  location_name?: string;
  quantity: number;
  available_quantity?: number;
  reserved_quantity?: number;
  safety_stock?: number;
  max_stock?: number;
  unit_cost?: number;
  total_cost?: number;
  batch_number?: string;
  production_date?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryRequest {
  material_id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  unit?: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id?: string;
  location_name?: string;
  quantity: number;
  safety_stock?: number;
  max_stock?: number;
  unit_cost?: number;
  batch_number?: string;
  production_date?: string;
  expiry_date?: string;
}

export interface UpdateInventoryRequest {
  quantity?: number;
  available_quantity?: number;
  reserved_quantity?: number;
  safety_stock?: number;
  max_stock?: number;
  unit_cost?: number;
  location_id?: string;
  location_name?: string;
}

export interface Material {
  id: string;
  material_code: string;
  material_name: string;
  specification?: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  supplier_id?: string;
  supplier_name?: string;
  status: 'active' | 'inactive' | 'obsolete';
  description?: string;
  barcode?: string;
  weight?: number;
  volume?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequest {
  material_code: string;
  material_name: string;
  specification?: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  supplier_id?: string;
  supplier_name?: string;
  status?: string;
  description?: string;
  barcode?: string;
  weight?: number;
  volume?: number;
}

export interface UpdateMaterialRequest {
  material_name?: string;
  specification?: string;
  category?: string;
  unit?: string;
  unit_price?: number;
  supplier_id?: string;
  supplier_name?: string;
  status?: string;
  description?: string;
  barcode?: string;
  weight?: number;
  volume?: number;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_rating?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  category?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  supplier_code: string;
  supplier_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_rating?: string;
  status?: string;
  category?: string;
  remark?: string;
}

export interface UpdateSupplierRequest {
  supplier_name?: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_rating?: string;
  status?: string;
  category?: string;
  remark?: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_limit?: number;
  credit_rating?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  category?: string;
  industry?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  customer_code: string;
  customer_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_limit?: number;
  credit_rating?: string;
  status?: string;
  category?: string;
  industry?: string;
  remark?: string;
}

export interface UpdateCustomerRequest {
  customer_name?: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_limit?: number;
  credit_rating?: string;
  status?: string;
  category?: string;
  industry?: string;
  remark?: string;
}

// ============ Production Orders (ERP V137) ============

export interface ProductionOrder {
  id: string;
  order_no: string;
  product_id?: string;
  product_name: string;
  product_code: string;
  quantity: number;
  completed_quantity?: number;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  source?: string;
  source_order_id?: string;
  source_order_number?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  workshop_id?: string;
  workshop_name?: string;
  priority?: number;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionOrderRequest {
  product_id?: string;
  product_name: string;
  product_code: string;
  quantity: number;
  planned_start_date?: string;
  planned_end_date?: string;
  workshop_id?: string;
  priority?: number;
  remark?: string;
}

export interface UpdateProductionOrderRequest {
  product_name?: string;
  product_code?: string;
  quantity?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  workshop_id?: string;
  priority?: number;
  remark?: string;
}

export interface UpdateProductionProgressRequest {
  completed_quantity?: number;
  status?: string;
  actual_start_date?: string;
  actual_end_date?: string;
}
