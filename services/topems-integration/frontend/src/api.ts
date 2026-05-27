import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8018';
const API_BASE = `${API_BASE_URL}/api/v1/integration`;

export interface SyncStats {
  lims_qms_total: number;
  lims_qms_synced: number;
  lims_qms_failed: number;
  mes_erp_total: number;
  mes_erp_synced: number;
  mes_erp_failed: number;
  wms_scm_total: number;
  wms_scm_synced: number;
  wms_scm_failed: number;
  last_sync: string | null;
}

export interface LimsQmsSync {
  id: string;
  lims_sample_id: string;
  qms_inspection_id: string | null;
  sample_name: string;
  inspection_result: string | null;
  inspection_notes: string | null;
  synced: boolean;
  sync_status: string;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MesErpSync {
  id: string;
  mes_order_id: string;
  erp_order_id: string | null;
  order_number: string;
  product_name: string | null;
  quantity: number | null;
  synced: boolean;
  sync_status: string;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WmsScmSync {
  id: string;
  wms_inventory_id: string;
  scm_supply_id: string | null;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  synced: boolean;
  sync_status: string;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEvent {
  id: string;
  source_system: string;
  target_system: string;
  event_type: string;
  source_record_id: string | null;
  target_record_id: string | null;
  payload: any;
  status: string;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSyncStats = async (): Promise<SyncStats> => {
  const response = await api.get<ApiResponse<SyncStats>>('/stats');
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const getLimsQmsSyncs = async (): Promise<LimsQmsSync[]> => {
  const response = await api.get<ApiResponse<LimsQmsSync[]>>('/lims-qms');
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const createLimsQmsSync = async (data: {
  lims_sample_id: string;
  sample_name: string;
  inspection_result?: string;
  inspection_notes?: string;
}): Promise<LimsQmsSync> => {
  const response = await api.post<ApiResponse<LimsQmsSync>>('/lims-qms', data);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const syncLimsQms = async (id: string): Promise<LimsQmsSync> => {
  const response = await api.post<ApiResponse<LimsQmsSync>>(`/lims-qms/${id}/sync`);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const getMesErpSyncs = async (): Promise<MesErpSync[]> => {
  const response = await api.get<ApiResponse<MesErpSync[]>>('/mes-erp');
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const createMesErpSync = async (data: {
  mes_order_id: string;
  order_number: string;
  product_name?: string;
  quantity?: number;
}): Promise<MesErpSync> => {
  const response = await api.post<ApiResponse<MesErpSync>>('/mes-erp', data);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const syncMesErp = async (id: string): Promise<MesErpSync> => {
  const response = await api.post<ApiResponse<MesErpSync>>(`/mes-erp/${id}/sync`);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const getWmsScmSyncs = async (): Promise<WmsScmSync[]> => {
  const response = await api.get<ApiResponse<WmsScmSync[]>>('/wms-scm');
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const createWmsScmSync = async (data: {
  wms_inventory_id: string;
  item_name: string;
  quantity?: number;
  unit?: string;
}): Promise<WmsScmSync> => {
  const response = await api.post<ApiResponse<WmsScmSync>>('/wms-scm', data);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const syncWmsScm = async (id: string): Promise<WmsScmSync> => {
  const response = await api.post<ApiResponse<WmsScmSync>>(`/wms-scm/${id}/sync`);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const getEvents = async (): Promise<IntegrationEvent[]> => {
  const response = await api.get<ApiResponse<IntegrationEvent[]>>('/events');
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const createEvent = async (data: {
  source_system: string;
  target_system: string;
  event_type: string;
  source_record_id?: string;
  payload?: any;
}): Promise<IntegrationEvent> => {
  const response = await api.post<ApiResponse<IntegrationEvent>>('/events', data);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};

export const checkHealth = async (): Promise<string> => {
  const response = await axios.get(`${API_BASE_URL}/health`);
  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  return response.data.data!;
};
