import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import { PageContainer } from '../PageContainer';

// Mock navigation hooks used by PageContainer
vi.mock('@/lib/navigation/hooks', () => ({
  useNavHierarchy: vi.fn(() => []),
  useCurrentNavItem: vi.fn(() => {}),
}));

// Mock routes v2 to avoid loading the full route registry
vi.mock('@/routes/v2', () => ({
  findRouteByPathSync: vi.fn(() => {}),
}));

// Mock @/hooks (used by PageHeader internally) to avoid auto breadcrumbs logic
vi.mock('@/hooks', () => ({
  useAutoBreadcrumbs: vi.fn(() => []),
  useBackNavigation: vi.fn(() => ({
    goBack: vi.fn(),
    hasFrom: false,
    from: null,
    fromFullPath: null,
    createNavigateState: vi.fn(),
  })),
}));

describe('PageContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children content', () => {
    renderWithProviders(
      <PageContainer title='测试页面'>
        <div data-testid='child-content'>子内容</div>
      </PageContainer>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('子内容')).toBeInTheDocument();
  });

  it('renders the title in the header', () => {
    renderWithProviders(<PageContainer title='我的页面标题'>内容</PageContainer>);
    expect(screen.getByText('我的页面标题')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <PageContainer
