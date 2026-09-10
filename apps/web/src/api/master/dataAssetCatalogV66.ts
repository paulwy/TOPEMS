/**
 * 数据资产目录 V66 (Data Asset Catalog) API 绑定
 *
 * 【2026-09-10 卡2试点对齐】原设计后端 /mdm-v66/* 未实现，
 * 实际复用已在役的 master-data V60 metadata 模块（/mdm-v60/metadata + /mdm-v60/lineage + /mdm-v60/lifecycle）。
 * 核心方法已改指 V60 路由；高级方法（bulk/import/export/maps/categories/columns）保留预埋，待 V66 后端实现后切换。
 *
 * 已改指路由（V60 metadata_v60.rs）:
 *   GET    /mdm-v60/metadata                (原 /mdm-v66/assets)
 *   POST   /mdm-v60/metadata                (原 /mdm-v66/assets)
 *   GET    /mdm-v60/metadata/{id}           (原 /mdm-v66/assets/{id})
 *   PUT    /mdm-v60/metadata/{id}           (原 /mdm-v66/assets/{id})
 *   DELETE /mdm-v60/metadata/{id}           (原 /mdm-v66/assets/{id})
 *   GET    /mdm-v60/metadata/search         (原 /mdm-v66/search)
 *   GET    /mdm-v60/metadata/stats          (原 /mdm-v66/dashboard)
 *   GET    /mdm-v60/lineage/{id}/upstream   (原 /mdm-v66/lineage/upstream)
 *   GET    /mdm-v60/lineage/{id}/downstream (原 /mdm-v66/lineage/downstream)
 *
 * 预埋路由（V66 后端未实现，页面零消费）:
 *   POST   /mdm-v66/assets/bulk
 *   POST   /mdm-v66/assets/bulk-delete
 *   POST   /mdm-v66/assets/import
 *   GET    /mdm-v66/assets/export
 *   GET    /mdm-v66/assets/{id}/columns
 *   PUT    /mdm-v66/assets/{id}/columns
 *   POST   /mdm-v66/assets/{id}/tags
 *   DELETE /mdm-v66/assets/{id}/tags
 *   GET    /mdm-v66/lineage (graph/column/refresh)
 *   GET    /mdm-v66/tags/*
 *   GET    /mdm-v66/categories/*
 *   GET    /mdm-v66/maps/*
 *   GET    /mdm-v66/dashboard/recent
 *   GET    /mdm-v66/dashboard/orphans
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type AssetType = 'table' | 'view' | 'function' | 'api' | 'file' | 'report' | 'dashboard';
export type AssetStatus = 'active' | 'deprecated' | 'archived' | 'development';
export type AssetSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
type LineageDirection = 'upstream' | 'downstream' | 'both';
type LineageDepth = 1 | 2 | 3;

export interface DataAsset {
  id: string;
  name: string;
  display_name?: string;
  type: AssetType;
  description?: string;
  owner?: string;
  owner_team?: string;
  database?: string;
  schema?: string;
  table_name?: string;
  url?: string;
  status: AssetStatus;
  sensitivity: AssetSensitivity;
  tags?: string[];
  category?: string;
  sub_category?: string;
  update_frequency?: string;
  last_updated?: string;
  data_source?: string;
  row_count?: number;
  column_count?: number;
  created_at: string;
  updated_at: string;
}

interface AssetColumn {
  name: string;
  type: string;
  description?: string;
  is_primary_key?: boolean;
  is_nullable?: boolean;
  sensitivity?: AssetSensitivity;
  pii_type?: string[];
  foreign_key?: string[];
  sample_values?: unknown[];
}

interface AssetLineageNode {
  id: string;
  asset_id?: string;
  name: string;
  type: AssetType;
  display_name?: string;
  x?: number;
  y?: number;
  layer?: number;
  is_root?: boolean;
  is_leaf?: boolean;
  metadata?: Record<string, unknown>;
}

interface AssetLineageEdge {
  id: string;
  source_id: string;
  target_id: string;
  column?: string;
  transform?: string;
  confidence?: number;
  created_at: string;
}

interface AssetLineageGraph {
  nodes: AssetLineageNode[];
  edges: AssetLineageEdge[];
  root_asset_id?: string;
  depth: number;
  direction: LineageDirection;
}

interface AssetTag {
  id: string;
  name: string;
  color?: string;
  category?: string;
  description?: string;
  asset_count?: number;
  created_at: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  description?: string;
  icon?: string;
  color?: string;
  asset_count?: number;
  children?: AssetCategory[];
}

interface DataMap {
  id: string;
  name: string;
  description?: string;
  scope?: 'global' | 'domain' | 'team';
  domain?: string;
  status: 'active' | 'draft' | 'archived';
  layout?: 'hierarchical' | 'network' | 'grid';
  nodes: AssetLineageNode[];
  edges: AssetLineageEdge[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AssetSearchResult {
  assets: DataAsset[];
  total: number;
  facets: {
    by_type: Array<{ type: AssetType; count: number }>;
    by_status: Array<{ status: AssetStatus; count: number }>;
    by_sensitivity: Array<{ sensitivity: AssetSensitivity; count: number }>;
    by_owner: Array<{ owner: string; count: number }>;
    by_tag: Array<{ tag: string; count: number }>;
  };
  suggestions?: string[];
}

export interface AssetCatalogDashboard {
  total_assets: number;
  active_assets: number;
  deprecated_assets: number;
  by_type: Array<{ type: AssetType; count: number; percentage: number }>;
  by_sensitivity: Array<{ sensitivity: AssetSensitivity; count: number }>;
  by_owner_team: Array<{ team: string; count: number }>;
  recent_updated: Array<{ asset_id: string; name: string; updated_at: string }>;
  unassigned_assets: number;
  orphan_assets: number;
  lineage_coverage: number;
  tags_coverage: number;
}

// ============ Request Types ============

interface CreateDataAssetRequest {
  name: string;
  display_name?: string;
  type: AssetType;
  description?: string;
  owner?: string;
  owner_team?: string;
  database?: string;
  schema?: string;
  table_name?: string;
  url?: string;
  sensitivity?: AssetSensitivity;
  tags?: string[];
  category?: string;
  sub_category?: string;
  update_frequency?: string;
  data_source?: string;
}

interface UpdateDataAssetRequest {
  name?: string;
  display_name?: string;
  description?: string;
  owner?: string;
  owner_team?: string;
  status?: AssetStatus;
  sensitivity?: AssetSensitivity;
  tags?: string[];
  category?: string;
  sub_category?: string;
  update_frequency?: string;
}

interface CatalogAssetParams {
  type?: AssetType;
  status?: AssetStatus;
  sensitivity?: AssetSensitivity;
  owner?: string;
  owner_team?: string;
  database?: string;
  category?: string;
  tags?: string[];
  search?: string;
  has_lineage?: boolean;
  has_owner?: boolean;
  page?: number;
  pageSize?: number;
}

interface SearchAssetsRequest {
  query?: string;
  filters?: {
    types?: AssetType[];
    statuses?: AssetStatus[];
    sensitivities?: AssetSensitivity[];
    owners?: string[];
    tags?: string[];
    categories?: string[];
    date_range?: { start: string; end: string };
  };
  sort?: { field: string; order: 'asc' | 'desc' };
  page?: number;
  pageSize?: number;
}

interface GetLineageRequest {
  asset_id: string;
  direction?: LineageDirection;
  depth?: LineageDepth;
  include_columns?: boolean;
  filters?: {
    types?: AssetType[];
    min_confidence?: number;
  };
}

interface CreateAssetTagRequest {
  name: string;
  color?: string;
  category?: string;
  description?: string;
}

export interface CreateAssetCategoryRequest {
  name: string;
  code?: string;
  parent_id?: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface CreateDataMapRequest {
  name: string;
  description?: string;
  scope?: 'global' | 'domain' | 'team';
  domain?: string;
  layout?: 'hierarchical' | 'network' | 'grid';
  node_ids?: string[];
  include_lineage?: boolean;
  depth?: LineageDepth;
}

// ============ API ============

export const dataAssetCatalogApiV66 = {
  // ===== 数据资产编目 CRUD =====
  async createAsset(data: CreateDataAssetRequest): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.post<DataAsset>('/mdm-v60/metadata', data);
  },

  async getAsset(id: string): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.get<DataAsset>(`/mdm-v60/metadata/${id}`);
  },

  async listAssets(
    params?: CatalogAssetParams
  ): Promise<ApiResponse<{ items: DataAsset[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.sensitivity) qs.set('sensitivity', params.sensitivity);
    if (params?.owner) qs.set('owner', params.owner);
    if (params?.owner_team) qs.set('owner_team', params.owner_team);
    if (params?.database) qs.set('database', params.database);
    if (params?.category) qs.set('category', params.category);
    if (params?.tags) qs.set('tags', params.tags.join(','));
    if (params?.search) qs.set('q', params.search);
    if (params?.has_lineage !== undefined) qs.set('has_lineage', String(params.has_lineage));
    if (params?.has_owner !== undefined) qs.set('has_owner', String(params.has_owner));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DataAsset[]; total: number }>(
      `/mdm-v60/metadata${s ? `?${s}` : ''}`
    );
  },

  async updateAsset(id: string, data: UpdateDataAssetRequest): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.put<DataAsset>(`/mdm-v60/metadata/${id}`, data);
  },

  async deleteAsset(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v60/metadata/${id}`);
  },

  async getAssetColumns(id: string): Promise<ApiResponse<AssetColumn[]>> {
    return apiClient.master.get<AssetColumn[]>(`/mdm-v66/assets/${id}/columns`);
  },

  async updateAssetColumns(id: string, columns: AssetColumn[]): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.put<DataAsset>(`/mdm-v66/assets/${id}/columns`, { columns });
  },

  async bulkUpdateAssets(data: {
    asset_ids: string[];
    status?: AssetStatus;
    sensitivity?: AssetSensitivity;
    tags?: string[];
    owner?: string;
    owner_team?: string;
  }): Promise<ApiResponse<{ updated: number }>> {
    return apiClient.master.patch<{ updated: number }>('/mdm-v66/assets/bulk', data);
  },

  async batchDeleteAssets(assetIds: string[]): Promise<ApiResponse<{ deleted: number }>> {
    return apiClient.master.post<{ deleted: number }>('/mdm-v66/assets/bulk-delete', {
      asset_ids: assetIds,
    });
  },

  async importAssets(data: {
    file_url: string;
    format?: 'csv' | 'json' | 'yaml';
    on_duplicate?: 'skip' | 'update' | 'error';
  }): Promise<
    ApiResponse<{ imported: number; updated: number; failed: number; errors?: string[] }>
  > {
    return apiClient.master.post<{
      imported: number;
      updated: number;
      failed: number;
      errors?: string[];
    }>('/mdm-v66/assets/import', data);
  },

  async exportAssets(params?: {
    type?: AssetType;
    status?: AssetStatus;
    format?: 'csv' | 'json' | 'yaml';
    include_lineage?: boolean;
  }): Promise<ApiResponse<{ download_url: string; count: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.format) qs.set('format', params.format);
    if (params?.include_lineage !== undefined)
      qs.set('include_lineage', String(params.include_lineage));
    return apiClient.master.get<{ download_url: string; count: number }>(
      `/mdm-v66/assets/export?${qs.toString()}`
    );
  },

  // ===== 数据血缘 =====
  async getLineage(params: GetLineageRequest): Promise<ApiResponse<AssetLineageGraph>> {
    const qs = new URLSearchParams();
    qs.set('asset_id', params.asset_id);
    if (params.direction) qs.set('direction', params.direction);
    if (params.depth) qs.set('depth', String(params.depth));
    if (params.include_columns !== undefined)
      qs.set('include_columns', String(params.include_columns));
    if (params.filters?.types) qs.set('types', params.filters.types.join(','));
    if (params.filters?.min_confidence !== undefined)
      qs.set('min_confidence', String(params.filters.min_confidence));
    return apiClient.master.get<AssetLineageGraph>(`/mdm-v66/lineage?${qs.toString()}`);
  },

  async getLineageUpstream(
    assetId: string,
    depth?: LineageDepth
  ): Promise<ApiResponse<AssetLineageGraph>> {
    const qs = new URLSearchParams();
    if (depth) qs.set('depth', String(depth));
    const s = qs.toString();
    return apiClient.master.get<AssetLineageGraph>(
      `/mdm-v60/lineage/${assetId}/upstream${s ? `?${s}` : ''}`
    );
  },

  async getLineageDownstream(
    assetId: string,
    depth?: LineageDepth
  ): Promise<ApiResponse<AssetLineageGraph>> {
    const qs = new URLSearchParams();
    if (depth) qs.set('depth', String(depth));
    const s = qs.toString();
    return apiClient.master.get<AssetLineageGraph>(
      `/mdm-v60/lineage/${assetId}/downstream${s ? `?${s}` : ''}`
    );
  },

  async getLineageByColumn(
    assetId: string,
    columnName: string
  ): Promise<ApiResponse<AssetLineageGraph>> {
    const qs = new URLSearchParams();
    qs.set('asset_id', assetId);
    qs.set('column', columnName);
    return apiClient.master.get<AssetLineageGraph>(`/mdm-v66/lineage/column?${qs.toString()}`);
  },

  async refreshLineage(assetId?: string): Promise<ApiResponse<{ refreshed: number }>> {
    const qs = new URLSearchParams();
    if (assetId) qs.set('asset_id', assetId);
    return apiClient.master.post<{ refreshed: number }>(
      `/mdm-v66/lineage/refresh${qs.toString() ? `?${qs.toString()}` : ''}`,
      {}
    );
  },

  // ===== 资产标签 =====
  async createTag(data: CreateAssetTagRequest): Promise<ApiResponse<AssetTag>> {
    return apiClient.master.post<AssetTag>('/mdm-v66/tags', data);
  },

  async listTags(params?: {
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: AssetTag[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: AssetTag[]; total: number }>(
      `/mdm-v66/tags${s ? `?${s}` : ''}`
    );
  },

  async updateTag(
    id: string,
    data: Partial<CreateAssetTagRequest>
  ): Promise<ApiResponse<AssetTag>> {
    return apiClient.master.put<AssetTag>(`/mdm-v66/tags/${id}`, data);
  },

  async deleteTag(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v66/tags/${id}`);
  },

  async addTagsToAsset(assetId: string, tagIds: string[]): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.post<DataAsset>(`/mdm-v66/assets/${assetId}/tags`, { tag_ids: tagIds });
  },

  async removeTagsFromAsset(assetId: string, tagIds: string[]): Promise<ApiResponse<DataAsset>> {
    return apiClient.master.delete<DataAsset>(`/mdm-v66/assets/${assetId}/tags`, {
      data: { tag_ids: tagIds },
    });
  },

  // ===== 资产分类 =====
  async createCategory(data: CreateAssetCategoryRequest): Promise<ApiResponse<AssetCategory>> {
    return apiClient.master.post<AssetCategory>('/mdm-v66/categories', data);
  },

  async getCategoryTree(): Promise<ApiResponse<AssetCategory[]>> {
    return apiClient.master.get<AssetCategory[]>('/mdm-v66/categories/tree');
  },

  async listCategories(params?: {
    parent_id?: string;
    search?: string;
  }): Promise<ApiResponse<{ items: AssetCategory[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.parent_id) qs.set('parent_id', params.parent_id);
    if (params?.search) qs.set('q', params.search);
    const s = qs.toString();
    return apiClient.master.get<{ items: AssetCategory[]; total: number }>(
      `/mdm-v66/categories${s ? `?${s}` : ''}`
    );
  },

  async updateCategory(
    id: string,
    data: Partial<CreateAssetCategoryRequest>
  ): Promise<ApiResponse<AssetCategory>> {
    return apiClient.master.put<AssetCategory>(`/mdm-v66/categories/${id}`, data);
  },

  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v66/categories/${id}`);
  },

  // ===== 数据地图 =====
  async createDataMap(data: CreateDataMapRequest): Promise<ApiResponse<DataMap>> {
    return apiClient.master.post<DataMap>('/mdm-v66/maps', data);
  },

  async getDataMap(id: string): Promise<ApiResponse<DataMap>> {
    return apiClient.master.get<DataMap>(`/mdm-v66/maps/${id}`);
  },

  async listDataMaps(params?: {
    scope?: string;
    domain?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DataMap[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DataMap[]; total: number }>(
      `/mdm-v66/maps${s ? `?${s}` : ''}`
    );
  },

  async updateDataMap(
    id: string,
    data: Partial<CreateDataMapRequest>
  ): Promise<ApiResponse<DataMap>> {
    return apiClient.master.put<DataMap>(`/mdm-v66/maps/${id}`, data);
  },

  async deleteDataMap(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v66/maps/${id}`);
  },

  async exportDataMap(
    id: string,
    format?: 'svg' | 'json' | 'png'
  ): Promise<ApiResponse<{ download_url: string; size_kb: number }>> {
    const qs = new URLSearchParams();
    if (format) qs.set('format', format);
    return apiClient.master.get<{ download_url: string; size_kb: number }>(
      `/mdm-v66/maps/${id}/export?${qs.toString()}`
    );
  },

  // ===== 资产搜索 =====
  async searchAssets(data: SearchAssetsRequest): Promise<ApiResponse<AssetSearchResult>> {
    const qs = new URLSearchParams();
    if (data.query) qs.set('q', data.query);
    if (data.page !== undefined) qs.set('page', String(data.page));
    if (data.pageSize !== undefined) qs.set('pagesize', String(data.pageSize));
    const s = qs.toString();
    return apiClient.master.get<AssetSearchResult>(`/mdm-v60/metadata/search${s ? `?${s}` : ''}`);
  },

  async quickSearch(query: string, limit?: number): Promise<ApiResponse<AssetSearchResult>> {
    const qs = new URLSearchParams();
    qs.set('q', query);
    if (limit !== undefined) qs.set('limit', String(limit));
    return apiClient.master.get<AssetSearchResult>(`/mdm-v60/metadata/search?${qs.toString()}`);
  },

  async getSearchSuggestions(prefix: string): Promise<ApiResponse<string[]>> {
    const qs = new URLSearchParams();
    qs.set('prefix', prefix);
    return apiClient.master.get<string[]>(`/mdm-v66/search/suggestions?${qs.toString()}`);
  },

  // ===== 仪表盘 =====
  async getDashboard(): Promise<ApiResponse<AssetCatalogDashboard>> {
    return apiClient.master.get<AssetCatalogDashboard>('/mdm-v60/metadata/stats');
  },

  async getRecentAssets(limit?: number): Promise<ApiResponse<DataAsset[]>> {
    const qs = new URLSearchParams();
    if (limit !== undefined) qs.set('limit', String(limit));
    return apiClient.master.get<DataAsset[]>(
      `/mdm-v66/dashboard/recent${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  async getOrphanAssets(): Promise<ApiResponse<DataAsset[]>> {
    return apiClient.master.get<DataAsset[]>('/mdm-v66/dashboard/orphans');
  },
};

export default dataAssetCatalogApiV66;
