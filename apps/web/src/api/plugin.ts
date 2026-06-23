/**
 * Plugin API Client
 * 插件市场 API 客户端
 */

import axios from "axios";
import type { ApiResponse } from "./client";
import { apiLogger } from "@/utils/logger";
import { PLUGIN_TIMEOUT } from "@/constants/timeouts";

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
}

export interface PluginPermission {
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
  is_active: boolean;
  license_type: string;
  license_expires_at?: string;
  activated_at?: string;
  last_used_at?: string;
  usage_count: number;
}

export interface TenantInstalledPlugin {
  id: string;
  tenant_id: string;
  plugin_id: string;
  installed_version: string;
  is_active: boolean;
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

export interface PluginWithStatus {
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

export interface PluginRuntimeConfig {
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

export const SUITES: SuiteInfo[] = [
  {
    id: "production",
    code: "production",
    name: "生产套件",
    description: "离散/流程制造管理",
    icon: "Factory",
    plugins: ["mes", "pdm"],
    category: "manufacturing",
    price_cents: 99999,
  },
  {
    id: "quality",
    code: "quality",
    name: "质量套件",
    description: "质量管控、实验室、环保安全",
    icon: "Shield",
    plugins: ["qms", "lims", "ehs"],
    category: "quality",
    price_cents: 79999,
  },
  {
    id: "rd",
    code: "rd",
    name: "研发套件",
    description: "研发项目管理",
    icon: "FlaskConical",
    plugins: ["rs"],
    category: "rd",
    price_cents: 59999,
  },
  {
    id: "collab",
    code: "collab",
    name: "协同套件",
    description: "人力、客户、项目管理",
    icon: "Users",
    plugins: ["hrm", "crm", "pm"],
    category: "collaboration",
    price_cents: 69999,
  },
  {
    id: "business",
    code: "business",
    name: "经营套件",
    description: "财务管理、采购销售",
    icon: "Building2",
    plugins: ["erp"],
    category: "business",
    price_cents: 89999,
  },
  {
    id: "supply",
    code: "supply",
    name: "供应链套件",
    description: "供应链、仓储、供应商",
    icon: "Package",
    plugins: ["scm", "wms", "srm"],
    category: "supply",
    price_cents: 89999,
  },
  {
    id: "analytics",
    code: "analytics",
    name: "分析套件",
    description: "数据分析、报表",
    icon: "BarChart3",
    plugins: ["bi", "report"],
    category: "analytics",
    price_cents: 49999,
  },
  {
    id: "portal",
    code: "portal",
    name: "门户套件",
    description: "企业工作台",
    icon: "LayoutDashboard",
    plugins: ["portal"],
    category: "portal",
    is_free: true,
  },
  {
    id: "infrastructure",
    code: "infrastructure",
    name: "基础设施",
    description: "移动端、IoT、数据交换",
    icon: "Network",
    plugins: ["mobile", "gis", "integration"],
    category: "infrastructure",
    price_cents: 39999,
  },
];

export const PLUGIN_SUITE_MAP: Record<string, string> = {
  mes: "production",
  pdm: "production",
  qms: "quality",
  lims: "quality",
  ehs: "quality",
  rs: "rd",
  hrm: "collab",
  crm: "collab",
  pm: "collab",
  erp: "business",
  scm: "supply",
  wms: "supply",
  srm: "supply",
  bi: "analytics",
  report: "analytics",
  portal: "portal",
  mobile: "infrastructure",
  gis: "infrastructure",
  integration: "infrastructure",
};

export const PLUGIN_REGISTRY: Record<string, { url: string; port: number; name: string; icon: string }> = {
  workflow: { url: "http://localhost:8000", port: 8000, name: "工作流", icon: "GitBranch" },
  erp: { url: "http://localhost:8010", port: 8010, name: "ERP", icon: "Building2" },
  hrm: { url: "http://localhost:8020", port: 8020, name: "人力资源", icon: "Users" },
  pm: { url: "http://localhost:8023", port: 8023, name: "项目管理", icon: "Target" },
  crm: { url: "http://localhost:8029", port: 8029, name: "客户管理", icon: "Users" },
  mes: { url: "http://localhost:8030", port: 8030, name: "生产执行", icon: "Factory" },
  pdm: { url: "http://localhost:8031", port: 8031, name: "产品数据", icon: "Layers" },
  scm: { url: "http://localhost:8040", port: 8040, name: "供应链", icon: "Truck" },
  wms: { url: "http://localhost:8041", port: 8041, name: "仓储管理", icon: "Warehouse" },
  srm: { url: "http://localhost:8042", port: 8042, name: "供应商", icon: "Handshake" },
  qms: { url: "http://localhost:8050", port: 8050, name: "质量管理", icon: "Shield" },
  lims: { url: "http://localhost:8051", port: 8051, name: "实验室", icon: "FlaskConical" },
  ehs: { url: "http://localhost:8052", port: 8052, name: "环境安全", icon: "Leaf" },
  rs: { url: "http://localhost:8053", port: 8053, name: "研发管理", icon: "FlaskRound" },
  bi: { url: "http://localhost:8060", port: 8060, name: "商业智能", icon: "BarChart3" },
  report: { url: "http://localhost:8061", port: 8061, name: "报表服务", icon: "FileText" },
  monitor: { url: "http://localhost:8062", port: 8062, name: "系统监控", icon: "Activity" },
  portal: { url: "http://localhost:8063", port: 8063, name: "企业门户", icon: "LayoutDashboard" },
  mobile: { url: "http://localhost:8070", port: 8070, name: "移动端", icon: "Smartphone" },
  gis: { url: "http://localhost:8071", port: 8071, name: "地理信息", icon: "Map" },
  integration: { url: "http://localhost:8072", port: 8072, name: "数据交换", icon: "Network" },
};

const runtimeAxios = axios.create({
  timeout: PLUGIN_TIMEOUT.DEFAULT,
});

export const fetchPluginInfo = async (
  code: string,
): Promise<PluginRuntimeInfo | null> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return null;

  try {
    const response = await runtimeAxios.get(`${config.url}/api/plugins/info`);
    if (response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    apiLogger.warn(`Failed to fetch plugin info for ${code}:`, error);
    return null;
  }
};

export const fetchAllPluginInfo = async (): Promise<PluginRuntimeInfo[]> => {
  const results = await Promise.allSettled(
    Object.keys(PLUGIN_REGISTRY).map((code) => fetchPluginInfo(code)),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<PluginRuntimeInfo> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value);
};

export const checkPluginHealth = async (
  code: string,
): Promise<{ healthy: boolean; status?: string; latency?: number }> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return { healthy: false };

  const startTime = Date.now();
  try {
    const response = await runtimeAxios.get(`${config.url}/api/plugins/health`);
    const latency = Date.now() - startTime;
    if (response.data?.data?.status) {
      return { healthy: true, status: response.data.data.status, latency };
    }
    return { healthy: true, status: "running", latency };
  } catch (error) {
    try {
      const response = await runtimeAxios.get(`${config.url}/health`);
      const latency = Date.now() - startTime;
      return { healthy: true, status: "running", latency };
    } catch {
      return { healthy: false };
    }
  }
};

export const checkAllPluginsHealth = async (): Promise<Record<string, { healthy: boolean; status?: string; latency?: number }>> => {
  const results = await Promise.allSettled(
    Object.keys(PLUGIN_REGISTRY).map(async (code) => {
      const health = await checkPluginHealth(code);
      return { code, ...health };
    }),
  );

  const healthMap: Record<string, { healthy: boolean; status?: string; latency?: number }> = {};
  results.forEach((r) => {
    if (r.status === "fulfilled") {
      healthMap[r.value.code] = {
        healthy: r.value.healthy,
        status: r.value.status,
        latency: r.value.latency,
      };
    }
  });
  return healthMap;
};

const API_BASE = "/api/core/plugins";

const pluginAxios = axios.create({
  baseURL: "",
  timeout: 30000,
});

pluginAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers["Authorization"]) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem("tenant_id");
  if (tenantId && !config.headers["X-Tenant-ID"]) {
    config.headers["X-Tenant-ID"] = tenantId;
  }
  return config;
});

export interface PluginCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  plugin_count?: number;
  is_active?: boolean;
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
  page_size: number;
  total_pages: number;
}

export interface PluginReviewListResponse {
  reviews: PluginReview[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  average_rating: number;
}

const MARKETPLACE_API = "/api/core/plugin/marketplace";

export const getMarketplaceSummary = async (): Promise<
  ApiResponse<MarketplaceSummary>
> => {
  const response = await pluginAxios.get(MARKETPLACE_API);
  return response.data;
};

export const getPluginCategories = async (): Promise<
  ApiResponse<PluginCategory[]>
> => {
  const response = await pluginAxios.get(`${MARKETPLACE_API}/categories`);
  return response.data;
};

export const listPlugins = async (params?: {
  search?: string;
  category?: string;
  sort_by?: "popular" | "rating" | "newest" | "price";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  is_free?: boolean;
}): Promise<ApiResponse<PluginListResponse>> => {
  const response = await pluginAxios.get(`${MARKETPLACE_API}/list`, { params });
  return response.data;
};

export const getPlugin = async (code: string): Promise<ApiResponse<Plugin>> => {
  const response = await pluginAxios.get(`/api/core/plugin/plugins/${code}`);
  return response.data;
};

export const getPluginVersions = async (
  code: string,
): Promise<ApiResponse<PluginVersion[]>> => {
  const response = await pluginAxios.get(
    `/api/core/plugin/plugins/${code}/versions`,
  );
  return response.data;
};

export const getPluginReviews = async (
  code: string,
  params?: {
    page?: number;
    page_size?: number;
    sort_by?: "date" | "helpful" | "rating";
    sort_order?: "asc" | "desc";
    rating_min?: number;
    is_verified?: boolean;
  },
): Promise<ApiResponse<PluginReviewListResponse>> => {
  const response = await pluginAxios.get(
    `/api/core/plugin/plugins/${code}/reviews`,
    { params },
  );
  return response.data;
};

export const submitPluginReview = async (
  code: string,
  data: {
    rating: number;
    title?: string;
    content?: string;
  },
): Promise<ApiResponse<PluginReview>> => {
  const response = await pluginAxios.post(
    `/api/core/plugin/plugins/${code}/reviews`,
    data,
  );
  return response.data;
};

export const pluginApi = {
  listMarketplace: async (): Promise<ApiResponse<Plugin[]>> => {
    const response = await pluginAxios.get(API_BASE);
    return response.data;
  },

  listInstalled: async (): Promise<ApiResponse<TenantInstalledPlugin[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/my`);
    return response.data;
  },

  getDetails: async (
    pluginCode: string,
  ): Promise<ApiResponse<PluginDetails>> => {
    const response = await pluginAxios.get(`${API_BASE}/${pluginCode}`);
    return response.data;
  },

  install: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/${pluginCode}/install`,
    );
    return response.data;
  },

  uninstall: async (pluginCode: string): Promise<ApiResponse<boolean>> => {
    const response = await pluginAxios.post(
      `${API_BASE}/${pluginCode}/uninstall`,
    );
    return response.data;
  },

  enable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/enable`);
    return response.data;
  },

  disable: async (pluginCode: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/disable`);
    return response.data;
  },

  upgrade: async (pluginCode: string, version?: string): Promise<ApiResponse<TenantPlugin>> => {
    const response = await pluginAxios.post(`${API_BASE}/${pluginCode}/upgrade`, { version });
    return response.data;
  },

  getUpgradeHistory: async (pluginCode: string): Promise<ApiResponse<PluginVersion[]>> => {
    const response = await pluginAxios.get(`${API_BASE}/${pluginCode}/upgrade-history`);
    return response.data;
  },
};

export default pluginApi;
