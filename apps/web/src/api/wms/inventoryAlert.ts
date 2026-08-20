/**
 * WMS · 库存预警 API 绑定
 *
 * 后端: svc/wms/src/modules/inventory_alert.rs
 * 路由:
 *   GET    /wms/alerts
 *   GET    /wms/alerts/{id}
 *   POST   /wms/alerts/{id}/acknowledge
 *   GET    /wms/alerts/statistics
 *   GET    /wms/alerts/summary
 *   GET    /wms/alerts/by-warehouse
 *   GET    /wms/inventory-alerts
 *   GET    /wms/inventory-alerts/statistics
 *   GET    /wms/inventory-alerts/{id}
 *   POST   /wms/inventory-alerts/{id}/acknowledge
 *   GET    /wms/inventory-alerts/rules
 *   POST   /wms/inventory-alerts/rules
 *   GET    /wms/inventory-alerts/rules/{id}
 *   PUT    /wms/inventory-alerts/rules/{id}
 *   DELETE /wms/inventory-alerts/rules/{id}
 *   GET    /wms/inventory-alerts/records
 *   GET    /wms/inventory-alerts/records/{id}
 *   POST   /wms/inventory-alerts/records/{id}/confirm
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AlertType = 'below_min' | 'above_max' | 'reorder_needed' | 'out_of_stock' | 'expiry';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'ignored';

export interface InventoryAlert {
  id: string;
  inventory_id: string;
  material_code: string;
  material_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  location_id?: string;
  location_code?: string;
  alert_type: AlertType;
  current_quantity: number;
  threshold_value?: number;
  deviation_quantity?: number;
  severity: AlertSeverity;
  status: AlertStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertSummary {
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  below_min_count: number;
  above_max_count: number;
  reorder_count: number;
  expiry_count: number;
  out_of_stock_count: number;
}

export interface AlertStatistics {
  summary: AlertSummary;
  alerts_by_warehouse: WarehouseAlertCount[];
  alerts_by_material: MaterialAlertCount[];
}

interface WarehouseAlertCount {
  warehouse_id?: string;
  warehouse_name?: string;
  alert_count: number;
}

interface MaterialAlertCount {
  material_code: string;
  material_name: string;
  alert_count: number;
}

export interface InventoryAlertRule {
  id: string;
  rule_name: string;
  alert_type: AlertType;
  warehouse_id?: string;
  material_code?: string;
  threshold_value: number;
  severity: AlertSeverity;
  enabled: boolean;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRuleRequest {
  rule_name: string;
  alert_type: AlertType;
  warehouse_id?: string;
  material_code?: string;
  threshold_value: number;
  severity: AlertSeverity;
  enabled?: boolean;
  remarks?: string;
}

export interface UpdateAlertRuleRequest {
  rule_name?: string;
  alert_type?: AlertType;
  threshold_value?: number;
  severity?: AlertSeverity;
  enabled?: boolean;
  remarks?: string;
}

export interface InventoryAlertRecord {
  id: string;
  inventory_id?: string;
  material_code: string;
  material_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  location_id?: string;
  location_code?: string;
  alert_type: AlertType;
  current_quantity: number;
  threshold_value?: number;
  deviation_quantity?: number;
  severity: AlertSeverity;
  status: AlertStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface AlertListResponse {
  alerts: InventoryAlert[];
  total: number;
  page: number;
  page_size: number;
}

interface AlertRuleListResponse {
  rules: InventoryAlertRule[];
  total: number;
  page: number;
  page_size: number;
}

interface AlertRecordListResponse {
  records: InventoryAlertRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface AlertQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  alert_type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  warehouse_id?: string;
}

export const inventoryAlertApi = {
  listAlerts: async (params?: AlertQueryParams): Promise<ApiResponse<AlertListResponse>> => {
    return apiClient.wms.get('/alerts', { params });
  },

  getAlert: async (id: string): Promise<ApiResponse<InventoryAlert>> => {
    return apiClient.wms.get(`/alerts/${id}`);
  },

  acknowledgeAlert: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient.wms.post(`/alerts/${id}/acknowledge`, {});
  },

  getAlertStatistics: async (): Promise<ApiResponse<AlertStatistics>> => {
    return apiClient.wms.get('/alerts/statistics');
  },

  getAlertSummary: async (): Promise<ApiResponse<AlertSummary>> => {
    return apiClient.wms.get('/alerts/summary');
  },

  getAlertsByWarehouse: async (
    warehouseId?: string
  ): Promise<ApiResponse<{ alerts: InventoryAlert[]; total: number }>> => {
    const params = warehouseId ? { warehouse_id: warehouseId } : {};
    return apiClient.wms.get('/alerts/by-warehouse', { params });
  },

  listInventoryAlerts: async (
    params?: AlertQueryParams
  ): Promise<ApiResponse<AlertListResponse>> => {
    return apiClient.wms.get('/inventory-alerts', { params });
  },

  getInventoryAlertStatistics: async (): Promise<ApiResponse<AlertStatistics>> => {
    return apiClient.wms.get('/inventory-alerts/statistics');
  },

  getInventoryAlert: async (id: string): Promise<ApiResponse<InventoryAlert>> => {
    return apiClient.wms.get(`/inventory-alerts/${id}`);
  },

  acknowledgeInventoryAlert: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient.wms.post(`/inventory-alerts/${id}/acknowledge`, {});
  },

  listAlertRules: async (
    params?: AlertQueryParams
  ): Promise<ApiResponse<AlertRuleListResponse>> => {
    return apiClient.wms.get('/inventory-alerts/rules', { params });
  },

  createAlertRule: async (
    data: CreateAlertRuleRequest
  ): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.post('/inventory-alerts/rules', data);
  },

  getAlertRule: async (id: string): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.get(`/inventory-alerts/rules/${id}`);
  },

  updateAlertRule: async (
    id: string,
    data: UpdateAlertRuleRequest
  ): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.put(`/inventory-alerts/rules/${id}`, data);
  },

  deleteAlertRule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/inventory-alerts/rules/${id}`);
  },

  listAlertRecords: async (
    params?: AlertQueryParams
  ): Promise<ApiResponse<AlertRecordListResponse>> => {
    return apiClient.wms.get('/inventory-alerts/records', { params });
  },

  getAlertRecord: async (id: string): Promise<ApiResponse<InventoryAlertRecord>> => {
    return apiClient.wms.get(`/inventory-alerts/records/${id}`);
  },

  confirmAlertRecord: async (
    id: string
  ): Promise<ApiResponse<{ id: string; confirmed: boolean }>> => {
    return apiClient.wms.post(`/inventory-alerts/records/${id}/confirm`, {});
  },
};

export default inventoryAlertApi;
