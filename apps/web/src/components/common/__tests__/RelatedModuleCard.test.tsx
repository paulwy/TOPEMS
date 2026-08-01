import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { RelatedModuleCard } from '../RelatedModuleCard';

vi.mock('@/context/PluginContext', () => ({
  usePlugins: () => ({
    isPluginInstalled: vi.fn(() => true),
    isPluginActive: vi.fn(() => true),
    isPluginHealthy: vi.fn(() => true),
    installedPlugins: [],
    pluginHealth: {},
    availablePlugins: [],
    isLoading: false,
    refreshPlugins: vi.fn(),
    installPlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const defaultProps = {
  moduleCode: 'finance',
  moduleName: '财务模块',
  items: [
    { label: '本月收入', value: '¥12,345', trend: 'up' as const },
    { label: '待处理', value: 3 },
  ],
  detailPath: '/finance/detail',
};

describe('RelatedModuleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders module name in header', () => {
    renderWithProviders(<RelatedModuleCard {...defaultProps} />);
    expect(screen.getByText(/关联数据 \(财务模块\)/)).toBeInTheDocument();
  });

  it('renders default link text when not provided', () => {
    renderWithProviders(<RelatedModuleCard {...defaultProps} />);
    // 默认 linkText 走 t() 取 ZH_DICT 里的中文
    expect(screen.getByText('查看详情')).toBeInTheDocument();
  });

  it('renders custom link text when provided', () => {
    renderWithProviders(
      <RelatedModuleCard
        {...defaultProps}
        linkText='查看更多'
      />
    );
    expect(screen.getByText('查看更多')).toBeInTheDocument();
  });

  it('renders all item labels and values', () => {
    renderWithProviders(<RelatedModuleCard {...defaultProps} />);
    expect(screen.getByText('本月收入')).toBeInTheDocument();
    expect(screen.getByText('¥12,345')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders custom module icon when provided', () => {
    renderWithProviders(
      <RelatedModuleCard
        {...defaultProps}
        moduleIcon={<span data-testid='custom-module-icon'>💰</span>}
      />
    );
    expect(screen.getByTestId('custom-module-icon')).toBeInTheDocument();
  });

  it('navigates to detail path when link button is clicked', () => {
    renderWithProviders(<RelatedModuleCard {...defaultProps} />);
    const linkButton = screen.getByText('查看详情').closest('button');
    expect(linkButton).not.toBeNull();
    fireEvent.click(linkButton!);
    expect(mockNavigate).toHaveBeenCalledWith('/finance/detail');
  });

  it('renders empty state message when items is empty', () => {
    renderWithProviders(
      <RelatedModuleCard
        {...defaultProps}
        items={[]}
      />
    );
    expect(screen.getByText('暂无关联数据')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading is true', () => {
    const { container } = renderWithProviders(
      <RelatedModuleCard
        {...defaultProps}
        loading
      />
    );
    // Skeleton 渲染为 MUI Skeleton 组件（带 data-testid 不存在，但通过 span 检测）
    // 加载时不显示具体数据值
    expect(screen.queryByText('¥12,345')).not.toBeInTheDocument();
    // 应有 skeleton 元素（MUI Skeleton 渲染为带 class 的 span）
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
