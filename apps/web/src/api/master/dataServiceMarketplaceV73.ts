import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ListingStatus = 'draft' | 'published' | 'suspended' | 'deleted';
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
export type ServiceCategory =
  | 'data_integration'
  | 'data_transformation'
  | 'data_analytics'
  | 'machine_learning'
  | 'data_quality'
  | 'data_security'
  | 'data_visualization';
export type PricingModel = 'free' | 'pay_per_use' | 'subscription' | 'tiered';
export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface MarketplaceListing {
  id: string;
  tenant_id: string;
  service_id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  status: ListingStatus;
  pricing_model: PricingModel;
  price_per_use?: number;
  subscription_price?: number;
  billing_cycle?: BillingCycle;
  trial_days?: number;
  tags: string[];
  rating: number;
  review_count: number;
  orders_count: number;
  view_count: number;
  is_featured: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOrder {
  id: string;
  tenant_id: string;
  listing_id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  pricing_model: PricingModel;
  quantity?: number;
  billing_cycle?: BillingCycle;
  started_at?: string;
  expires_at?: string;
  paid_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplacePayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'alipay' | 'wechat_pay' | 'bank_transfer' | 'credit';
  status: PaymentStatus;
  transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

export interface MarketplaceReview {
  id: string;
  listing_id: string;
  service_id: string;
  reviewer_id: string;
  rating: ReviewRating;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  reported: boolean;
  reply?: string;
  reply_at?: string;
  created_at: string;
}

export interface MarketplaceInvoice {
  id: string;
  order_id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  type: 'purchase' | 'sale';
  status: 'pending' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  issued_at?: string;
  due_at?: string;
  paid_at?: string;
  tax_amount?: number;
  total_amount: number;
}

export interface MarketplaceDashboard {
  total_listings: number;
  active_listings: number;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  revenue_last_30d: number;
  category_distribution: Record<ServiceCategory, number>;
  top_listings: Array<{ listing_id: string; orders: number; revenue: number }>;
  recent_orders: MarketplaceOrder[];
  avg_rating: number;
  total_reviews: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateListingRequest {
  service_id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  pricing_model: PricingModel;
  price_per_use?: number;
  subscription_price?: number;
  billing_cycle?: BillingCycle;
  trial_days?: number;
  tags?: string[];
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  category?: ServiceCategory;
  pricing_model?: PricingModel;
  price_per_use?: number;
  subscription_price?: number;
  billing_cycle?: BillingCycle;
  trial_days?: number;
  tags?: string[];
  status?: ListingStatus;
  is_featured?: boolean;
}

export interface CreateOrderRequest {
  listing_id: string;
  quantity?: number;
  billing_cycle?: BillingCycle;
  payment_method?: MarketplacePayment['method'];
}

export interface PayOrderRequest {
  payment_method: MarketplacePayment['method'];
}

export interface WriteReviewRequest {
  rating: ReviewRating;
  title?: string;
  comment?: string;
}

export interface ReplyReviewRequest {
  reply: string;
}

// ============ API ============

export const dataServiceMarketplaceApiV73 = {
  // ===== 服务上架管理 =====
  async createListing(data: CreateListingRequest): Promise<ApiResponse<MarketplaceListing>> {
    return apiClient.master.post<MarketplaceListing>('/mdm-v73/listings', data);
  },

  async getListing(id: string): Promise<ApiResponse<MarketplaceListing>> {
    return apiClient.master.get<MarketplaceListing>(`/mdm-v73/listings/${id}`);
  },

  async listListings(params?: {
    category?: ServiceCategory;
    status?: ListingStatus;
    search?: string;
    pricingModel?: PricingModel;
    featured?: boolean;
    sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceListing>>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.pricingModel) qs.set('pricing_model', params.pricingModel);
    if (params?.featured !== undefined) qs.set('featured', String(params.featured));
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceListing>>(
      `/mdm-v73/listings${s ? `?${s}` : ''}`
    );
  },

  async updateListing(
    id: string,
    data: UpdateListingRequest
  ): Promise<ApiResponse<MarketplaceListing>> {
    return apiClient.master.put<MarketplaceListing>(`/mdm-v73/listings/${id}`, data);
  },

  async removeListing(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v73/listings/${id}`);
  },

  async publishListing(id: string): Promise<ApiResponse<MarketplaceListing>> {
    return apiClient.master.post<MarketplaceListing>(`/mdm-v73/listings/${id}/publish`, {});
  },

  async suspendListing(id: string): Promise<ApiResponse<MarketplaceListing>> {
    return apiClient.master.post<MarketplaceListing>(`/mdm-v73/listings/${id}/suspend`, {});
  },

  // ===== 市场交易/订单 =====
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<MarketplaceOrder>> {
    return apiClient.master.post<MarketplaceOrder>('/mdm-v73/orders', data);
  },

  async getOrder(id: string): Promise<ApiResponse<MarketplaceOrder>> {
    return apiClient.master.get<MarketplaceOrder>(`/mdm-v73/orders/${id}`);
  },

  async listOrders(params?: {
    status?: OrderStatus;
    listingId?: string;
    buyerId?: string;
    sellerId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceOrder>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.listingId) qs.set('listing_id', params.listingId);
    if (params?.buyerId) qs.set('buyer_id', params.buyerId);
    if (params?.sellerId) qs.set('seller_id', params.sellerId);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceOrder>>(
      `/mdm-v73/orders${s ? `?${s}` : ''}`
    );
  },

  async payOrder(id: string, data: PayOrderRequest): Promise<ApiResponse<MarketplacePayment>> {
    return apiClient.master.post<MarketplacePayment>(`/mdm-v73/orders/${id}/pay`, data);
  },

  async completeOrder(id: string): Promise<ApiResponse<MarketplaceOrder>> {
    return apiClient.master.post<MarketplaceOrder>(`/mdm-v73/orders/${id}/complete`, {});
  },

  async cancelOrder(id: string, reason?: string): Promise<ApiResponse<MarketplaceOrder>> {
    return apiClient.master.post<MarketplaceOrder>(`/mdm-v73/orders/${id}/cancel`, { reason });
  },

  async refundOrder(id: string, reason?: string): Promise<ApiResponse<MarketplaceOrder>> {
    return apiClient.master.post<MarketplaceOrder>(`/mdm-v73/orders/${id}/refund`, { reason });
  },

  // ===== 支付与结算 =====
  async getPayment(id: string): Promise<ApiResponse<MarketplacePayment>> {
    return apiClient.master.get<MarketplacePayment>(`/mdm-v73/payments/${id}`);
  },

  async listPayments(params?: {
    orderId?: string;
    status?: PaymentStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplacePayment>>> {
    const qs = new URLSearchParams();
    if (params?.orderId) qs.set('order_id', params.orderId);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplacePayment>>(
      `/mdm-v73/payments${s ? `?${s}` : ''}`
    );
  },

  async issueInvoice(orderId: string): Promise<ApiResponse<MarketplaceInvoice>> {
    return apiClient.master.post<MarketplaceInvoice>(`/mdm-v73/orders/${orderId}/invoice`, {});
  },

  async getInvoice(id: string): Promise<ApiResponse<MarketplaceInvoice>> {
    return apiClient.master.get<MarketplaceInvoice>(`/mdm-v73/invoices/${id}`);
  },

  async listInvoices(params?: {
    type?: 'purchase' | 'sale';
    status?: MarketplaceInvoice['status'];
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<MarketplaceInvoice>>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceInvoice>>(
      `/mdm-v73/invoices${s ? `?${s}` : ''}`
    );
  },

  // ===== 市场评价 =====
  async writeReview(
    listingId: string,
    data: WriteReviewRequest
  ): Promise<ApiResponse<MarketplaceReview>> {
    return apiClient.master.post<MarketplaceReview>(`/mdm-v73/listings/${listingId}/reviews`, data);
  },

  async listListingReviews(
    listingId: string,
    params?: {
      rating?: ReviewRating;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<MarketplaceReview>>> {
    const qs = new URLSearchParams();
    if (params?.rating) qs.set('rating', String(params.rating));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<MarketplaceReview>>(
      `/mdm-v73/listings/${listingId}/reviews${s ? `?${s}` : ''}`
    );
  },

  async replyReview(
    listingId: string,
    reviewId: string,
    data: ReplyReviewRequest
  ): Promise<ApiResponse<MarketplaceReview>> {
    return apiClient.master.post<MarketplaceReview>(
      `/mdm-v73/listings/${listingId}/reviews/${reviewId}/reply`,
      data
    );
  },

  async deleteReview(
    listingId: string,
    reviewId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(
      `/mdm-v73/listings/${listingId}/reviews/${reviewId}`
    );
  },

  // ===== 市场发现与推荐 =====
  async getFeaturedListings(params?: {
    category?: ServiceCategory;
    limit?: number;
  }): Promise<ApiResponse<MarketplaceListing[]>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<MarketplaceListing[]>(
      `/mdm-v73/listings/featured${s ? `?${s}` : ''}`
    );
  },

  async searchListings(
    query: string,
    filters?: {
      category?: ServiceCategory;
      minRating?: number;
      pricingModel?: PricingModel;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<MarketplaceListing>>> {
    const qs = new URLSearchParams();
    qs.set('q', query);
    if (filters?.category) qs.set('category', filters.category);
    if (filters?.minRating !== undefined) qs.set('min_rating', String(filters.minRating));
    if (filters?.pricingModel) qs.set('pricing_model', filters.pricingModel);
    if (filters?.page !== undefined) qs.set('page', String(filters.page));
    if (filters?.pageSize !== undefined) qs.set('page_size', String(filters.pageSize));
    return apiClient.master.get<PaginatedResponse<MarketplaceListing>>(
      `/mdm-v73/listings/search?${qs.toString()}`
    );
  },

  async getSimilarListings(
    listingId: string,
    limit?: number
  ): Promise<ApiResponse<MarketplaceListing[]>> {
    const qs = new URLSearchParams();
    if (limit !== undefined) qs.set('limit', String(limit));
    const s = qs.toString();
    return apiClient.master.get<MarketplaceListing[]>(
      `/mdm-v73/listings/${listingId}/similar${s ? `?${s}` : ''}`
    );
  },

  async listCategories(): Promise<
    ApiResponse<Array<{ category: ServiceCategory; count: number }>>
  > {
    return apiClient.master.get<Array<{ category: ServiceCategory; count: number }>>(
      '/mdm-v73/categories'
    );
  },

  // ===== 市场统计仪表板 =====
  async getDashboard(): Promise<ApiResponse<MarketplaceDashboard>> {
    return apiClient.master.get<MarketplaceDashboard>('/mdm-v73/dashboard');
  },

  async getSellerStats(sellerId: string): Promise<
    ApiResponse<{
      seller_id: string;
      total_listings: number;
      active_listings: number;
      total_orders: number;
      completed_orders: number;
      total_revenue: number;
      avg_rating: number;
    }>
  > {
    return apiClient.master.get(`/mdm-v73/sellers/${sellerId}/stats`);
  },

  async getBuyerStats(buyerId: string): Promise<
    ApiResponse<{
      buyer_id: string;
      total_orders: number;
      active_subscriptions: number;
      total_spent: number;
      recent_purchases: MarketplaceOrder[];
    }>
  > {
    return apiClient.master.get(`/mdm-v73/buyers/${buyerId}/stats`);
  },
};

export default dataServiceMarketplaceApiV73;
