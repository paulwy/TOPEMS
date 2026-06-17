/**
 * Plugin Marketplace API
 * TOPEMS Unified Core - Plugin Management
 */
import type { ApiResponse } from "./client";
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
/**
 * Get marketplace summary (featured, new, top-rated plugins)
 */
export declare function getMarketplaceSummary(): Promise<ApiResponse<MarketplaceSummary>>;
/**
 * List plugins with filters
 */
export declare function listPlugins(filters?: PluginFilters): Promise<ApiResponse<PluginListResponse>>;
/**
 * Get plugin categories
 */
export declare function getPluginCategories(): Promise<ApiResponse<PluginCategory[]>>;
/**
 * Get plugin by code
 */
export declare function getPlugin(code: string): Promise<ApiResponse<Plugin>>;
/**
 * Get plugin versions
 */
export declare function getPluginVersions(pluginId: string): Promise<ApiResponse<PluginVersion[]>>;
/**
 * Get plugin reviews
 */
export declare function getPluginReviews(pluginId: string): Promise<ApiResponse<PluginReview[]>>;
/**
 * Create plugin review
 */
export declare function createPluginReview(pluginId: string, data: {
    rating: number;
    title?: string;
    content: string;
}): Promise<ApiResponse<PluginReview>>;
/**
 * Get tenant's installed plugins
 */
export declare function listTenantPlugins(tenantId: string): Promise<ApiResponse<TenantPluginWithDetails[]>>;
/**
 * Install plugin for tenant
 */
export declare function installPlugin(tenantId: string, pluginCode: string): Promise<ApiResponse<TenantPlugin>>;
/**
 * Uninstall plugin for tenant
 */
export declare function uninstallPlugin(tenantId: string, pluginCode: string): Promise<ApiResponse<boolean>>;
/**
 * Activate plugin for tenant
 */
export declare function activatePlugin(tenantId: string, pluginCode: string): Promise<ApiResponse<TenantPlugin>>;
/**
 * Deactivate plugin for tenant
 */
export declare function deactivatePlugin(tenantId: string, pluginCode: string): Promise<ApiResponse<TenantPlugin>>;
/**
 * Get available plugins for tenant (with ownership status)
 */
export declare function getAvailablePlugins(tenantId: string, filters?: PluginFilters): Promise<ApiResponse<PluginWithStatus[]>>;
/**
 * Upload a new plugin (developer)
 */
export declare function uploadPlugin(data: {
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
}): Promise<ApiResponse<Plugin>>;
/**
 * Update plugin (developer)
 */
export declare function updatePlugin(code: string, data: Partial<{
    name: string;
    description: string;
    is_free: boolean;
    price_cents: number;
    remote_url: string;
    entry_point: string;
    screenshots: string[];
    tags: string[];
    category: string;
}>): Promise<ApiResponse<Plugin>>;
/**
 * Publish plugin
 */
export declare function publishPlugin(code: string): Promise<ApiResponse<Plugin>>;
/**
 * Unpublish plugin
 */
export declare function unpublishPlugin(code: string): Promise<ApiResponse<Plugin>>;
/**
 * Upload plugin version
 */
export declare function uploadPluginVersion(pluginCode: string, data: {
    version: string;
    release_notes?: string;
    is_stable?: boolean;
    is_latest?: boolean;
    download_url?: string;
    checksum?: string;
    file_size?: number;
    min_app_version?: string;
}): Promise<ApiResponse<PluginVersion>>;
