import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateEnvironmentMonitorRecordRequest,
  CreateEnvironmentMonitorRequest,
  EnvironmentIndicator,
  EnvironmentMonitor,
  EnvironmentMonitorListQueryParams,
  EnvironmentMonitorRecord,
  EnvironmentMonitorRecordListQueryParams,
  ListQueryParams,
  PaginatedResponse,
  UpdateEnvironmentMonitorRequest,
} from './types';

export const environmentApi = {
  listEnvironmentMonitors: async (
    params?: EnvironmentMonitorListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentMonitor>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.monitor_type) queryParams.append('monitor_type', params.monitor_type);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentMonitor>>(
      `/environment/monitors?${queryParams.toString()}`
    );
  },

  getEnvironmentMonitor: async (id: string): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.get<EnvironmentMonitor>(`/environment/monitors/${id}`);
  },

  createEnvironmentMonitor: async (
    data: CreateEnvironmentMonitorRequest
  ): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.post<EnvironmentMonitor>('/environment/monitors', data);
  },

  updateEnvironmentMonitor: async (
    id: string,
    data: Partial<UpdateEnvironmentMonitorRequest>
  ): Promise<ApiResponse<EnvironmentMonitor>> => {
    return apiClient.ehs.put<EnvironmentMonitor>(`/environment/monitors/${id}`, data);
  },

  deleteEnvironmentMonitor: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/environment/monitors/${id}`);
  },

  listEnvironmentIndicators: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentIndicator>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentIndicator>>(
      `/environment/indicators?${queryParams.toString()}`
    );
  },

  listEnvironmentMonitorRecords: async (
    params?: EnvironmentMonitorRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EnvironmentMonitorRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.monitor_id) queryParams.append('monitor_id', params.monitor_id);
    if (params?.monitor_type) queryParams.append('monitor_type', params.monitor_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<EnvironmentMonitorRecord>>(
      `/environment/records?${queryParams.toString()}`
    );
  },

  getEnvironmentMonitorRecord: async (
    id: string
  ): Promise<ApiResponse<EnvironmentMonitorRecord>> => {
    return apiClient.ehs.get<EnvironmentMonitorRecord>(`/environment/records/${id}`);
  },

  createEnvironmentMonitorRecord: async (
    data: CreateEnvironmentMonitorRecordRequest
  ): Promise<ApiResponse<EnvironmentMonitorRecord>> => {
    return apiClient.ehs.post<EnvironmentMonitorRecord>('/environment/records', data);
  },
};

export default environmentApi;
