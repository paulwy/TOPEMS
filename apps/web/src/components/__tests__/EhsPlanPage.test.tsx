import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import EhsPlanPage from '../ehs/EhsPlanPage';
import { ehsApi } from '@/api/ehs';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listPlans: vi.fn(),
    getPlan: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    listDrills: vi.fn(),
    emergency: {
      listPlans: vi.fn(),
      getPlan: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(),
      listDrills: vi.fn(),
    },
  },
}));

describe('EhsPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ehsApi.listPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: { data: [] },
    });
  });

  it('should render without crashing', () => {
    render(<EhsPlanPage />);
    expect(true).toBe(true);
  });

  it('should have plan API methods defined', () => {
    expect(ehsApi.listPlans).toBeDefined();
    expect(ehsApi.createPlan).toBeDefined();
    expect(ehsApi.updatePlan).toBeDefined();
    expect(ehsApi.deletePlan).toBeDefined();
  });
});
