import apiClient from '../client';
import type { ApiResponse } from '../client';

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

export interface ProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}

export const pdmProductApi = {
  async listProducts(params?: ProductQuery): Promise<ApiResponse<ProductListResponse>> {
    return apiClient.pdm.get<ProductListResponse>('/products', { params });
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return apiClient.pdm.get<Product>(`/products/${id}`);
  },

  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
    return apiClient.pdm.post<Product>('/products', data);
  },

  async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>> {
    return apiClient.pdm.put<Product>(`/products/${id}`, data);
  },

  async deleteProduct(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.pdm.delete<boolean>(`/products/${id}`);
  },
};
