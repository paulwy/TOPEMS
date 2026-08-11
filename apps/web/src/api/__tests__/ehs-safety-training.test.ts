import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockEhsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { ehs: mockEhsClient },
    default: { ehs: mockEhsClient },
  };
});

describe('EHS Safety Training API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safetyTrainingApi - 培训课程管理', () => {
    it('listTrainings should call GET with all params', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await safetyTrainingApi.listTrainings({
        page: 1,
        page_size: 10,
        status: 'scheduled',
        training_type: 'safety',
        trainer: '张三',
        keyword: '消防',
      });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/training?page=1&page_size=10&status=scheduled&training_type=safety&trainer=%E5%BC%A0%E4%B8%89&q=%E6%B6%88%E9%98%B2'
      );
    });

    it('listTrainings should call GET without params', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await safetyTrainingApi.listTrainings();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training');
    });

    it('getTraining should call GET /training/:id', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await safetyTrainingApi.getTraining('trn-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training/trn-001');
    });

    it('createTraining should call POST with data', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '消防安全培训', training_type: 'safety', duration_hours: 4 };
      await safetyTrainingApi.createTraining(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/training', data);
    });

    it('updateTraining should call PUT /training/:id', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '更新培训', status: 'completed' };
      await safetyTrainingApi.updateTraining('trn-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/training/trn-001', data);
    });

    it('deleteTraining should call DELETE /training/:id', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await safetyTrainingApi.deleteTraining('trn-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/training/trn-001');
    });

    it('getTrainingStatistics should call GET /training/statistics', async () => {
      const { safetyTrainingApi } = await import('../ehs/safetyTraining');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await safetyTrainingApi.getTrainingStatistics();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training/statistics');
    });
  });
});
