import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { TrainingPlan, TrainingCourse, TrainingRecord, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const trainingPlanApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingPlan>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-plans${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.get(`/api/hrm/training-plans/${id}`);
  },

  create: async (data: Partial<TrainingPlan>): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.post('/api/hrm/training-plans', data);
  },

  update: async (id: string, data: Partial<TrainingPlan>): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-plans/${id}`);
  },

  activate: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}/activate`);
  },

  deactivate: async (id: string): Promise<ApiResponse<TrainingPlan>> => {
    return apiClient.hrm.put(`/api/hrm/training-plans/${id}/deactivate`);
  },
};

export const trainingCourseApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingCourse>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-courses${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.get(`/api/hrm/training-courses/${id}`);
  },

  create: async (data: Partial<TrainingCourse>): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.post('/api/hrm/training-courses', data);
  },

  update: async (
    id: string,
    data: Partial<TrainingCourse>
  ): Promise<ApiResponse<TrainingCourse>> => {
    return apiClient.hrm.put(`/api/hrm/training-courses/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-courses/${id}`);
  },
};

export const trainingRecordApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<TrainingRecord>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/training-records${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.get(`/api/hrm/training-records/${id}`);
  },

  create: async (data: Partial<TrainingRecord>): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.post('/api/hrm/training-records', data);
  },

  update: async (
    id: string,
    data: Partial<TrainingRecord>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.put(`/api/hrm/training-records/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/training-records/${id}`);
  },

  enroll: async (course_id: string, employee_id: string): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.post('/api/hrm/training-records/enroll', {
      course_id,
      employee_id,
    });
  },

  complete: async (
    id: string,
    data: Partial<TrainingRecord>
  ): Promise<ApiResponse<TrainingRecord>> => {
    return apiClient.hrm.put(`/api/hrm/training-records/${id}/complete`, data);
  },
};

export default trainingPlanApi;
