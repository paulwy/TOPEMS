import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';
import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialQueryParams,
  BatchOperationResult,
} from './types';

export const materialApi = {
  listMaterials: async (
    params?: MaterialQueryParams
  ): Promise<
    ApiResponse<{
      materials: Material[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/materials?${queryParams}` : '/materials';
    return apiClient.erp.get(url);
  },

  getMaterial: async (id: string): Promise<ApiResponse<Material>> => {
    return apiClient.erp.get(`/materials/${id}`);
  },

  createMaterial: async (data: CreateMaterialRequest): Promise<ApiResponse<Material>> => {
    return apiClient.erp.post('/materials', data);
  },

  updateMaterial: async (
    id: string,
    data: UpdateMaterialRequest
  ): Promise<ApiResponse<Material>> => {
    return apiClient.erp.put(`/materials/${id}`, data);
  },

  deleteMaterial: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/materials/${id}`);
  },

  batchDeleteMaterials: async (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    // erp 无 /materials/batch 路由：前端循环单条删除（页面当前未调用此方法）
    let failed = 0;
    for (const id of ids) {
      try {
        await apiClient.erp.delete(`/materials/${id}`);
      } catch {
        failed += 1;
      }
    }
    return {
      code: 0,
      message: `batch delete done, failed=${failed}`,
      data: { succeeded: ids.length - failed, failed },
    } as unknown as ApiResponse<BatchOperationResult>;
  },

  importMaterials: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    // CSV 列约定（首行表头）：code,name,specification,unit,category,brand,model,barcode
    // 后端 erp POST /materials/import 接收 JSON 数组批量创建
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = lines.slice(1).map((line) => {
      const [code, name, specification, unit, category, brand, model, barcode] = line
        .split(',')
        .map((c) => c.trim());
      return {
        code: code || '',
        name: name || '',
        specification: specification || null,
        unit: unit || null,
        category: category || null,
        brand: brand || null,
        model: model || null,
        barcode: barcode || null,
      };
    });
    return apiClient.erp.post('/materials/import', rows, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  exportMaterials: async (): Promise<Blob> => {
    const baseURL = config.services.erp; // @deprecated 页面未用，erp 无 /materials/export 路由
    return downloadBlob(baseURL, '/materials/export');
  },
};
