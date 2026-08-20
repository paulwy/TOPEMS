/**
 * Mobile · 设备管理 API 绑定
 *
 * 后端: svc/mobile/src/modules/device.rs
 * 路由（已注册 main.rs）:
 *   POST   /devices/register
 *   PUT    /devices/token
 * 扩展路由（预留）:
 *   GET    /devices
 *   GET    /devices/{id}
 *   DELETE /devices/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'watch';
type OsType = 'ios' | 'android' | 'windows' | 'macos' | 'linux';

export interface DeviceInfo {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  os_type: OsType;
  os_version: string;
  app_version: string;
  push_token?: string;
  is_active: boolean;
  last_login_at: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterDeviceRequest {
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  os_type: OsType;
  os_version: string;
  app_version: string;
  push_token?: string;
}

interface UpdatePushTokenRequest {
  device_id: string;
  push_token: string;
}

export const deviceApi = {
  registerDevice: async (data: RegisterDeviceRequest): Promise<ApiResponse<void>> => {
    return apiClient.mobile.post('/devices/register', data);
  },

  updatePushToken: async (data: UpdatePushTokenRequest): Promise<ApiResponse<void>> => {
    return apiClient.mobile.put('/devices/token', data);
  },

  listDevices: async (): Promise<ApiResponse<DeviceInfo[]>> => {
    return apiClient.mobile.get('/devices');
  },

  getDevice: async (id: string): Promise<ApiResponse<DeviceInfo>> => {
    return apiClient.mobile.get(`/devices/${id}`);
  },

  deactivateDevice: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.delete(`/devices/${id}`);
  },
};

export default deviceApi;
