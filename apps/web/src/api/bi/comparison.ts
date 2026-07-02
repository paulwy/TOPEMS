import apiClient from '../client';
import type { ComparisonAnalysis } from './types';

export async function listComparisons(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  return await apiClient.bi.get('/comparison-analysis', { params });
}

export async function getComparison(id: string) {
  return await apiClient.bi.get(`/comparison-analysis/${id}`);
}

export async function createComparison(data: Partial<ComparisonAnalysis>) {
  return await apiClient.bi.post('/comparison-analysis', data);
}

export async function updateComparison(id: string, data: Partial<ComparisonAnalysis>) {
  return await apiClient.bi.put(`/comparison-analysis/${id}`, data);
}

export async function deleteComparison(id: string) {
  return await apiClient.bi.delete(`/comparison-analysis/${id}`);
}

export async function runComparison(id: string) {
  return await apiClient.bi.post(`/comparison-analysis/${id}/run`);
}

export async function getComparisonResult(id: string) {
  return await apiClient.bi.get(`/comparison-analysis/${id}/result`);
}
