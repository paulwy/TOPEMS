/**
 * Mobile · 移动端巡检 (Inspection) API 绑定
 *
 * 路由:
 *   GET    /mobile/inspection/plans
 *   POST   /mobile/inspection/plans
 *   GET    /mobile/inspection/plans/{id}
 *   GET    /mobile/inspection/tasks
 *   POST   /mobile/inspection/tasks/{id}/start
 *   POST   /mobile/inspection/tasks/{id}/complete
 *   POST   /mobile/inspection/tasks/{id}/fail
 *   GET    /mobile/inspection/templates
 *   GET    /mobile/inspection/stats
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type InspectionStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type InspectionType = 'equipment' | 'safety' | 'quality' | 'environment' | 'fire_safety';

export interface InspectionPlan {
  id: string;
  tenant_id?: string;
  name: string;
  inspection_type: InspectionType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  template_id?: string;
  template_name?: string;
  locations: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  assignees: string[];
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InspectionTask {
  id: string;
  plan_id: string;
  plan_name: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  location: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  };
  assignee?: string;
  assignee_name?: string;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  checklist_items: Array<{
    id: string;
    description: string;
    type: 'text' | 'number' | 'boolean' | 'photo' | 'signature';
    value?: string | number | boolean;
    is_required: boolean;
    is_completed: boolean;
  }>;
  result?: 'pass' | 'fail' | 'partial';
  remarks?: string;
  photos?: string[];
  created_at: string;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  inspection_type: InspectionType;
  description?: string;
  checklist: Array<{
    id: string;
    description: string;
    type: 'text' | 'number' | 'boolean' | 'photo' | 'signature';
    default_value?: string | number | boolean;
    is_required: boolean;
    unit?: string;
  }>;
  is_active: boolean;
  created_at: string;
}

export interface InspectionStats {
  period: string;
  total_plans: number;
  active_plans: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
  pass_rate: number;
  avg_completion_time: number;
  by_type: Array<{
    type: InspectionType;
    tasks: number;
    pass_rate: number;
  }>;
  by_assignee: Array<{
    name: string;
    tasks: number;
    completed: number;
  }>;
}

export interface CreateInspectionPlanRequest {
  name: string;
  inspection_type: InspectionType;
  frequency: InspectionPlan['frequency'];
  template_id?: string;
  locations: InspectionPlan['locations'];
  assignees: string[];
  start_date: string;
  end_date?: string;
}

export const inspectionApi = {
  listTasks: async (params?: {
    status?: InspectionStatus;
    inspection_type?: InspectionType;
    assignee?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: InspectionTask[]; total: number }>> => {
    return apiClient.mobile.get('inspection/tasks', { params });
  },
};

export default inspectionApi;
