export interface Product {
  id: string;
  product_no: string;
  name: string;
  description?: string;
  category?: string;
  version: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface ProductDocument {
  id: string;
  document_no: string;
  name: string;
  product_id?: string;
  document_type: string;
  version: string;
  status: 'active' | 'inactive' | 'obsolete';
  file_path?: string;
  created_at: string;
}

export interface Material {
  id: string;
  material_no: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ProductVersion {
  id: string;
  product_id: string;
  version: string;
  version_no: string;
  description?: string;
  is_latest: boolean;
  status: 'draft' | 'released' | 'archived';
  created_at: string;
}

export interface ProductConfig {
  id: string;
  product_id: string;
  config_key: string;
  config_value: string;
  description?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
