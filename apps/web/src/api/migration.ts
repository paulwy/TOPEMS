import apiClient from './client';
import type { ApiResponse } from './client';

export interface MigrationService {
  name: string;
  schema: string;
  port: number;
  description: string;
  tables: number;
}

export interface AppliedMigration {
  version: string;
  name: string;
  applied_at: string;
  duration_ms?: number;
}

export interface MigrationStatus {
  pending: string[];
  applied: AppliedMigration[];
}

export interface MigrationReport {
  file: string;
  success: boolean;
  message?: string;
}

export interface MigrationApplyResult {
  files: string[];
  reports: MigrationReport[];
}

export interface RollbackResult {
  record: MigrationReport;
}

const extractMessage = (err: unknown): string => {
  if (!err) return '未知错误';
  if (typeof err === 'string') return err;
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return (err as { response: { data: { message: string } } }).response.data.message;
  }
  return '请求失败，请稍后重试';
};

export const migrationApi = {
  async listServices(): Promise<MigrationService[]> {
    try {
      const res: ApiResponse<MigrationService[]> = await apiClient.migration.get(
        '/api/migrations/services'
      );
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error((res && res.message) || '获取服务列表失败');
    } catch (err: unknown) {
      throw new Error(extractMessage(err));
    }
  },

  async applyMigration(
    serviceName: string,
    type: 'schema' | 'index' | 'audit' = 'schema'
  ): Promise<MigrationApplyResult> {
    try {
      const res: ApiResponse<MigrationApplyResult> = await apiClient.migration.post(
        `/api/migrations/services/${encodeURIComponent(serviceName)}/apply`,
        { type }
      );
      if (res && res.success && res.data) {
        return res.data;
      }
      throw new Error((res && res.message) || `执行 ${serviceName} 迁移失败`);
    } catch (err: unknown) {
      throw new Error(extractMessage(err));
    }
  },

  async rollbackMigration(serviceName: string, version?: string): Promise<RollbackResult> {
    try {
      const res: ApiResponse<RollbackResult> = await apiClient.migration.post(
        `/api/migrations/services/${encodeURIComponent(serviceName)}/rollback`,
        { version }
      );
      if (res && res.success && res.data) {
        return res.data;
      }
      throw new Error((res && res.message) || `回滚 ${serviceName} 迁移失败`);
    } catch (err: unknown) {
      throw new Error(extractMessage(err));
    }
  },

  async getMigrationStatus(serviceName: string): Promise<MigrationStatus> {
    try {
      const res: ApiResponse<MigrationStatus> = await apiClient.migration.get(
        `/api/migrations/services/${encodeURIComponent(serviceName)}/status`
      );
      if (res && res.success && res.data) {
        return {
          pending: Array.isArray(res.data.pending) ? res.data.pending : [],
          applied: Array.isArray(res.data.applied) ? res.data.applied : [],
        };
      }
      throw new Error((res && res.message) || `获取 ${serviceName} 迁移状态失败`);
    } catch (err: unknown) {
      throw new Error(extractMessage(err));
    }
  },
};

export default migrationApi;
