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
  ...createCrudApi<Sample>('/api/lims/samples'),

  listSamples: (params?: ListParams) => createCrudApi<Sample>('/api/lims/samples').list(params),

  getSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').get(id),

  createSample: (data: CreateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').create(data),

  updateSample: (id: string, data: UpdateSampleRequest) =>
    createCrudApi<Sample>('/api/lims/samples').update(id, data),

  deleteSample: (id: string) => createCrudApi<Sample>('/api/lims/samples').delete(id),

  batchCreateSamples: async (
    data: BatchCreateSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.post('/api/lims/samples/batch', data);
  },

  batchDeleteSamples: async (
    data: BatchDeleteSamplesRequest
  ): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.lims.delete('/api/lims/samples/batch', { data });
  },

  exportSamples: async (): Promise<Blob> => {
    const baseURL = (apiClient.lims as any).defaults?.baseURL || config.services.lims;
    return downloadBlob(baseURL, '/api/lims/samples/export');
  },

  importSamples: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.lims.post('/api/lims/samples/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  getSampleLifecycle: async (sampleId: string): Promise<ApiResponse<LifecycleEvent[]>> => {
    return apiClient.lims.get(`/api/lims/samples/${sampleId}/lifecycle`);
  },

  recordLifecycleEvent: async (
    data: CreateLifecycleEventRequest
  ): Promise<ApiResponse<LifecycleEvent>> => {
    return apiClient.lims.post('/api/lims/samples/lifecycle-event', data);
  },

  transitionSampleStage: async (
    sampleId: string,
    data: TransitionStageRequest
  ): Promise<ApiResponse<Sample>> => {
    return apiClient.lims.post(`/api/lims/samples/${sampleId}/transition-stage`, data);
  },

  getSampleTraceability: async (sampleId: string): Promise<ApiResponse<SampleTraceability>> => {
    return apiClient.lims.get(`/api/lims/samples/${sampleId}/traceability`);
  },
};

export const lifecycleStageApi = {
  listLifecycleStages: async (params?: ListParams): Promise<ApiResponse<LifecycleStage[]>> => {
    return apiClient.lims.get('/api/lims/lifecycle-stages', { params });
  },

  getLifecycleStage: async (id: string): Promise<ApiResponse<LifecycleStage>> => {
    return apiClient.lims.get(`/api/lims/lifecycle-stages/${id}`);
  },
};
