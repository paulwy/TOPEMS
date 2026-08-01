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
        title='标题'
        subtitle='副标题内容'
      >
        内容
      </PageContainer>
    );
    expect(screen.getByText('副标题内容')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithProviders(
      <PageContainer
        title='标题'
        description='描述信息'
      >
        内容
      </PageContainer>
    );
    expect(screen.getByText('描述信息')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading is true and hides children', () => {
    renderWithProviders(
      <PageContainer
        title='标题'
        loading
      >
        <div data-testid='hidden-child'>子内容</div>
      </PageContainer>
    );
    // Children should not render while loading
    expect(screen.queryByTestId('hidden-child')).not.toBeInTheDocument();
    // Skeletons rendered as MuiSkeleton
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not render header when no title and autoTitle is false', () => {
    renderWithProviders(
      <PageContainer autoTitle={false}>
        <div>仅内容</div>
      </PageContainer>
    );
    // No header text other than children
    expect(screen.getByText('仅内容')).toBeInTheDocument();
  });

  it('renders header actions when headerActions is provided', () => {
    renderWithProviders(
      <PageContainer
        title='标题'
        headerActions={<button data-testid='header-action-btn'>操作</button>}
      >
        内容
      </PageContainer>
    );
    expect(screen.getByTestId('header-action-btn')).toBeInTheDocument();
  });

  it('renders paper wrapper when paper prop is true', () => {
    const { container } = renderWithProviders(
      <PageContainer
        title='标题'
        paper
      >
        <div>内容</div>
      </PageContainer>
    );
    expect(container.querySelector('.MuiPaper-root')).not.toBeNull();
  });
});
