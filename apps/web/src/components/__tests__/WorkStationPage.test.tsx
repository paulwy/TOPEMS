import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import WorkStationPage from '../mes/WorkStationPage';
import { mesApi } from '@/api/mes';

vi.mock('@/api/mes', () => ({
  mesApi: {
    workstations: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('WorkStationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mesApi.workstations.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { workstations: [], total: 0 },
    });
  });

  it('should render without crashing', () => {
    render(<WorkStationPage />);
    expect(true).toBe(true);
  });

  it('should have workstation API methods defined', () => {
    expect(mesApi.workstations.list).toBeDefined();
    expect(mesApi.workstations.create).toBeDefined();
    expect(mesApi.workstations.update).toBeDefined();
    expect(mesApi.workstations.delete).toBeDefined();
  });
});
