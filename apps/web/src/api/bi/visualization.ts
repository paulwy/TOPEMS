import apiClient from '../client';
import type { DrillDownConfig, ChartLinkConfig } from './types';

export async function getDrillDownConfig(widgetId: string) {
  return await apiClient.bi.get(`/widgets/${widgetId}/drilldown`);
}

export async function updateDrillDownConfig(widgetId: string, config: DrillDownConfig) {
  return await apiClient.bi.put(`/widgets/${widgetId}/drilldown`, config);
}

export async function executeDrillDown(
  widgetId: string,
  level: number,
  filters?: Record<string, unknown>
) {
  return await apiClient.bi.post(`/widgets/${widgetId}/drilldown/execute`, {
    level,
    filters,
  });
}

export async function getChartLinkConfig(dashboardId: string) {
  return await apiClient.bi.get(`/dashboards/${dashboardId}/links`);
}

export async function updateChartLinkConfig(dashboardId: string, config: ChartLinkConfig) {
  return await apiClient.bi.put(`/dashboards/${dashboardId}/links`, config);
}

export async function getChartAnnotations(widgetId: string) {
  return await apiClient.bi.get(`/widgets/${widgetId}/annotations`);
}

export async function createChartAnnotation(
  widgetId: string,
  data: {
    type: string;
    position: Record<string, number>;
    content: string;
    color?: string;
  }
) {
  return await apiClient.bi.post(`/widgets/${widgetId}/annotations`, data);
}

export async function deleteChartAnnotation(annotationId: string) {
  return await apiClient.bi.delete(`/annotations/${annotationId}`);
}

export async function exportChart(widgetId: string, format: 'png' | 'svg' | 'pdf') {
  return await apiClient.bi.post(`/widgets/${widgetId}/export`, { format });
}

export async function getFullscreenChart(widgetId: string) {
  return await apiClient.bi.get(`/widgets/${widgetId}/fullscreen`);
}

// ── v74 to_bind 补绑（2026-10-29）──
export async function generateGaugeChart(data: Record<string, unknown>) {
  return await apiClient.bi.post('/visualization/gauge', data);
}

export async function createDrilldownPath(data: Record<string, unknown>) {
  return await apiClient.bi.post('/drilldown/path', data);
}

export async function getDrilldownPath(id: string) {
  return await apiClient.bi.get(`/drilldown/path/${id}`);
}

export async function updateDrilldownPath(id: string, data: Record<string, unknown>) {
  return await apiClient.bi.put(`/drilldown/path/${id}`, data);
}

export async function deleteDrilldownPath(id: string) {
  return await apiClient.bi.delete(`/drilldown/path/${id}`);
}

export async function rollUp(data: Record<string, unknown>) {
  return await apiClient.bi.post('/drilldown/roll-up', data);
}

// ── v74 to_bind 补绑（2026-10-29，P2）──
export async function listVisualizations() {
  return await apiClient.bi.get('/visualization');
}

export async function createVisualization(data: Record<string, unknown>) {
  return await apiClient.bi.post('/visualization', data);
}
