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
type AssetStatus = 'active' | 'deprecated' | 'archived' | 'development';
type AssetSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
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

// ============ V60 → DataAsset response adapter ============
// 【BE-09】核心方法已改指 V60 /mdm-v60/metadata，但 V60 返回 MetadataObject 与前端
// DataAsset 契约字段名/枚举不一致。在此统一映射，页面零改动零回归。
// 字段无源时给安全默认值并注释说明，不编造语义。

interface V60MetadataObject {
  id: string;
  name: string;
  object_type?: string;
  description: string;
  owner: string;
  tags: string[];
  attributes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface V60MetadataStats {
  total_objects: number;
  total_attributes: number;
  total_tags: number;
  by_type?: Record<string, number>;
  recent_created?: V60MetadataObject[];
}

function mapObjectType(t?: string): AssetType {
  // V60 object_type ∈ {Table, Field, Entity, Model}；与前端 AssetType
  // (table/view/function/api/file/report/dashboard) 仅 table 精确对应，
  // Field/Entity/Model 无直接语义，统一回落 dashboard（通用元数据目录项）。
  switch (t) {
    case 'Table':
      return 'table';
    default:
      return 'dashboard';
  }
}

function toDataAsset(v: V60MetadataObject): DataAsset {
  return {
    id: v.id,
    name: v.name,
    display_name: v.name, // V60 无 display_name，回退为 name
    type: mapObjectType(v.object_type),
    description: v.description,
    owner: v.owner,
    owner_team: v.owner, // V60 无 owner_team，回退为 owner
    status: 'active', // V60 无 status 字段，安全默认 active
    sensitivity: 'internal', // V60 无 sensitivity 字段，安全默认 internal
    tags: v.tags,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

function toDashboard(s: V60MetadataStats): AssetCatalogDashboard {
  const total = s.total_objects ?? 0;
  return {
    total_assets: total,
    active_assets: total, // V60 无 status，全部视为 active
    deprecated_assets: 0, // V60 无 deprecated 维度
    by_type: [],
    by_sensitivity: [],
    by_owner_team: [],
    recent_updated: (s.recent_created ?? []).map((o) => ({
      asset_id: o.id,
      name: o.name,
      updated_at: o.updated_at,
    })),
    unassigned_assets: 0, // V60 owner 恒有值，无法计算未分配
    orphan_assets: 0, // V60 无孤儿维度
    lineage_coverage: 0, // V60 stats 无 lineage 覆盖
    tags_coverage: 0, // V60 stats 无 tag 覆盖率
  };
}

function mapResp<T, R>(res: ApiResponse<T>, fn: (d: T) => R): ApiResponse<R> {
  if (res.data === undefined) return res as unknown as ApiResponse<R>;
  return { ...res, data: fn(res.data) };
}

// ============ V60 真实契约类型（metadata_v60.rs 结构体对齐） ============

export interface V60LineageNode {
  id: string;
  entity_id: string;
  entity_type: string;
  name: string;
  attributes: Record<string, unknown>;
  level: number;
  position: Record<string, unknown>;
}

export interface V60LineageEdge {
  id: string;
  source_id: string;
  target_id: string;
  transformation_type: 'filter' | 'map' | 'aggregate' | 'join' | 'transform' | 'load' | 'extract';
  transformation_details: Record<string, unknown>;
  confidence: number;
}

export interface V60LineageGraph {
  id: string;
  nodes: V60LineageNode[];
  edges: V60LineageEdge[];
  root_ids: string[];
  updated_at: string;
}

export interface V60LineageImpact {
  entity_id: string;
  entity_type: string;
  affected_nodes: number;
  affected_downstream: number;
  confidence: number;
  impact_score: number;
}

export interface V60LineageDashboard {
  total_graphs: number;
  total_nodes: number;
  total_edges: number;
  entity_types: string[];
  avg_confidence: number;
  deepest_level: number;
}

export interface V60LineageExport {
  graphs: V60LineageGraph[];
  nodes: V60LineageNode[];
  edges: V60LineageEdge[];
  exported_at: string;
  format: string;
}

export type V60LifecycleStage =
  'created' | 'active' | 'maintenance' | 'deprecated' | 'archived' | 'deleted';

export interface V60LifecycleHistory {
  id: string;
  entity_id: string;
  stage: V60LifecycleStage;
  from_stage?: V60LifecycleStage | null;
  reason: string;
  changed_at: string;
  changed_by: string;
}

export interface V60LifecyclePolicy {
  id: string;
  entity_type: string;
  transitions: Record<string, unknown>;
  duration_days: number;
  actions: string[];
}

export interface V60LifecycleDashboard {
  total_entities: number;
  by_stage: Record<string, number>;
  policies_count: number;
  recent_transitions: V60LifecycleHistory[];
}

export interface V60MetadataAttribute {
  id: string;
  object_id: string;
  key: string;
  value: string;
  data_type: string;
  is_required: boolean;
}

export interface V60MetadataTag {
  id: string;
  name: string;
  color: string;
  description: string;
  usage_count: number;
}

export interface AddV60AttributeRequest {
  object_id?: string;
  key: string;
  value: string;
  data_type?: string;
  is_required?: boolean;
}

export interface AddV60TagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface BuildV60LineageGraphRequest {
  root_entity_id: string;
  root_entity_type: string;
  max_depth?: number;
}

export interface GetV60LineagePathRequest {
  source_id: string;
  target_id: string;
}

export interface TransitionV60LifecycleRequest {
  new_stage: string;
  reason?: string;
  changed_by?: string;
}

export interface CreateV60LifecyclePolicyRequest {
  entity_type: string;
  transitions: Record<string, unknown>;
  duration_days?: number;
  actions?: string[];
}

export interface BulkTransitionV60LifecycleRequest {
  entity_ids: string[];
  target_stage: string;
  reason?: string;
  changed_by?: string;
}

// ============ API ============

export const dataAssetCatalogApiV66 = {
  // ===== 数据资产编目 CRUD =====
  async createAsset(data: CreateDataAssetRequest): Promise<ApiResponse<DataAsset>> {
    const res = await apiClient.master.post<V60MetadataObject>('/mdm-v60/metadata', data);
    return mapResp(res, toDataAsset);
  },

  async getAsset(id: string): Promise<ApiResponse<DataAsset>> {
    const res = await apiClient.master.get<V60MetadataObject>(`/mdm-v60/metadata/${id}`);
    return mapResp(res, toDataAsset);
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
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    const res = await apiClient.master.get<{ items: V60MetadataObject[]; total: number }>(
      `/mdm-v60/metadata${s ? `?${s}` : ''}`
    );
    return mapResp(res, (d) => ({ items: (d.items ?? []).map(toDataAsset), total: d.total }));
  },

  async updateAsset(id: string, data: UpdateDataAssetRequest): Promise<ApiResponse<DataAsset>> {
    const res = await apiClient.master.put<V60MetadataObject>(`/mdm-v60/metadata/${id}`, data);
    return mapResp(res, toDataAsset);
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

  /**
   * @deprecated V66 预埋（P1 契约偏差：后端 /lineage/refresh 缺 {id} 路径参数，待 V66 落地）
   * 现役 V60 血缘刷新请使用 buildLineageGraph + getLineageGraph。
   */
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

  /**
   * @deprecated V66 预埋（P1 契约偏差：后端无 GET /tags 方法缺口，待 V66 落地）。
   * 现役 V60 打标请使用 addMetadataTag；资产列表标签随 listAssets 返回。
   */
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
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
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

  /**
   * @deprecated V66 预埋（P1 契约偏差：后端无 GET /categories 方法缺口，待 V66 落地）。
   * 现役 V60 资产分类随 listAssets 的 category 维度返回，无独立分类目录端点。
   */
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

  /**
   * @deprecated V66 预埋（P1 契约偏差：后端无 GET /maps 方法缺口，待 V66 落地）。
   * 现役 V60 无数据地图端点；如需血缘图请使用 buildLineageGraph/getLineageGraph。
   */
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
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
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
    if (data.pageSize !== undefined) qs.set('page_size', String(data.pageSize));
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
    const res = await apiClient.master.get<V60MetadataStats>('/mdm-v60/metadata/stats');
    return mapResp(res, toDashboard);
  },

  /**
   * @deprecated V66 预埋（P1 契约偏差：后端缺 /dashboard/recent 路径，待 V66 落地）。
   * 现役 V60 最近资产可经 listAssets（按 updated_at 排序）或 getDashboard().recent_updated 获取。
   */
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

  // ===== V60 血缘增强（B5 接线，metadata_v60.rs 契约） =====

  async buildLineageGraph(
    data: BuildV60LineageGraphRequest
  ): Promise<ApiResponse<V60LineageGraph>> {
    return apiClient.master.post<V60LineageGraph>('/mdm-v60/lineage/graph', data);
  },

  async getLineageGraph(id: string): Promise<ApiResponse<V60LineageGraph>> {
    return apiClient.master.get<V60LineageGraph>(`/mdm-v60/lineage/graph/${id}`);
  },

  async getLineagePath(data: GetV60LineagePathRequest): Promise<ApiResponse<V60LineageEdge[]>> {
    return apiClient.master.post<V60LineageEdge[]>('/mdm-v60/lineage/path', data);
  },

  async getLineageImpact(id: string): Promise<ApiResponse<V60LineageImpact>> {
    return apiClient.master.get<V60LineageImpact>(`/mdm-v60/lineage/${id}/impact`);
  },

  async getLineageDashboard(): Promise<ApiResponse<V60LineageDashboard>> {
    return apiClient.master.get<V60LineageDashboard>('/mdm-v60/lineage/dashboard');
  },

  async exportLineage(format?: 'json' | 'csv'): Promise<ApiResponse<V60LineageExport>> {
    const qs = new URLSearchParams();
    if (format) qs.set('format', format);
    return apiClient.master.get<V60LineageExport>(
      `/mdm-v60/lineage/export${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  // ===== V60 生命周期管理（B5 接线，metadata_v60.rs 契约） =====

  async getLifecycleStage(id: string): Promise<ApiResponse<{ stage: string }>> {
    return apiClient.master.get<{ stage: string }>(`/mdm-v60/lifecycle/${id}/stage`);
  },

  async transitionLifecycleStage(
    id: string,
    data: TransitionV60LifecycleRequest
  ): Promise<ApiResponse<V60LifecycleHistory>> {
    return apiClient.master.post<V60LifecycleHistory>(`/mdm-v60/lifecycle/${id}/transition`, data);
  },

  async getLifecycleHistory(id: string): Promise<ApiResponse<V60LifecycleHistory[]>> {
    return apiClient.master.get<V60LifecycleHistory[]>(`/mdm-v60/lifecycle/${id}/history`);
  },

  async createLifecyclePolicy(
    data: CreateV60LifecyclePolicyRequest
  ): Promise<ApiResponse<V60LifecyclePolicy>> {
    return apiClient.master.post<V60LifecyclePolicy>('/mdm-v60/lifecycle/policy', data);
  },

  async getLifecyclePolicies(entityType?: string): Promise<ApiResponse<V60LifecyclePolicy[]>> {
    const qs = new URLSearchParams();
    if (entityType) qs.set('entity_type', entityType);
    return apiClient.master.get<V60LifecyclePolicy[]>(
      `/mdm-v60/lifecycle/policies${qs.toString() ? `?${qs.toString()}` : ''}`
    );
  },

  async autoTransitionLifecycle(): Promise<ApiResponse<V60LifecycleHistory[]>> {
    return apiClient.master.post<V60LifecycleHistory[]>('/mdm-v60/lifecycle/auto-transition', {});
  },

  async getLifecycleDashboard(): Promise<ApiResponse<V60LifecycleDashboard>> {
    return apiClient.master.get<V60LifecycleDashboard>('/mdm-v60/lifecycle/dashboard');
  },

  async bulkTransitionLifecycle(
    data: BulkTransitionV60LifecycleRequest
  ): Promise<ApiResponse<{ results: V60LifecycleHistory[]; failed?: number }>> {
    return apiClient.master.post<{ results: V60LifecycleHistory[]; failed?: number }>(
      '/mdm-v60/lifecycle/bulk',
      data
    );
  },

  // ===== V60 元数据属性/标签（B5 接线） =====

  async addMetadataAttribute(
    id: string,
    data: AddV60AttributeRequest
  ): Promise<ApiResponse<V60MetadataAttribute>> {
    return apiClient.master.post<V60MetadataAttribute>(`/mdm-v60/metadata/${id}/attribute`, data);
  },

  async addMetadataTag(data: AddV60TagRequest): Promise<ApiResponse<V60MetadataTag>> {
    return apiClient.master.post<V60MetadataTag>('/mdm-v60/metadata/tag', data);
  },
};

export default dataAssetCatalogApiV66;
