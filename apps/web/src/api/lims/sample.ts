import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';
import { createCrudApi } from './utils';
import type {
  Sample,
  CreateSampleRequest,
  UpdateSampleRequest,
  LifecycleStage,
  LifecycleEvent,
  CreateLifecycleEventRequest,
  TransitionStageRequest,
  SampleTraceability,
  BatchCreateSamplesRequest,
  BatchDeleteSamplesRequest,
  BatchOperationResult,
  ListParams,
} from './types';

export const sampleApi = {
  ...createCrudApi<Sample>('/samples'),

  listSamples: (params?: ListParams) => createCrudApi<Sample>('/samples').list(params),

  getSample: (id: string) => createCrudApi<Sample>('/samples').get(id),

  createSample: (data: CreateSampleRequest) => createCrudApi<Sample>('/samples').create(data),

  updateSample: (id: string, data: UpdateSampleRequest) =>
    createCrudApi<Sample>('/samples').update(id, data),

  deleteSample: (id: string) => createCrudApi<Sample>('/samples').delete(id),

  batchCreateSamples: async (
    data: BatchCreateSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post('/samples/batch', data);
  },

  batchDeleteSamples: async (
    data: BatchDeleteSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete('/samples/batch', { data });
  },

  exportSamples: async (): Promise<Blob> => {
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, '/samples/export');
  },

  importSamples: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.lims.post('/samples/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  getSampleLifecycle: async (sampleId: string): Promise<ApiResponse<LifecycleEvent[]>> => {
    return apiClient.lims.get(`/samples/${sampleId}/lifecycle`);
  },

  recordLifecycleEvent: async (
    data: CreateLifecycleEventRequest
  ): Promise<ApiResponse<LifecycleEvent>> => {
    return apiClient.lims.post('/samples/lifecycle-event', data);
  },

  transitionSampleStage: async (
    sampleId: string,
    data: TransitionStageRequest
  ): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.post(`/samples/${sampleId}/transition-stage`, data);
  },

  getSampleTraceability: async (sampleId: string): Promise<ApiResponse<SampleTraceability>> => {
    return apiClient.lims.get(`/samples/${sampleId}/traceability`);
  },
};

export const lifecycleStageApi = {
  listLifecycleStages: async (params?: ListParams): Promise<ApiResponse<LifecycleStage[]>> => {
    return apiClient.lims.get('/lifecycle-stages', { params });
  },

  getLifecycleStage: async (id: string): Promise<ApiResponse<LifecycleStage>> => {
    return apiClient.lims.get(`/lifecycle-stages/${id}`);
  },
};
