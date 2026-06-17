/**
 * Plugin Marketplace API
 * TOPEMS Unified Core - Plugin Management
 */

import apiClient from "./client";
import type { ApiResponse } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface Plugin {
  id: string;
  code: string;
  name: string;
  description?: string;
  version: string;
  plugin_type: string;
  is_installed: boolean;
  installed_at?: string;
  is_active: boolean;
  activated_at?: string;
  is_free: boolean;
  price_cents?: number;
  remote_url?: string;
  checksum?: string;
  entry_point?: string;
  dependencies?: string[];
  install_count?: number;
  rating?: number;
  rating_count?: number;
  is_published: boolean;
  is_featured?: boolean;
  is_recommended?: boolean;
  author_name?: string;
  author_url?: string;
  homepage_url?: string;
  screenshots?: string[];
  tags?: string[];
  category?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PluginVersion {
  id: string;
  plugin_id: string;
  version: string;
  release_notes?: string;
  is_stable?: boolean;
  is_latest?: boolean;
  download_url?: string;
  checksum?: string;
  file_size?: number;
  min_app_version?: string;
  created_at: string;
}

export interface PluginReview {
  id: string;
  plugin_id: string;
  user_id: string;
  user_name?: string;
  rating?: number;
  title?: string;
  content?: string;
  is_verified_purchase?: boolean;
  is_featured?: boolean;
  helpful_count?: number;
  created_at: string;
}

export interface PluginCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  plugin_count?: number;
  is_active?: boolean;
  created_at: string;
}

export interface TenantPlugin {
  id: string;
  tenant_id: string;
  plugin_id: string;
  installed_version?: string;
  is_active: boolean;
  license_type?: string;
  license_expires_at?: string;
  purchase_order_id?: string;
  activated_at?: string;
  last_used_at?: string;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TenantPluginWithDetails extends TenantPlugin {
  plugin_code: string;
  plugin_name: string;
  plugin_description?: string;
  plugin_version: string;
  plugin_category?: string;
  is_free: boolean;
  price_cents?: number;
  install_count?: number;
  rating?: number;
  rating_count?: number;
}

export interface PluginWithStatus extends Plugin {
  is_owned: boolean;
  tenant_plugin?: TenantPlugin;
}

export interface MarketplaceSummary {
  total_plugins: number;
  categories: PluginCategory[];
  featured_plugins: Plugin[];
  new_plugins: Plugin[];
  top_rated: Plugin[];
}

export interface PluginFilters {
  category?: string;
  search?: string;
  is_free?: boolean;
  sort_by?: 'popular' | 'rating' | 'recent' | 'name';
  page?: number;
  page_size?: number;
}

export interface PluginListResponse {
  plugins: Plugin[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get marketplace summary (featured, new, top-rated plugins)
 */
export async function getMarketplaceSummary(): Promise<ApiResponse<MarketplaceSummary>> {
  return apiClient.get<MarketplaceSummary>("/api/core/plugin/marketplace");
}

/**
 * List plugins with filters
 */
export async function listPlugins(filters?: PluginFilters): Promise<ApiResponse<PluginListResponse>> {
  return apiClient.get<PluginListResponse>("/api/core/plugin/marketplace/list", { params: filters });
}

/**
 * Get plugin categories
 */
export async function getPluginCategories(): Promise<ApiResponse<PluginCategory[]>> {
  return apiClient.get<PluginCategory[]>("/api/core/plugin/marketplace/categories");
}

/**
 * Get plugin by code
 */
export async function getPlugin(code: string): Promise<ApiResponse<Plugin>> {
  return apiClient.get<Plugin>(`/api/core/plugin/plugins/${code}`);
}

/**
 * Get plugin versions
 */
export async function getPluginVersions(pluginId: string): Promise<ApiResponse<PluginVersion[]>> {
  return apiClient.get<PluginVersion[]>(`/api/core/plugin/plugins/${pluginId}/versions`);
}

/**
 * Get plugin reviews
 */
export async function getPluginReviews(pluginId: string): Promise<ApiResponse<PluginReview[]>> {
  return apiClient.get<PluginReview[]>(`/api/core/plugin/plugins/${pluginId}/reviews`);
}

/**
 * Create plugin review
 */
export async function createPluginReview(
  pluginId: string,
  data: { rating: number; title?: string; content: string }
): Promise<ApiResponse<PluginReview>> {
  return apiClient.post<PluginReview>(`/api/core/plugin/plugins/${pluginId}/reviews`, data);
}

/**
 * Get tenant's installed plugins
 */
export async function listTenantPlugins(tenantId: string): Promise<ApiResponse<TenantPluginWithDetails[]>> {
  return apiClient.get<TenantPluginWithDetails[]>(`/api/core/plugin/tenant/${tenantId}/plugins`);
}

/**
 * Install plugin for tenant
 */
export async function installPlugin(
  tenantId: string,
  pluginCode: string
): Promise<ApiResponse<TenantPlugin>> {
  return apiClient.post<TenantPlugin>(`/api/core/plugin/tenant/${tenantId}/plugins/${pluginCode}/install`);
}

/**
 * Uninstall plugin for tenant
 */
export async function uninstallPlugin(
  tenantId: string,
  pluginCode: string
): Promise<ApiResponse<boolean>> {
  return apiClient.post<boolean>(`/api/core/plugin/tenant/${tenantId}/plugins/${pluginCode}/uninstall`);
}

/**
 * Activate plugin for tenant
 */
export async function activatePlugin(
  tenantId: string,
  pluginCode: string
): Promise<ApiResponse<TenantPlugin>> {
  return apiClient.post<TenantPlugin>(`/api/core/plugin/tenant/${tenantId}/plugins/${pluginCode}/activate`);
}

/**
 * Deactivate plugin for tenant
 */
export async function deactivatePlugin(
  tenantId: string,
  pluginCode: string
): Promise<ApiResponse<TenantPlugin>> {
  return apiClient.post<TenantPlugin>(`/api/core/plugin/tenant/${tenantId}/plugins/${pluginCode}/deactivate`);
}

/**
 * Get available plugins for tenant (with ownership status)
 */
export async function getAvailablePlugins(
  tenantId: string,
  filters?: PluginFilters
): Promise<ApiResponse<PluginWithStatus[]>> {
  return apiClient.get<PluginWithStatus[]>(`/api/core/plugin/tenant/${tenantId}/available`, { params: filters });
}

/**
 * Upload a new plugin (developer)
 */
export async function uploadPlugin(data: {
  code: string;
  name: string;
  description?: string;
  version: string;
  plugin_type?: string;
  is_free?: boolean;
  price_cents?: number;
  remote_url?: string;
  entry_point?: string;
  dependencies?: string[];
  author_name?: string;
  author_url?: string;
  homepage_url?: string;
  screenshots?: string[];
  tags?: string[];
  category?: string;
}): Promise<ApiResponse<Plugin>> {
  return apiClient.post<Plugin>("/api/core/plugin/dev/plugins", data);
}

/**
 * Update plugin (developer)
 */
export async function updatePlugin(
  code: string,
  data: Partial<{
    name: string;
    description: string;
    is_free: boolean;
    price_cents: number;
    remote_url: string;
    entry_point: string;
    screenshots: string[];
    tags: string[];
    category: string;
  }>
): Promise<ApiResponse<Plugin>> {
  return apiClient.put<Plugin>(`/api/core/plugin/dev/plugins/${code}`, data);
}

/**
 * Publish plugin
 */
export async function publishPlugin(code: string): Promise<ApiResponse<Plugin>> {
  return apiClient.post<Plugin>(`/api/core/plugin/dev/plugins/${code}/publish`);
}

/**
 * Unpublish plugin
 */
export async function unpublishPlugin(code: string): Promise<ApiResponse<Plugin>> {
  return apiClient.post<Plugin>(`/api/core/plugin/dev/plugins/${code}/unpublish`);
}

/**
 * Upload plugin version
 */
export async function uploadPluginVersion(
  pluginCode: string,
  data: {
    version: string;
    release_notes?: string;
    is_stable?: boolean;
    is_latest?: boolean;
    download_url?: string;
    checksum?: string;
    file_size?: number;
    min_app_version?: string;
  }
): Promise<ApiResponse<PluginVersion>> {
  return apiClient.post<PluginVersion>(`/api/core/plugin/dev/plugins/${pluginCode}/versions`, data);
}
