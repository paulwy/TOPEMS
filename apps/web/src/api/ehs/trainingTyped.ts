/**
 * V72.5 第三批 类型安全 API 绑定 — EHS Training (Plans / Records / Certificates)
 *
 * 基于 OpenAPI 生成类型，使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式。
 * 绑定三个子资源：
 *   - Training Plans:    list_training_plans / create_training_plan / get_training_plan /
 *                        update_training_plan / delete_training_plan
 *   - Training Records:  list_training_records / create_training_record / get_training_record /
 *                        update_training_record / delete_training_record
 *   - Training Certificates: list_certificates / create_certificate / get_certificate /
 *                            update_certificate / delete_certificate
 *
 * 路径映射说明：
 *   前端 apiClient.ehs.get('/training/plans')     → OpenAPI GET /api/ehs/training/plans
 *   前端 apiClient.ehs.get('/training/records')   → OpenAPI GET /api/ehs/training/records
 *   前端 apiClient.ehs.get('/training/certificates') → OpenAPI GET /api/ehs/training/certificates
 *
 * 使用方式：
 *   import { trainingTypedApi } from './trainingTyped';
 *   const res = await trainingTypedApi.listPlans({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type {
  TrainingPlan,
  TrainingRecord,
  TrainingCertificate,
  CreateTrainingPlanRequest,
  UpdateTrainingPlanRequest,
  CreateTrainingRecordRequest,
  UpdateTrainingRecordRequest,
  CreateTrainingCertificateRequest,
  UpdateTrainingCertificateRequest,
  TrainingPlanListQueryParams,
  TrainingRecordListQueryParams,
  TrainingCertificateListQueryParams,
} from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

// ==================== Training Plans ====================

export const trainingPlanTypedApi = {
  /** list_training_plans operation（openapi: GET /api/ehs/training/plans） */
  list: async (
    params?: AdaptedQuery<'list_training_plans'> | TrainingPlanListQueryParams
  ): Promise<TypedPaginatedResponse<TrainingPlan>> => {
    return apiClient.ehs.get('/training/plans', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /** get_training_plan operation（openapi: GET /api/ehs/training/plans/{id}） */
  get: async (id: string): Promise<TypedApiResponse<TrainingPlan, 'get_training_plan'>> => {
    return apiClient.ehs.get(`/training/plans/${id}`);
  },

  /** create_training_plan operation（openapi: POST /api/ehs/training/plans） */
  create: async (
    data: AdaptedRequestBody<'create_training_plan'> | CreateTrainingPlanRequest
  ): Promise<TypedApiResponse<TrainingPlan, 'create_training_plan'>> => {
    return apiClient.ehs.post(
      '/training/plans',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** update_training_plan operation（openapi: PUT /api/ehs/training/plans/{id}） */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_training_plan'> | Partial<UpdateTrainingPlanRequest>
  ): Promise<TypedApiResponse<TrainingPlan, 'update_training_plan'>> => {
    return apiClient.ehs.put(
      `/training/plans/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** delete_training_plan operation（openapi: DELETE /api/ehs/training/plans/{id}） */
  delete: async (id: string): Promise<TypedApiResponse<void, 'delete_training_plan'>> => {
    return apiClient.ehs.delete(`/training/plans/${id}`);
  },
};

// ==================== Training Records ====================

export const trainingRecordTypedApi = {
  /** list_training_records operation（openapi: GET /api/ehs/training/records） */
  list: async (
    params?: AdaptedQuery<'list_training_records'> | TrainingRecordListQueryParams
  ): Promise<TypedPaginatedResponse<TrainingRecord>> => {
    return apiClient.ehs.get('/training/records', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /** get_training_record operation（openapi: GET /api/ehs/training/records/{id}） */
  get: async (id: string): Promise<TypedApiResponse<TrainingRecord, 'get_training_record'>> => {
    return apiClient.ehs.get(`/training/records/${id}`);
  },

  /** create_training_record operation（openapi: POST /api/ehs/training/records） */
  create: async (
    data: AdaptedRequestBody<'create_training_record'> | CreateTrainingRecordRequest
  ): Promise<TypedApiResponse<TrainingRecord, 'create_training_record'>> => {
    return apiClient.ehs.post(
      '/training/records',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** update_training_record operation（openapi: PUT /api/ehs/training/records/{id}） */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_training_record'> | Partial<UpdateTrainingRecordRequest>
  ): Promise<TypedApiResponse<TrainingRecord, 'update_training_record'>> => {
    return apiClient.ehs.put(
      `/training/records/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** delete_training_record operation（openapi: DELETE /api/ehs/training/records/{id}） */
  delete: async (id: string): Promise<TypedApiResponse<void, 'delete_training_record'>> => {
    return apiClient.ehs.delete(`/training/records/${id}`);
  },
};

// ==================== Training Certificates ====================

export const trainingCertificateTypedApi = {
  /** list_certificates operation（openapi: GET /api/ehs/training/certificates） */
  list: async (
    params?: AdaptedQuery<'list_certificates'> | TrainingCertificateListQueryParams
  ): Promise<TypedPaginatedResponse<TrainingCertificate>> => {
    return apiClient.ehs.get('/training/certificates', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /** get_certificate operation（openapi: GET /api/ehs/training/certificates/{id}） */
  get: async (id: string): Promise<TypedApiResponse<TrainingCertificate, 'get_certificate'>> => {
    return apiClient.ehs.get(`/training/certificates/${id}`);
  },

  /** create_certificate operation（openapi: POST /api/ehs/training/certificates） */
  create: async (
    data: AdaptedRequestBody<'create_certificate'> | CreateTrainingCertificateRequest
  ): Promise<TypedApiResponse<TrainingCertificate, 'create_certificate'>> => {
    return apiClient.ehs.post(
      '/training/certificates',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** update_certificate operation（openapi: PUT /api/ehs/training/certificates/{id}） */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_certificate'> | Partial<UpdateTrainingCertificateRequest>
  ): Promise<TypedApiResponse<TrainingCertificate, 'update_certificate'>> => {
    return apiClient.ehs.put(
      `/training/certificates/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /** delete_certificate operation（openapi: DELETE /api/ehs/training/certificates/{id}） */
  delete: async (id: string): Promise<TypedApiResponse<void, 'delete_certificate'>> => {
    return apiClient.ehs.delete(`/training/certificates/${id}`);
  },
};

// ==================== Aggregate Export ====================

export const trainingTypedApi = {
  plans: trainingPlanTypedApi,
  records: trainingRecordTypedApi,
  certificates: trainingCertificateTypedApi,
};

export default trainingTypedApi;
