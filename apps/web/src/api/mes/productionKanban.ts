import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { ProductionKanbanData } from './types';

export const productionKanbanApi = {
  async getDashboard(): Promise<ApiResponse<ProductionKanbanData>> {
    return apiClient.mes.get('/api/mes/kanban/dashboard');
  },

  async getOrderProgress(params?: { date?: string }): Promise<
    ApiResponse<
      Array<{
        order_id: string;
        order_number: string;
        product_name: string;
        planned_quantity: number;
        completed_quantity: number;
        progress: number;
        status: string;
      }>
    >
  > {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/mes/kanban/order-progress${queryString ? `?${queryString}` : ''}`
    );
  },

  async getWorkstationStatus(): Promise<
    ApiResponse<
      Array<{
        work_station_id: string;
        work_station_name: string;
        status: string;
        current_order?: string;
        current_product?: string;
        output_today?: number;
        operator?: string;
      }>
    >
  > {
    return apiClient.mes.get('/api/mes/kanban/workstation-status');
  },

  async getQualityTrend(params?: { days?: number }): Promise<
    ApiResponse<
      Array<{
        date: string;
        pass_rate: number;
        total_quantity: number;
        good_quantity: number;
      }>
    >
  > {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set('days', params.days.toString());
    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/mes/kanban/quality-trend${queryString ? `?${queryString}` : ''}`
    );
  },

  async getEquipmentStatus(): Promise<
    ApiResponse<
      Array<{
        equipment_id: string;
        equipment_name: string;
        equipment_code: string;
        status: string;
        oee?: number;
      }>
    >
  > {
    return apiClient.mes.get('/api/mes/kanban/equipment-status');
  },
};
