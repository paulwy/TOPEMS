import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type MarketplaceAssetStatus = 'draft' | 'published' | 'deprecated' | 'archived';
export type AssetCategory = 'dataset' | 'api' | 'report' | 'model' | 'dashboard' | 'template';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';
export type PricingModel = 'free' | 'per_call' | 'subscription' | 'tiered';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ProviderStatus = 'verified' | 'pending' | 'suspended';

export interface MarketplaceAsset {
  id: string;
  tenant_id: string;
  name: string;
  category: AssetCategory;
  description: string;
  version: string;
  status: MarketplaceAssetStatus;
  owner_id: string;
  provider_id?: string;
  pricing: PricingModel;
  price_per_call?: number;
  subscription_price?: number;
  category_tags: string[];
  rating: number;
  review_count: number;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface AssetVersion {
  id: string;
  asset_id: string;
  version: string;
  changelog: string;
  is_current: boolean;
  published_at: string;
  download_count: number;
}

export interface AssetSubscription {
  id: string;
  asset_id: string;
  subscriber_id: string;
  status: SubscriptionStatus;
  plan: string;
  started_at: string;
  expires_at?: string;
  usage_used: number;
  usage_limit?: number;
  price_paid?: number;
  auto_renew: boolean;
}

export interface AssetReview {
  id: string;
  asset_id: string;
  reviewer_id: string;
  rating: ReviewRating;
  title?: string;
  comment?: string;
  is_verified: boolean;
  created_at: string;
}

export interface AssetPricing {
  id: string;
  asset_id: string;
  model: PricingModel;
  tiers: Array<{
    name: string;
    limit: number;
    price: number;
  }>;
  currency: string;
  effective_from: string;
  effective_to?: string;
}

export interface MarketplaceProvider {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: ProviderStatus;
  verified_at?: string;
  asset_count: number;
  total_subscribers: number;
  avg_rating: number;
  contact_email?: string;
  created_at: string;
}

export interface MarketplaceDashboard {
  total_assets: number;
  published_assets: number;
  total_providers: number;
  verified_providers: number;
  total_subscriptions: number;
  active_subscriptions: number;
  total_reviews: number;
  avg_rating: number;
  assets_last_7d: number;
  subscriptions_last_7d: number;
  revenue_last_30d: number;
  top_categories: Array<{ category: AssetCategory; count: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PublishAssetRequest {
  name: string;
  category: AssetCategory;
  description: string;
  version?: string;
  pricing: PricingModel;
  price_per_call?: number;
  subscription_price?: number;
  category_tags?: string[];
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  version?: string;
  category_tags?: string[];
  status?: MarketplaceAssetStatus;
}

export interface SubscribeRequest {
  asset_id: string;
  plan?: string;
  auto_renew?: boolean;
}

export interface WriteReviewRequest {
  asset_id: string;
  rating: ReviewRating;
  title?: string;
  comment?: string;
}

export interface CreateProviderRequest {
  name: string;
  description?: string;
  contact_email?: string;
}

// ============ API ============

export const marketplaceApiV69 = {
  // ===== 数据资产目录 CRUD =====
  async publishAsset(data: PublishAssetRequest): Promise<ApiResponse<MarketplaceAsset>> {
    return apiClient.master.post<MarketplaceAsset>('/mdm-v69/assets', data);
  },

  async getAsset(id: string): Promise<ApiResponse<MarketplaceAsset>> {
    return apiClient.master.get<MarketplaceAsset>(`/mdm-v69/assets/${id}`);
  },

  async listAssets(params?: {
    category?: AssetCategory;
    status?: MarketplaceAssetStatus;
    search?: string;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceAsset>>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.tags && params.tags.length) qs.set('tags', params.tags.join(','));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceAsset>>(
      `/mdm-v69/assets${s ? `?${s}` : ''}`
    );
  },

  async updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<MarketplaceAsset>> {
    return apiClient.master.put<MarketplaceAsset>(`/mdm-v69/assets/${id}`, data);
  },

  async removeAsset(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v69/assets/${id}`);
  },

  async searchAssets(
    query: string,
    filters?: {
      category?: AssetCategory;
      minRating?: number;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<MarketplaceAsset>>> {
    const qs = new URLSearchParams();
    qs.set('q', query);
    if (filters?.category) qs.set('category', filters.category);
    if (filters?.minRating !== undefined) qs.set('min_rating', String(filters.minRating));
    if (filters?.page !== undefined) qs.set('page', String(filters.page));
    if (filters?.pageSize !== undefined) qs.set('page_size', String(filters.pageSize));
    return apiClient.master.get<PaginatedResponse<MarketplaceAsset>>(
      `/mdm-v69/assets/search?${qs.toString()}`
    );
  },

  // ===== 资产版本管理 =====
  async listAssetVersions(assetId: string): Promise<ApiResponse<AssetVersion[]>> {
    return apiClient.master.get<AssetVersion[]>(`/mdm-v69/assets/${assetId}/versions`);
  },

  async publishNewVersion(
    assetId: string,
    data: { version: string; changelog: string }
  ): Promise<ApiResponse<AssetVersion>> {
    return apiClient.master.post<AssetVersion>(`/mdm-v69/assets/${assetId}/versions`, data);
  },

  async getAssetVersion(assetId: string, version: string): Promise<ApiResponse<AssetVersion>> {
    return apiClient.master.get<AssetVersion>(`/mdm-v69/assets/${assetId}/versions/${version}`);
  },

  // ===== 订阅管理 =====
  async subscribe(data: SubscribeRequest): Promise<ApiResponse<AssetSubscription>> {
    return apiClient.master.post<AssetSubscription>('/mdm-v69/subscriptions', data);
  },

  async listSubscriptions(params?: {
    status?: SubscriptionStatus;
    subscriberId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<AssetSubscription>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.subscriberId) qs.set('subscriber_id', params.subscriberId);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AssetSubscription>>(
      `/mdm-v69/subscriptions${s ? `?${s}` : ''}`
    );
  },

  async getSubscription(id: string): Promise<ApiResponse<AssetSubscription>> {
    return apiClient.master.get<AssetSubscription>(`/mdm-v69/subscriptions/${id}`);
  },

  async cancelSubscription(id: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    return apiClient.master.post<{ cancelled: boolean }>(`/mdm-v69/subscriptions/${id}/cancel`, {});
  },

  async renewSubscription(id: string): Promise<ApiResponse<AssetSubscription>> {
    return apiClient.master.post<AssetSubscription>(`/mdm-v69/subscriptions/${id}/renew`, {});
  },

  async upgradeSubscription(
    id: string,
    data: { new_plan: string }
  ): Promise<ApiResponse<AssetSubscription>> {
    return apiClient.master.post<AssetSubscription>(`/mdm-v69/subscriptions/${id}/upgrade`, data);
  },

  // ===== 评价管理 =====
  async writeReview(data: WriteReviewRequest): Promise<ApiResponse<AssetReview>> {
    return apiClient.master.post<AssetReview>('/mdm-v69/reviews', data);
  },

  async listAssetReviews(
    assetId: string,
    params?: {
      minRating?: ReviewRating;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<AssetReview>>> {
    const qs = new URLSearchParams();
    if (params?.minRating !== undefined) qs.set('min_rating', String(params.minRating));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AssetReview>>(
      `/mdm-v69/assets/${assetId}/reviews${s ? `?${s}` : ''}`
    );
  },

  async deleteReview(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v69/reviews/${id}`);
  },

  // ===== 定价管理 =====
  async getAssetPricing(assetId: string): Promise<ApiResponse<AssetPricing[]>> {
    return apiClient.master.get<AssetPricing[]>(`/mdm-v69/assets/${assetId}/pricing`);
  },

  async updateAssetPricing(
    assetId: string,
    data: {
      model: PricingModel;
      tiers?: Array<{ name: string; limit: number; price: number }>;
      price_per_call?: number;
      subscription_price?: number;
    }
  ): Promise<ApiResponse<AssetPricing>> {
    return apiClient.master.put<AssetPricing>(`/mdm-v69/assets/${assetId}/pricing`, data);
  },

  // ===== 服务商管理 =====
  async createProvider(data: CreateProviderRequest): Promise<ApiResponse<MarketplaceProvider>> {
    return apiClient.master.post<MarketplaceProvider>('/mdm-v69/providers', data);
  },

  async getProvider(id: string): Promise<ApiResponse<MarketplaceProvider>> {
    return apiClient.master.get<MarketplaceProvider>(`/mdm-v69/providers/${id}`);
  },

  async listProviders(params?: {
    status?: ProviderStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceProvider>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceProvider>>(
      `/mdm-v69/providers${s ? `?${s}` : ''}`
    );
  },

  async verifyProvider(id: string): Promise<ApiResponse<MarketplaceProvider>> {
    return apiClient.master.post<MarketplaceProvider>(`/mdm-v69/providers/${id}/verify`, {});
  },

  async suspendProvider(id: string): Promise<ApiResponse<MarketplaceProvider>> {
    return apiClient.master.post<MarketplaceProvider>(`/mdm-v69/providers/${id}/suspend`, {});
  },

  async getProviderAssets(providerId: string): Promise<ApiResponse<MarketplaceAsset[]>> {
    return apiClient.master.get<MarketplaceAsset[]>(`/mdm-v69/providers/${providerId}/assets`);
  },

  // ===== 使用量统计与仪表盘 =====
  async getAssetUsageStats(
    assetId: string,
    params?: {
      period?: 'day' | 'week' | 'month';
      start_date?: string;
      end_date?: string;
    }
  ): Promise<
    ApiResponse<{
      asset_id: string;
      total_calls: number;
      unique_subscribers: number;
      errors: number;
      avg_latency_ms: number;
      period_start: string;
      period_end: string;
    }>
  > {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.master.get(`/mdm-v69/assets/${assetId}/stats${s ? `?${s}` : ''}`);
  },

  async getDashboard(): Promise<ApiResponse<MarketplaceDashboard>> {
    return apiClient.master.get<MarketplaceDashboard>('/mdm-v69/dashboard');
  },

  // ===== 收藏与推荐 =====
  async addFavorite(assetId: string): Promise<ApiResponse<{ saved: boolean }>> {
    return apiClient.master.post<{ saved: boolean }>('/mdm-v69/favorites', { asset_id: assetId });
  },

  async removeFavorite(assetId: string): Promise<ApiResponse<{ removed: boolean }>> {
    return apiClient.master.delete<{ removed: boolean }>(`/mdm-v69/favorites/${assetId}`);
  },

  async listFavorites(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceAsset>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceAsset>>(
      `/mdm-v69/favorites${s ? `?${s}` : ''}`
    );
  },

  async getFeaturedAssets(params?: {
    category?: AssetCategory;
    limit?: number;
  }): Promise<ApiResponse<MarketplaceAsset[]>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<MarketplaceAsset[]>(`/mdm-v69/assets/featured${s ? `?${s}` : ''}`);
  },

  async getRecommendations(
    assetId: string,
    limit?: number
  ): Promise<ApiResponse<MarketplaceAsset[]>> {
    const qs = new URLSearchParams();
    if (limit !== undefined) qs.set('limit', String(limit));
    const s = qs.toString();
    return apiClient.master.get<MarketplaceAsset[]>(
      `/mdm-v69/assets/${assetId}/recommend${s ? `?${s}` : ''}`
    );
  },

  async listCategories(): Promise<ApiResponse<Array<{ category: AssetCategory; count: number }>>> {
    return apiClient.master.get<Array<{ category: AssetCategory; count: number }>>(
      '/mdm-v69/categories'
    );
  },

  async listRecentlyUpdated(params?: {
    days?: number;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceAsset>>> {
    const qs = new URLSearchParams();
    if (params?.days !== undefined) qs.set('days', String(params.days));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceAsset>>(
      `/mdm-v69/assets/recent${s ? `?${s}` : ''}`
    );
  },
};

export default marketplaceApiV69;
