import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsAccidentPage from '../ehs/EhsAccidentPage';
import { ehsApi } from '@/api/ehs';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listAccidents: vi.fn(),
    createAccident: vi.fn(),
    updateAccident: vi.fn(),
    deleteAccident: vi.fn(),
  },
}));

describe('EhsAccidentPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <EhsAccidentPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have accident API methods defined', () => {
    expect(ehsApi.listAccidents).toBeDefined();
    expect(ehsApi.createAccident).toBeDefined();
  });
});
