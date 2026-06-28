import apiClient from '../client';
import type { DrillDownConfig, ChartLinkConfig } from './types';

export async function getDrillDownConfig(widgetId: string) {
  return await apiClient.bi.get(`/api/bi/widgets/${widgetId}/drilldown`);
}

export async function updateDrillDownConfig(widgetId: string, config: DrillDownConfig) {
  return await apiClient.bi.put(`/api/bi/widgets/${widgetId}/drilldown`, config);
}

export async function executeDrillDown(widgetId: string, level: number, filters?: Record<string, unknown>) {
  return await apiClient.bi.post(`/api/bi/widgets/${widgetId}/drilldown/execute`, {
    level,
    filters,
  });
}

export async function getChartLinkConfig(dashboardId: string) {
  return await apiClient.bi.get(`/api/bi/dashboards/${dashboardId}/links`);
}

export async function updateChartLinkConfig(dashboardId: string, config: ChartLinkConfig) {
  return await apiClient.bi.put(`/api/bi/dashboards/${dashboardId}/links`, config);
}

export async function getChartAnnotations(widgetId: string) {
  return await apiClient.bi.get(`/api/bi/widgets/${widgetId}/annotations`);
}

export async function createChartAnnotation(widgetId: string, data: {
  type: string;
  position: Record<string, number>;
  content: string;
  color?: string;
}) {
  return await apiClient.bi.post(`/api/bi/widgets/${widgetId}/annotations`, data);
}

export async function deleteChartAnnotation(annotationId: string) {
  return await apiClient.bi.delete(`/api/bi/annotations/${annotationId}`);
}

export async function exportChart(widgetId: string, format: 'png' | 'svg' | 'pdf') {
  return await apiClient.bi.post(`/api/bi/widgets/${widgetId}/export`, { format });
}

export async function getFullscreenChart(widgetId: string) {
  return await apiClient.bi.get(`/api/bi/widgets/${widgetId}/fullscreen`);
}
