import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsInstrumentPage from '../lims/LimsInstrumentPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims', () => ({
  limsApi: {
    listInstruments: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    createInstrument: vi.fn(),
    getInstrument: vi.fn(),
    updateInstrument: vi.fn(),
    deleteInstrument: vi.fn(),
    getStatistics: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['lims:instrument:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['lims:instrument:read'] },
          theme: 'light',
        }
  ),
}));

describe('LimsInstrumentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <LimsInstrumentPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have instrument API methods defined', () => {
    expect(limsApi.listInstruments).toBeDefined();
    expect(limsApi.createInstrument).toBeDefined();
    expect(limsApi.getInstrument).toBeDefined();
    expect(limsApi.updateInstrument).toBeDefined();
  });
});
