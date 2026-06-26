import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  ProductionSchedule,
  CreateProductionScheduleRequest,
  UpdateProductionScheduleRequest,
  AdjustScheduleRequest,
  GanttData,
} from './types';

export const productionScheduleApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      schedules: ProductionSchedule[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/schedules${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.get(`/api/mes/schedules/${id}`);
  },

  async create(
    data: CreateProductionScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.post('/api/mes/schedules', data);
  },

  async update(
    id: string,
    data: UpdateProductionScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.put(`/api/mes/schedules/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/schedules/${id}`);
  },

  async adjust(
    id: string,
    data: AdjustScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.put(`/api/mes/schedules/${id}/adjust`, data);
  },

  async getGanttData(params?: {
    start_date?: string;
    end_date?: string;
    work_station_id?: string;
  }): Promise<ApiResponse<GanttData>> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.work_station_id) searchParams.set('work_station_id', params.work_station_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/schedules/gantt${queryString ? '?' + queryString : ''}`);
  },
};
