import apiClient from '../client';
import type { ApiResponse } from '../client';

import type { PaginatedResponse } from '@/api/client';

// ============ Types ============

type DomainType = 'source' | 'consumer' | 'analytics' | 'platform' | 'reference';
type DomainStatus = 'active' | 'inactive' | 'archived';
type FederationStatus = 'connected' | 'disconnected' | 'degraded';
type SharingStatus = 'draft' | 'active' | 'expired' | 'terminated';
type AccessType = 'read' | 'write' | 'admin';
export type LineageDirection = 'upstream' | 'downstream' | 'both';

export interface DataDomain {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  domain_type: DomainType;
  status: DomainStatus;
  owner_id: string;
  stewards: string[];
  boundaries: string[];
  data_products_count: number;
  consumers_count: number;
  created_at: string;
  updated_at: string;
}

interface FederationNode {
  id: string;
  tenant_id: string;
  name: string;
  status: FederationStatus;
  endpoint: string;
  protocol: 'grpc' | 'rest' | 'graphql';
  domain_ids: string[];
  capabilities: string[];
  last_heartbeat?: string;
  version?: string;
  created_at: string;
  updated_at: string;
}

interface FederatedDataProduct {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  domain_id: string;
  owner_id: string;
  product_type: 'dataset' | 'api' | 'report' | 'model';
  format: 'table' | 'stream' | 'file' | 'api';
  status: 'active' | 'deprecated' | 'archived';
  schema?: Record<string, unknown>;
  quality_score: number;
  sharing_status: SharingStatus;
  consumers_count: number;
  created_at: string;
  updated_at: string;
}

interface SharingAgreement {
  id: string;
  tenant_id: string;
  provider_domain_id: string;
  consumer_domain_id: string;
  data_product_id: string;
  access_type: AccessType;
  status: SharingStatus;
  terms: string;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
  effective_from: string;
  effective_to?: string;
  review_required: boolean;
  conditions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CrossDomainAccess {
  id: string;
  agreement_id: string;
  requester_domain_id: string;
  target_domain_id: string;
  data_product_id: string;
  access_type: AccessType;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  requested_at: string;
  approved_at?: string;
  expires_at?: string;
  granted_by?: string;
  purpose?: string;
}

interface FederationLineageNode {
  id: string;
  data_product_id: string;
  domain_id: string;
  name: string;
  type: 'product' | 'transform' | 'consume';
  layer: 'source' | 'domain' | 'serving';
}

interface FederationLineageEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  cross_domain: boolean;
  transformation?: string;
  confidence: number;
}

interface FederationLineageGraph {
  data_product_id: string;
  nodes: FederationLineageNode[];
  edges: FederationLineageEdge[];
  cross_domain_paths: number;
}

interface FederationDashboard {
  total_domains: number;
  active_domains: number;
  total_data_products: number;
  total_agreements: number;
  active_agreements: number;
  cross_domain_products: number;
  federation_health: number;
  node_status: Record<FederationStatus, number>;
  domain_type_distribution: Record<DomainType, number>;
  top_sharing_products: Array<{ product_id: string; consumers: number }>;
  recent_sharing_activity: Array<{
    agreement_id: string;
    type: 'created' | 'approved' | 'terminated';
    timestamp: string;
  }>;
  cross_domain_violations: number;
  governance_score: number;
}
export type { PaginatedResponse };

export interface CreateDomainRequest {
  name: string;
  description: string;
  domain_type: DomainType;
  owner_id: string;
  stewards?: string[];
  boundaries?: string[];
}

interface UpdateDomainRequest {
  name?: string;
  description?: string;
  owner_id?: string;
  stewards?: string[];
  boundaries?: string[];
  status?: DomainStatus;
}

interface RegisterProductRequest {
  name: string;
  description: string;
  domain_id: string;
  product_type: 'dataset' | 'api' | 'report' | 'model';
  format: 'table' | 'stream' | 'file' | 'api';
  schema?: Record<string, unknown>;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
}

interface CreateAgreementRequest {
  provider_domain_id: string;
  consumer_domain_id: string;
  data_product_id: string;
  access_type: AccessType;
  terms: string;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
  effective_from: string;
  effective_to?: string;
  review_required?: boolean;
  conditions?: Record<string, unknown>;
}

interface RequestAccessRequest {
  purpose: string;
  access_type: AccessType;
  requested_duration_days?: number;
}

interface RegisterNodeRequest {
  name: string;
  endpoint: string;
  protocol: 'grpc' | 'rest' | 'graphql';
  domain_ids?: string[];
  capabilities?: string[];
}

interface UpdateNodeRequest {
  name?: string;
  domain_ids?: string[];
  capabilities?: string[];
  status?: FederationStatus;
}

// ============ API ============

export const dataFederationMeshApiV75 = {
  // ===== 数据域管理 =====
  async createDomain(data: CreateDomainRequest): Promise<ApiResponse<DataDomain>> {
    return apiClient.master.post<DataDomain>('/mdm-v75/domains', data);
  },

  async getDomain(id: string): Promise<ApiResponse<DataDomain>> {
    return apiClient.master.get<DataDomain>(`/mdm-v75/domains/${id}`);
  },

  async listDomains(params?: {
    domainType?: DomainType;
    status?: DomainStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataDomain>>> {
    const qs = new URLSearchParams();
    if (params?.domainType) qs.set('domain_type', params.domainType);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataDomain>>(
      `/mdm-v75/domains${s ? `?${s}` : ''}`
    );
  },

  async updateDomain(id: string, data: UpdateDomainRequest): Promise<ApiResponse<DataDomain>> {
    return apiClient.master.put<DataDomain>(`/mdm-v75/domains/${id}`, data);
  },

  async removeDomain(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v75/domains/${id}`);
  },

  async listDomainProducts(domainId: string): Promise<ApiResponse<FederatedDataProduct[]>> {
    return apiClient.master.get<FederatedDataProduct[]>(`/mdm-v75/domains/${domainId}/products`);
  },

  async listDomainConsumers(
    domainId: string
  ): Promise<ApiResponse<Array<{ domain_id: string; access_count: number }>>> {
    return apiClient.master.get(`/mdm-v75/domains/${domainId}/consumers`);
  },

  // ===== 联邦数据产品 =====
  async registerProduct(data: RegisterProductRequest): Promise<ApiResponse<FederatedDataProduct>> {
    return apiClient.master.post<FederatedDataProduct>('/mdm-v75/products', data);
  },

  async getProduct(id: string): Promise<ApiResponse<FederatedDataProduct>> {
    return apiClient.master.get<FederatedDataProduct>(`/mdm-v75/products/${id}`);
  },

  async listProducts(params?: {
    domainId?: string;
    productType?: FederatedDataProduct['product_type'];
    status?: FederatedDataProduct['status'];
    format?: FederatedDataProduct['format'];
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<FederatedDataProduct>>> {
    const qs = new URLSearchParams();
    if (params?.domainId) qs.set('domain_id', params.domainId);
    if (params?.productType) qs.set('product_type', params.productType);
    if (params?.status) qs.set('status', params.status);
    if (params?.format) qs.set('format', params.format);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<FederatedDataProduct>>(
      `/mdm-v75/products${s ? `?${s}` : ''}`
    );
  },

  async updateProduct(
    id: string,
    data: {
      description?: string;
      status?: FederatedDataProduct['status'];
      schema?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<FederatedDataProduct>> {
    return apiClient.master.put<FederatedDataProduct>(`/mdm-v75/products/${id}`, data);
  },

  async removeProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v75/products/${id}`);
  },

  async getProductConsumers(productId: string): Promise<
    ApiResponse<
      Array<{
        domain_id: string;
        domain_name: string;
        access_type: AccessType;
        last_accessed?: string;
      }>
    >
  > {
    return apiClient.master.get(`/mdm-v75/products/${productId}/consumers`);
  },

  async getProductQuality(productId: string): Promise<
    ApiResponse<{
      product_id: string;
      quality_score: number;
      freshness_score: number;
      completeness_score: number;
      accuracy_score: number;
      compliance_score: number;
      last_assessed_at: string;
    }>
  > {
    return apiClient.master.get(`/mdm-v75/products/${productId}/quality`);
  },

  // ===== 数据共享协议 =====
  async createAgreement(data: CreateAgreementRequest): Promise<ApiResponse<SharingAgreement>> {
    return apiClient.master.post<SharingAgreement>('/mdm-v75/agreements', data);
  },

  async getAgreement(id: string): Promise<ApiResponse<SharingAgreement>> {
    return apiClient.master.get<SharingAgreement>(`/mdm-v75/agreements/${id}`);
  },

  async listAgreements(params?: {
    providerDomainId?: string;
    consumerDomainId?: string;
    dataProductId?: string;
    status?: SharingStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<SharingAgreement>>> {
    const qs = new URLSearchParams();
    if (params?.providerDomainId) qs.set('provider_domain_id', params.providerDomainId);
    if (params?.consumerDomainId) qs.set('consumer_domain_id', params.consumerDomainId);
    if (params?.dataProductId) qs.set('data_product_id', params.dataProductId);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<SharingAgreement>>(
      `/mdm-v75/agreements${s ? `?${s}` : ''}`
    );
  },

  async approveAgreement(id: string): Promise<ApiResponse<SharingAgreement>> {
    return apiClient.master.post<SharingAgreement>(`/mdm-v75/agreements/${id}/approve`, {});
  },

  async rejectAgreement(id: string, reason: string): Promise<ApiResponse<SharingAgreement>> {
    return apiClient.master.post<SharingAgreement>(`/mdm-v75/agreements/${id}/reject`, { reason });
  },

  async terminateAgreement(id: string, reason: string): Promise<ApiResponse<SharingAgreement>> {
    return apiClient.master.post<SharingAgreement>(`/mdm-v75/agreements/${id}/terminate`, {
      reason,
    });
  },

  // ===== 跨域数据访问 =====
  async requestAccess(
    agreementId: string,
    data: RequestAccessRequest
  ): Promise<ApiResponse<CrossDomainAccess>> {
    return apiClient.master.post<CrossDomainAccess>(
      `/mdm-v75/agreements/${agreementId}/access-requests`,
      data
    );
  },

  async listAccessRequests(params?: {
    requesterDomainId?: string;
    targetDomainId?: string;
    status?: CrossDomainAccess['status'];
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<CrossDomainAccess>>> {
    const qs = new URLSearchParams();
    if (params?.requesterDomainId) qs.set('requester_domain_id', params.requesterDomainId);
    if (params?.targetDomainId) qs.set('target_domain_id', params.targetDomainId);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<CrossDomainAccess>>(
      `/mdm-v75/access-requests${s ? `?${s}` : ''}`
    );
  },

  async approveAccessRequest(
    id: string,
    grantBy?: string,
    expiresAt?: string
  ): Promise<ApiResponse<CrossDomainAccess>> {
    return apiClient.master.post<CrossDomainAccess>(`/mdm-v75/access-requests/${id}/approve`, {
      grant_by: grantBy,
      expires_at: expiresAt,
    });
  },

  async rejectAccessRequest(id: string, reason: string): Promise<ApiResponse<CrossDomainAccess>> {
    return apiClient.master.post<CrossDomainAccess>(`/mdm-v75/access-requests/${id}/reject`, {
      reason,
    });
  },

  async revokeAccessRequest(id: string, reason: string): Promise<ApiResponse<CrossDomainAccess>> {
    return apiClient.master.post<CrossDomainAccess>(`/mdm-v75/access-requests/${id}/revoke`, {
      reason,
    });
  },

  async listAccessAudit(params?: {
    domainId?: string;
    dataProductId?: string;
    action?: 'read' | 'write' | 'denied';
    page?: number;
    pageSize?: number;
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: string;
        timestamp: string;
        domain_id: string;
        data_product_id: string;
        action: 'read' | 'write' | 'denied';
        requester: string;
        status: 'allowed' | 'denied';
        reason?: string;
      }>
    >
  > {
    const qs = new URLSearchParams();
    if (params?.domainId) qs.set('domain_id', params.domainId);
    if (params?.dataProductId) qs.set('data_product_id', params.dataProductId);
    if (params?.action) qs.set('action', params.action);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<
      PaginatedResponse<{
        id: string;
        timestamp: string;
        domain_id: string;
        data_product_id: string;
        action: 'read' | 'write' | 'denied';
        requester: string;
        status: 'allowed' | 'denied';
        reason?: string;
      }>
    >(`/mdm-v75/access-audit${s ? `?${s}` : ''}`);
  },

  // ===== 联邦配置 =====
  async registerNode(data: RegisterNodeRequest): Promise<ApiResponse<FederationNode>> {
    return apiClient.master.post<FederationNode>('/mdm-v75/nodes', data);
  },

  async getNode(id: string): Promise<ApiResponse<FederationNode>> {
    return apiClient.master.get<FederationNode>(`/mdm-v75/nodes/${id}`);
  },

  async listNodes(params?: {
    status?: FederationStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<FederationNode>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<FederationNode>>(
      `/mdm-v75/nodes${s ? `?${s}` : ''}`
    );
  },

  async updateNode(id: string, data: UpdateNodeRequest): Promise<ApiResponse<FederationNode>> {
    return apiClient.master.put<FederationNode>(`/mdm-v75/nodes/${id}`, data);
  },

  async removeNode(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v75/nodes/${id}`);
  },

  async healthCheckNode(
    id: string
  ): Promise<ApiResponse<{ node_id: string; status: FederationStatus; latency_ms?: number }>> {
    return apiClient.master.post(`/mdm-v75/nodes/${id}/health`, {});
  },

  // ===== 跨域血缘追踪 =====
  async getCrossDomainLineage(
    productId: string,
    params?: { direction?: LineageDirection; depth?: number }
  ): Promise<ApiResponse<FederationLineageGraph>> {
    const qs = new URLSearchParams();
    if (params?.direction) qs.set('direction', params.direction);
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    const s = qs.toString();
    return apiClient.master.get<FederationLineageGraph>(
      `/mdm-v75/products/${productId}/lineage${s ? `?${s}` : ''}`
    );
  },

  async getCrossDomainImpact(productId: string): Promise<
    ApiResponse<{
      product_id: string;
      downstream_domains: number;
      downstream_products: number;
      criticality_score: number;
      dependent_agreements: number;
    }>
  > {
    return apiClient.master.get(`/mdm-v75/products/${productId}/impact`);
  },

  // ===== 联邦治理仪表板 =====
  async getDashboard(): Promise<ApiResponse<FederationDashboard>> {
    return apiClient.master.get<FederationDashboard>('/mdm-v75/dashboard');
  },

  async getDomainStats(domainId: string): Promise<
    ApiResponse<{
      domain_id: string;
      products_count: number;
      consumers_count: number;
      agreements_count: number;
      active_agreements: number;
      cross_domain_accesses: number;
      avg_product_quality: number;
    }>
  > {
    return apiClient.master.get(`/mdm-v75/domains/${domainId}/stats`);
  },

  async getFederationHealth(): Promise<
    ApiResponse<{
      overall_health: number;
      node_health: Record<string, FederationStatus>;
      domain_health: Record<string, number>;
      data_flow_health: number;
      governance_health: number;
      incidents_last_24h: number;
    }>
  > {
    return apiClient.master.get('/mdm-v75/health');
  },
};

export default dataFederationMeshApiV75;
