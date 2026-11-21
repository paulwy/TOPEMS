import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import TrainingPage from '../TrainingPage';

// --- mock @/api/ehs（TrainingPage 顶层经 createCrudPageAdapter 使用 trainingApi.*）---
vi.mock('@/api/ehs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/ehs')>();
  return {
    ...actual,
    trainingApi: {
      ...actual.trainingApi,
      listTrainingPlans: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            { id: 'TP-1', plan_no: 'TP-001', title: '新员工安全培训', status: 'active' },
            { id: 'TP-2', plan_no: 'TP-002', title: '消防安全演练', status: 'active' },
          ],
          total: 2,
        },
      }),
      createTrainingPlan: vi.fn(),
      updateTrainingPlan: vi.fn(),
      deleteTrainingPlan: vi.fn(),
      listTrainingRecords: vi
        .fn()
        .mockResolvedValue({ success: true, code: 0, message: '', data: { items: [], total: 0 } }),
      createTrainingRecord: vi.fn(),
      updateTrainingRecord: vi.fn(),
      deleteTrainingRecord: vi.fn(),
      listTrainingCertificates: vi
        .fn()
        .mockResolvedValue({ success: true, code: 0, message: '', data: { items: [], total: 0 } }),
      createTrainingCertificate: vi.fn(),
      updateTrainingCertificate: vi.fn(),
      deleteTrainingCertificate: vi.fn(),
    },
  };
});

// --- mock i18n ---
vi.mock('@/i18n', () => {
  const keys: Record<string, string> = {
    'ehs.training.k85': '培训计划',
    'ehs.training.k86': '管理培训计划',
    'ehs.training_page.plan_2': '培训计划',
    'ehs.training_page.training_records': '培训记录',
    'ehs.training_page.training_certificates': '培训证书',
  };
  return { default: { t: (k: string) => keys[k] ?? k } };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/store', () => {
  const addNotification = vi.fn();
  return {
    useNotificationStore: (
      selector?: (s: { addNotification: typeof addNotification }) => unknown
    ) => (selector ? selector({ addNotification }) : { addNotification }),
  };
});

describe('TrainingPage（#22 补测 · ehs 域）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染 CrudPage（培训计划页签）并加载计划数据行', async () => {
    const { trainingApi } = await import('@/api/ehs');
    renderWithProviders(<TrainingPage />);
    // CrudPage 渲染（title=培训计划）
    await waitFor(() => {
      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(screen.getByText('培训计划')).toBeInTheDocument();
    });
    // adapter.list → trainingApi.listTrainingPlans 被调
    await waitFor(() => {
      expect(trainingApi.listTrainingPlans).toHaveBeenCalled();
    });
    // 行数据渲染（plan_no 单元格）
    await waitFor(() => {
      expect(screen.getByText('TP-001')).toBeInTheDocument();
      expect(screen.getByText('TP-002')).toBeInTheDocument();
    });
  });
});
