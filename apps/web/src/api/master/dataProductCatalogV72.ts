import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

type ProductStatus = 'draft' | 'review' | 'published' | 'deprecated' | 'archived';
type ProductType = 'dataset' | 'api' | 'report' | 'model' | 'dashboard' | 'template';
type ProductCategory =
  'customer' | 'finance' | 'inventory' | 'sales' | 'hr' | 'operations' | 'analytics' | 'master';
type ConsumerRole = 'viewer' | 'editor' | 'admin';
type BundleStatus = 'active' | 'inactive' | 'archived';

interface DataProduct {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  product_type: ProductType;
  category: ProductCategory;
  status: ProductStatus;
  owner_id: string;
  steward_id?: string;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
  attributes: Record<string, unknown>;
  version: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

interface ProductVersion {
  id: string;
  product_id: string;
  version: string;
  changelog: string;
  is_current: boolean;
  attributes: Record<string, unknown>;
  published_at: string;
}

interface ProductConsumer {
  id: string;
  product_id: string;
  user_id: string;
  role: ConsumerRole;
  access_granted_at: string;
  last_accessed_at?: string;
  access_count: number;
  status: 'active' | 'suspended' | 'expired';
}

interface ProductBundle {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  status: BundleStatus;
  product_ids: string[];
  owner_id: string;
  pricing_model: 'free' | 'one_time' | 'subscription';
  price?: number;
  created_at: string;
  updated_at: string;
}

interface ProductAnalytics {
  product_id: string;
  views_count: number;
  downloads_count: number;
  active_consumers: number;
  total_consumers: number;
  avg_rating: number;
  review_count: number;
  adoption_rate: number;
  views_last_7d: number;
  downloads_last_7d: number;
  popular_attributes: Array<{ attribute: string; count: number }>;
}

interface ProductTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  usage_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CreateProductRequest {
  name: string;
  description: string;
  product_type: ProductType;
  category: ProductCategory;
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  tags?: string[];
  attributes?: Record<string, unknown>;
}

interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: ProductCategory;
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  tags?: string[];
  attributes?: Record<string, unknown>;
  status?: ProductStatus;
  owner_id?: string;
  steward_id?: string;
}

interface PublishProductRequest {
  version: string;
  changelog?: string;
}

interface GrantAccessRequest {
  user_id: string;
  role: ConsumerRole;
}

interface CreateBundleRequest {
  name: string;
  description: string;
  product_ids: string[];
  pricing_model?: 'free' | 'one_time' | 'subscription';
  price?: number;
}

interface UpdateBundleRequest {
  name?: string;
  description?: string;
  product_ids?: string[];
  pricing_model?: 'free' | 'one_time' | 'subscription';
  price?: number;
  status?: BundleStatus;
}

// ============ API ============

export const dataProductCatalogApiV72 = {
  // ===== 数据产品管理 =====
  async createProduct(data: CreateProductRequest): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>('/mdm-v72/products', data);
  },

  async getProduct(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.get<DataProduct>(`/mdm-v72/products/${id}`);
  },

  async listProducts(params?: {
    productType?: ProductType;
    category?: ProductCategory;
    status?: ProductStatus;
    search?: string;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataProduct>>> {
    const qs = new URLSearchParams();
    if (params?.productType) qs.set('product_type', params.productType);
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.tags && params.tags.length) qs.set('tags', params.tags.join(','));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataProduct>>(
      `/mdm-v72/products${s ? `?${s}` : ''}`
    );
  },

  async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.put<DataProduct>(`/mdm-v72/products/${id}`, data);
  },

  async removeProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v72/products/${id}`);
  },

  // ===== 产品版本管理 =====
  async publishProduct(id: string, data: PublishProductRequest): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/publish`, data);
  },

  async listProductVersions(productId: string): Promise<ApiResponse<ProductVersion[]>> {
    return apiClient.master.get<ProductVersion[]>(`/mdm-v72/products/${productId}/versions`);
  },

  async createProductVersion(
    productId: string,
    data: { version: string; changelog: string; attributes?: Record<string, unknown> }
  ): Promise<ApiResponse<ProductVersion>> {
    return apiClient.master.post<ProductVersion>(`/mdm-v72/products/${productId}/versions`, data);
  },

  async setCurrentVersion(productId: string, versionId: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(
      `/mdm-v72/products/${productId}/versions/${versionId}/set-current`,
      {}
    );
  },

  // ===== 产品生命周期 =====
  async submitForReview(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/submit`, {});
  },

  async approveProduct(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/approve`, {});
  },

  async rejectProduct(id: string, reason: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/reject`, { reason });
  },

  async deprecateProduct(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/deprecate`, {});
  },

  async archiveProduct(id: string): Promise<ApiResponse<DataProduct>> {
    return apiClient.master.post<DataProduct>(`/mdm-v72/products/${id}/archive`, {});
  },

  // ===== 产品消费者管理 =====
  async listProductConsumers(
    productId: string,
    params?: {
      role?: ConsumerRole;
      status?: 'active' | 'suspended' | 'expired';
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ProductConsumer>>> {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ProductConsumer>>(
      `/mdm-v72/products/${productId}/consumers${s ? `?${s}` : ''}`
    );
  },

  async grantAccess(
    productId: string,
    data: GrantAccessRequest
  ): Promise<ApiResponse<ProductConsumer>> {
    return apiClient.master.post<ProductConsumer>(`/mdm-v72/products/${productId}/consumers`, data);
  },

  async revokeAccess(
    productId: string,
    consumerId: string
  ): Promise<ApiResponse<{ revoked: boolean }>> {
    return apiClient.master.delete<{ revoked: boolean }>(
      `/mdm-v72/products/${productId}/consumers/${consumerId}`
    );
  },

  async updateConsumerRole(
    productId: string,
    consumerId: string,
    role: ConsumerRole
  ): Promise<ApiResponse<ProductConsumer>> {
    return apiClient.master.patch<ProductConsumer>(
      `/mdm-v72/products/${productId}/consumers/${consumerId}`,
      { role }
    );
  },

  // ===== 产品分析 =====
  async getProductAnalytics(productId: string): Promise<ApiResponse<ProductAnalytics>> {
    return apiClient.master.get<ProductAnalytics>(`/mdm-v72/products/${productId}/analytics`);
  },

  async listPopularProducts(params?: {
    category?: ProductCategory;
    limit?: number;
  }): Promise<ApiResponse<DataProduct[]>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<DataProduct[]>(`/mdm-v72/products/popular${s ? `?${s}` : ''}`);
  },

  async getProductCatalogStats(): Promise<
    ApiResponse<{
      total_products: number;
      published_products: number;
      draft_products: number;
      deprecated_products: number;
      total_consumers: number;
      product_type_distribution: Record<ProductType, number>;
      category_distribution: Record<ProductCategory, number>;
    }>
  > {
    return apiClient.master.get('/mdm-v72/stats');
  },

  // ===== 产品组合/捆绑 =====
  async createBundle(data: CreateBundleRequest): Promise<ApiResponse<ProductBundle>> {
    return apiClient.master.post<ProductBundle>('/mdm-v72/bundles', data);
  },

  async getBundle(id: string): Promise<ApiResponse<ProductBundle>> {
    return apiClient.master.get<ProductBundle>(`/mdm-v72/bundles/${id}`);
  },

  async listBundles(params?: {
    status?: BundleStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ProductBundle>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ProductBundle>>(
      `/mdm-v72/bundles${s ? `?${s}` : ''}`
    );
  },

  async updateBundle(id: string, data: UpdateBundleRequest): Promise<ApiResponse<ProductBundle>> {
    return apiClient.master.put<ProductBundle>(`/mdm-v72/bundles/${id}`, data);
  },

  async removeBundle(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v72/bundles/${id}`);
  },

  // ===== 标签管理 =====
  async listTags(): Promise<ApiResponse<ProductTag[]>> {
    return apiClient.master.get<ProductTag[]>('/mdm-v72/tags');
  },

  async createTag(data: {
    name: string;
    color?: string;
    description?: string;
  }): Promise<ApiResponse<ProductTag>> {
    return apiClient.master.post<ProductTag>('/mdm-v72/tags', data);
  },

  async updateTag(
    id: string,
    data: { name?: string; color?: string; description?: string }
  ): Promise<ApiResponse<ProductTag>> {
    return apiClient.master.put<ProductTag>(`/mdm-v72/tags/${id}`, data);
  },

  async deleteTag(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v72/tags/${id}`);
  },
};

export default dataProductCatalogApiV72;
