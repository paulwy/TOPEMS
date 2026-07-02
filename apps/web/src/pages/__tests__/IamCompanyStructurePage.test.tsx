import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CompanyStructurePage from '../iam/CompanyStructurePage';
import {
  useCompanyRelations,
  useCompanyTree,
  useCreateCompanyRelation,
  useUpdateCompanyRelation,
  useDeleteCompanyRelation,
} from '@/hooks/useConsolidation';
import { useAppStore } from '@/store';

vi.mock('@/hooks/useConsolidation', () => ({
  useCompanyRelations: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useCompanyTree: vi.fn(() => ({ data: { data: null }, isLoading: false })),
  useCreateCompanyRelation: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateCompanyRelation: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteCompanyRelation: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/store', () => {
  const state = {
    addNotification: vi.fn(),
    notifications: [],
    user: { permissions: ['iam:structure:read'] },
    theme: 'light',
  };
  return {
    useAppStore: vi.fn((selector?: any) => (selector ? selector(state) : state)),
  };
});

describe('IamCompanyStructurePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <CompanyStructurePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have consolidation hooks defined', async () => {
    render(
      <BrowserRouter>
        <CompanyStructurePage />
      </BrowserRouter>
    );
    expect(useCompanyRelations).toBeDefined();
    expect(useCompanyTree).toBeDefined();
    expect(useCreateCompanyRelation).toBeDefined();
    expect(useUpdateCompanyRelation).toBeDefined();
    expect(useDeleteCompanyRelation).toBeDefined();
  });

  it('should call useCompanyTree on mount', async () => {
    render(
      <BrowserRouter>
        <CompanyStructurePage />
      </BrowserRouter>
    );
    expect(useCompanyTree).toHaveBeenCalled();
  });
});
