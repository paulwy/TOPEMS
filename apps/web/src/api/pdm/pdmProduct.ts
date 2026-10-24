export interface Product {
  id: string;
  tenant_id: string;
  product_no: string;
  name: string;
  description?: string;
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  product_no: string;
  name: string;
  description?: string;
  version?: string;
  status?: string;
}

export interface UpdateProductRequest {
  product_no?: string;
  name?: string;
  description?: string;
  version?: string;
  status?: string;
}

/** V259 TypeMap: 导出供 config.ts ListPageProps<ProductQuery> 使用 */
export interface ProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}
