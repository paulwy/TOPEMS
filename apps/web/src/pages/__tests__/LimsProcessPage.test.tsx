import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsProcessPage from '../lims/LimsProcessPage';
import { limsApi } from '@/api/lims';

vi.mock('@/api/lims', () => ({
  limsApi: {
    processes: {
      list: vi.fn(),
    },
    getStatistics: vi.fn(),
    createProcess: vi.fn(),
    getProcess: vi.fn(),
    updateProcess: vi.fn(),
    deleteProcess: vi.fn(),
  },
}));

describe('LimsProcessPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <LimsProcessPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have process API methods defined', () => {
    expect(limsApi.processes.list).toBeDefined();
    expect(limsApi.createProcess).toBeDefined();
    expect(limsApi.getProcess).toBeDefined();
    expect(limsApi.updateProcess).toBeDefined();
  });
});
