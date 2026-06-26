import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageHeader from '../../templates/PageHeader';
import { useAutoBreadcrumbs } from '@/hooks';

vi.mock('@/hooks', () => ({
  useAutoBreadcrumbs: vi.fn(),
  useBackNavigation: vi.fn().mockReturnValue({
    goBack: vi.fn(),
    hasFrom: false,
    from: null,
    fromFullPath: null,
    createNavigateState: vi.fn(),
  }),
}));

const mockUseAutoBreadcrumbs = useAutoBreadcrumbs as vi.Mock;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAutoBreadcrumbs.mockReturnValue([]);
  });

  it('should render title', () => {
    renderWithRouter(<PageHeader title='测试页面' />);
    expect(screen.getByText('测试页面')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    renderWithRouter(<PageHeader title='测试页面' subtitle='这是副标题' />);
    expect(screen.getByText('这是副标题')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    renderWithRouter(<PageHeader title='测试页面' description='这是描述信息' />);
    expect(screen.getByText('这是描述信息')).toBeInTheDocument();
  });

  it('should render manual breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: '首页', href: '/' },
      { label: '列表', href: '/list' },
      { label: '详情' },
    ];
    renderWithRouter(
      <PageHeader
        title='测试页面'
        breadcrumbs={breadcrumbs}
        autoBreadcrumbs={false}
      />
    );
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('列表')).toBeInTheDocument();
    expect(screen.getByText('详情')).toBeInTheDocument();
  });

  it('should render back button when backButton prop is provided', () => {
    renderWithRouter(
      <PageHeader
        title='测试页面'
        backButton={{ visible: true, href: '/list' }}
      />
    );
    const backButton = screen.getByLabelText('返回');
    expect(backButton).toBeInTheDocument();
  });

  it('should not render back button when backButton.visible is false', () => {
    renderWithRouter(
      <PageHeader
        title='测试页面'
        backButton={{ visible: false }}
      />
    );
    expect(screen.queryByLabelText('返回')).not.toBeInTheDocument();
  });

  it('should render action buttons when provided', () => {
    const handleClick = vi.fn();
    const actions = [
      { label: '新建', onClick: handleClick, variant: 'contained' as const },
      { label: '导出', onClick: vi.fn(), variant: 'outlined' as const },
    ];
    renderWithRouter(<PageHeader title='测试页面' actions={actions} />);
    expect(screen.getByRole('button', { name: /新建/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /导出/i })).toBeInTheDocument();
  });

  it('should call action onClick when button is clicked', () => {
    const handleClick = vi.fn();
    const actions = [{ label: '新建', onClick: handleClick, variant: 'contained' as const }];
    renderWithRouter(<PageHeader title='测试页面' actions={actions} />);
    const button = screen.getByRole('button', { name: /新建/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render refresh button when onRefresh is provided', () => {
    const handleRefresh = vi.fn();
    renderWithRouter(<PageHeader title='测试页面' onRefresh={handleRefresh} />);
    const refreshButton = screen.getByLabelText('刷新');
    expect(refreshButton).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const handleRefresh = vi.fn();
    renderWithRouter(<PageHeader title='测试页面' onRefresh={handleRefresh} />);
    const refreshButton = screen.getByLabelText('刷新');
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('should render loading skeletons when loading is true', () => {
    renderWithRouter(<PageHeader title='测试页面' loading={true} />);
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render stats chips when provided', () => {
    const stats = [
      { label: '总数', value: 100, color: 'primary.light' },
      { label: '活跃', value: 50 },
    ];
    renderWithRouter(<PageHeader title='测试页面' stats={stats} />);
    expect(screen.getByText('总数: 100')).toBeInTheDocument();
    expect(screen.getByText('活跃: 50')).toBeInTheDocument();
  });

  it('should render tabs when provided', () => {
    const tabs = [
      { label: '全部', value: 'all', active: true },
      { label: '已完成', value: 'done' },
    ];
    renderWithRouter(<PageHeader title='测试页面' tabs={tabs} />);
    expect(screen.getByRole('tab', { name: /全部/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /已完成/i })).toBeInTheDocument();
  });

  it('should render search input when provided', () => {
    const handleChange = vi.fn();
    renderWithRouter(
      <PageHeader
        title='测试页面'
        search={{ value: '', onChange: handleChange }}
      />
    );
    const searchInput = screen.getByPlaceholderText('搜索...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render badge when provided', () => {
    renderWithRouter(
      <PageHeader
        title='测试页面'
        badge={{ label: '新', color: 'success' as const }}
      />
    );
    expect(screen.getByText('新')).toBeInTheDocument();
  });

  it('should render page icon when provided', () => {
    const TestIcon = () => <span data-testid='test-icon'>Icon</span>;
    renderWithRouter(
      <PageHeader
        title='测试页面'
        pageIcon={<TestIcon />}
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
