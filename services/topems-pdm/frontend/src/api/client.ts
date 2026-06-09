import axios from 'axios';
import type { Product, ProductDocument, Material, ProductVersion, ProductConfig, ApiResponse } from '../types';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const productApi = {
  list: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products');
    return response.data.data || [];
  },
  get: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>('/products', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/${id}`);
    return response.data.success;
  },
};

export const documentApi = {
  list: async (): Promise<ProductDocument[]> => {
    const response = await apiClient.get<ApiResponse<ProductDocument[]>>('/product-documents');
    return response.data.data || [];
  },
  get: async (id: string): Promise<ProductDocument> => {
    const response = await apiClient.get<ApiResponse<ProductDocument>>(`/product-documents/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<ProductDocument>): Promise<ProductDocument> => {
    const response = await apiClient.post<ApiResponse<ProductDocument>>('/product-documents', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<ProductDocument>): Promise<ProductDocument> => {
    const response = await apiClient.put<ApiResponse<ProductDocument>>(`/product-documents/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/product-documents/${id}`);
    return response.data.success;
  },
};

export const materialApi = {
  list: async (): Promise<Material[]> => {
    const response = await apiClient.get<ApiResponse<Material[]>>('/materials');
    return response.data.data || [];
  },
  get: async (id: string): Promise<Material> => {
    const response = await apiClient.get<ApiResponse<Material>>(`/materials/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<Material>): Promise<Material> => {
    const response = await apiClient.post<ApiResponse<Material>>('/materials', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<Material>): Promise<Material> => {
    const response = await apiClient.put<ApiResponse<Material>>(`/materials/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/materials/${id}`);
    return response.data.success;
  },
};

export const versionApi = {
  list: async (): Promise<ProductVersion[]> => {
    const response = await apiClient.get<ApiResponse<ProductVersion[]>>('/product-versions');
    return response.data.data || [];
  },
  get: async (id: string): Promise<ProductVersion> => {
    const response = await apiClient.get<ApiResponse<ProductVersion>>(`/product-versions/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<ProductVersion>): Promise<ProductVersion> => {
    const response = await apiClient.post<ApiResponse<ProductVersion>>('/product-versions', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<ProductVersion>): Promise<ProductVersion> => {
    const response = await apiClient.put<ApiResponse<ProductVersion>>(`/product-versions/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/product-versions/${id}`);
    return response.data.success;
  },
};

export const configApi = {
  list: async (): Promise<ProductConfig[]> => {
    const response = await apiClient.get<ApiResponse<ProductConfig[]>>('/product-configs');
    return response.data.data || [];
  },
  get: async (id: string): Promise<ProductConfig> => {
    const response = await apiClient.get<ApiResponse<ProductConfig>>(`/product-configs/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<ProductConfig>): Promise<ProductConfig> => {
    const response = await apiClient.post<ApiResponse<ProductConfig>>('/product-configs', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<ProductConfig>): Promise<ProductConfig> => {
    const response = await apiClient.put<ApiResponse<ProductConfig>>(`/product-configs/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/product-configs/${id}`);
    return response.data.success;
  },
};
