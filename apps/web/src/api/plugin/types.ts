export interface Plugin {
  id: string;
  code: string;
  name: string;
  description?: string;
  version: string;
  plugin_type: string;
  is_published: boolean;
  category?: string;
  is_free?: boolean;
  price_cents?: number;
  install_count?: number;
  rating?: number;
  rating_count?: number;
  runtime_status?: string;
  runtime_url?: string;
  base_path?: string;
  last_heartbeat?: string;
  author_name?: string;
  is_installed?: boolean;
  is_featured?: boolean;
  tags?: string[];
  created_at?: string;
}

interface PluginPermission {
  id: string;
  plugin_code: string;
  permission_code: string;
  permission_name?: string;
  resource_type?: string;
  action?: string;
}

export interface PluginDetails {
  plugin: Plugin;
  permissions: PluginPermission[];
}

export interface TenantPlugin {
  id: string;
  tenant_id: string;
  plugin_id: string;
  installed_version: string;
  isactive: boolean;
  license_type: string;
  license_expires_at?: string;
  activated_at?: string;
  last_used_at?: string;
  usage_count: number;
  plugin_name?: string;
}

export interface TenantInstalledPlugin {
  id: string;
  tenant_id: string;
  plugin_id: string;
  installed_version: string;
  isactive: boolean;
  license_type: string;
  license_expires_at?: string;
  activated_at?: string;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  plugin_code: string;
  plugin_name: string;
  plugin_description?: string;
  plugin_version: string;
  plugin_category?: string;
  runtime_status?: string;
  runtime_url?: string;
  last_heartbeat?: string;
}

interface PluginWithStatus {
  plugin: Plugin;
  is_owned: boolean;
  tenant_plugin?: TenantPlugin;
}

export interface PluginRuntimeInfo {
  code: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  plugin_type: string;
  permissions: Array<{ code: string; name: string; description: string }>;
}

interface PluginRuntimeConfig {
  port: number;
  health_endpoint: string;
  base_path: string;
}

export interface SuiteInfo {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  plugins: string[];
  category: string;
  price_cents?: number;
  is_free?: boolean;
}

export interface PluginCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  plugin_count?: number;
  isactive?: boolean;
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
  filesize?: number;
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

export interface MarketplaceSummary {
  total_plugins: number;
  categories: PluginCategory[];
  featured_plugins: Plugin[];
  new_plugins: Plugin[];
  top_rated: Plugin[];
}

export interface PluginListResponse {
  plugins: Plugin[];
  total: number;
  page: number;
  pagesize: number;
  total_pages: number;
}

export interface PluginReviewListResponse {
  reviews: PluginReview[];
  total: number;
  page: number;
  pagesize: number;
  total_pages: number;
  average_rating: number;
}
