import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from './types';

// ===== 类型定义 =====

export interface DrillPlan {
  id: string;
  plan_no: string;
  title: string;
  description?: string;
  drill_type: string;
  plan_date?: string;
  location?: string;
  participants?: number;
  estimated_duration?: number;
  content?: string;
  organizer?: string;
  status: string;
  related_plan_id?: string;
  created_at?: string;
  updated_at?: string;
  tenant_id?: string;
}

export interface DrillRecord {
  id: string;
  record_no: string;
  plan_id?: string;
  title: string;
  drill_type: string;
  location: string;
  started_at?: string;
  ended_at?: string;
  duration?: number;
  participants?: number;
  participant_list?: string[];
  content?: string;
  actual_content?: string;
  organizer?: string;
  recorder?: string;
  status: string;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
  tenant_id?: string;
}

export interface DrillEvaluation {
  id: string;
  drill_id: string;
  evaluator?: string;
  overall_score?: number;
  overall_comment?: string;
  objectives_met?: boolean;
  response_time_score?: number;
  coordination_score?: number;
  procedure_score?: number;
  equipment_score?: number;
  evaluated_at?: string;
  created_at?: string;
  tenant_id?: string;
}

export interface DrillProblem {
  id: string;
  drill_id: string;
  description: string;
  category?: string;
  severity?: string;
  responsible_person?: string;
  deadline?: string;
  status: string;
  rectification_measures?: string;
  rectified_at?: string;
  verifier?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
  tenant_id?: string;
}

export interface DrillDetail {
  record: DrillRecord;
  evaluation?: DrillEvaluation;
  problems: DrillProblem[];
}

export interface DrillStatistics {
  total_drills: number;
  planned_count: number;
  completed_count: number;
  average_score?: number;
  by_type: Array<{ type: string; name: string; count: number }>;
  by_month: Array<{ month: string; count: number }>;
  problem_count: number;
  rectified_count: number;
  participant_count: number;
  tenant_id?: string;
}

export interface DrillType {
  code: string;
  name: string;
}

export interface DrillPlanListQuery {
  page?: number;
  pagesize?: number;
  status?: string;
  drill_type?: string;
  year?: number;
  keyword?: string;
}

export interface DrillRecordListQuery {
  page?: number;
  pagesize?: number;
  status?: string;
  drill_type?: string;
  plan_id?: string;
  keyword?: string;
}

interface CreateDrillPlanRequest {
  title: string;
  description?: string;
  drill_type: string;
  plan_date?: string;
  location?: string;
  participants?: number;
  estimated_duration?: number;
  content?: string;
  organizer?: string;
  related_plan_id?: string;
}

export interface UpdateDrillPlanRequest {
  title?: string;
  description?: string;
  drill_type?: string;
  plan_date?: string;
  location?: string;
  participants?: number;
  estimated_duration?: number;
  content?: string;
  organizer?: string;
  status?: string;
}

export interface CreateDrillRecordRequest {
  plan_id?: string;
  title: string;
  drill_type: string;
  location: string;
  started_at?: string;
  ended_at?: string;
  participants?: number;
  participant_list?: string[];
  actual_content?: string;
  organizer?: string;
  recorder?: string;
}

export interface UpdateDrillRecordRequest {
  title?: string;
  drill_type?: string;
  location?: string;
  started_at?: string;
  ended_at?: string;
  participants?: number;
  participant_list?: string[];
  actual_content?: string;
  organizer?: string;
  recorder?: string;
  status?: string;
}

interface CreateDrillEvaluationRequest {
  evaluator?: string;
  overall_score?: number;
  overall_comment?: string;
  objectives_met?: boolean;
  response_time_score?: number;
  coordination_score?: number;
  procedure_score?: number;
  equipment_score?: number;
}

interface CreateDrillProblemRequest {
  description: string;
  category?: string;
  severity?: string;
  responsible_person?: string;
  deadline?: string;
  rectification_measures?: string;
}

export interface UpdateDrillProblemRequest {
  description?: string;
  category?: string;
  severity?: string;
  responsible_person?: string;
  deadline?: string;
  status?: string;
  rectification_measures?: string;
  verifier?: string;
}

// ===== API 绑定 =====

export const emergencyDrillApi = {
  // ===== 演练计划管理 =====

  async listDrillPlans(
    params?: DrillPlanListQuery
  ): Promise<ApiResponse<PaginatedResponse<DrillPlan>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.status) qs.set('status', params.status);
    if (params?.drill_type) qs.set('drill_type', params.drill_type);
    if (params?.year !== undefined) qs.set('year', String(params.year));
    if (params?.keyword) qs.set('q', params.keyword);
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<DrillPlan>>(`/drills/plans${s ? `?${s}` : ''}`);
  },

  async getDrillPlan(id: string): Promise<ApiResponse<DrillPlan>> {
    return apiClient.ehs.get<DrillPlan>(`/drills/plans/${id}`);
  },

  async createDrillPlan(data: CreateDrillPlanRequest): Promise<ApiResponse<DrillPlan>> {
    return apiClient.ehs.post<DrillPlan>('/drills/plans', data);
  },

  async updateDrillPlan(id: string, data: UpdateDrillPlanRequest): Promise<ApiResponse<DrillPlan>> {
    return apiClient.ehs.put<DrillPlan>(`/drills/plans/${id}`, data);
  },

  async deleteDrillPlan(id: string): Promise<ApiResponse<void>> {
    return apiClient.ehs.delete<void>(`/drills/plans/${id}`);
  },

  // ===== 演练记录管理 =====

  async listDrillRecords(
    params?: DrillRecordListQuery
  ): Promise<ApiResponse<PaginatedResponse<DrillRecord>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.status) qs.set('status', params.status);
    if (params?.drill_type) qs.set('drill_type', params.drill_type);
    if (params?.plan_id) qs.set('plan_id', params.plan_id);
    if (params?.keyword) qs.set('q', params.keyword);
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<DrillRecord>>(`/drills/records${s ? `?${s}` : ''}`);
  },

  async getDrillRecord(id: string): Promise<ApiResponse<DrillDetail>> {
    return apiClient.ehs.get<DrillDetail>(`/drills/records/${id}`);
  },

  async createDrillRecord(data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> {
    return apiClient.ehs.post<DrillRecord>('/drills/records', data);
  },

  async updateDrillRecord(
    id: string,
    data: UpdateDrillRecordRequest
  ): Promise<ApiResponse<DrillRecord>> {
    return apiClient.ehs.put<DrillRecord>(`/drills/records/${id}`, data);
  },

  async deleteDrillRecord(id: string): Promise<ApiResponse<void>> {
    return apiClient.ehs.delete<void>(`/drills/records/${id}`);
  },

  // ===== 演练评估 =====

  async createDrillEvaluation(
    drillId: string,
    data: CreateDrillEvaluationRequest
  ): Promise<ApiResponse<DrillEvaluation>> {
    return apiClient.ehs.post<DrillEvaluation>(`/drills/records/${drillId}/evaluation`, data);
  },

  // ===== 演练问题 =====

  async listDrillProblems(drillId: string): Promise<ApiResponse<DrillProblem[]>> {
    return apiClient.ehs.get<DrillProblem[]>(`/drills/records/${drillId}/problems`);
  },

  async createDrillProblem(
    drillId: string,
    data: CreateDrillProblemRequest
  ): Promise<ApiResponse<DrillProblem>> {
    return apiClient.ehs.post<DrillProblem>(`/drills/records/${drillId}/problems`, data);
  },

  async updateDrillProblem(
    drillId: string,
    problemId: string,
    data: UpdateDrillProblemRequest
  ): Promise<ApiResponse<DrillProblem>> {
    return apiClient.ehs.put<DrillProblem>(
      `/drills/records/${drillId}/problems/${problemId}`,
      data
    );
  },

  // ===== 演练类型 =====

  async listDrillTypes(): Promise<ApiResponse<DrillType[]>> {
    return apiClient.ehs.get<DrillType[]>('/drills/types');
  },

  // ===== 演练统计 =====

  async getDrillStatistics(): Promise<ApiResponse<DrillStatistics>> {
    return apiClient.ehs.get<DrillStatistics>('/drills/statistics');
  },
};

export default emergencyDrillApi;
