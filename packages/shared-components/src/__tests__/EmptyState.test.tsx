import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, ListEmptyState, SearchEmptyState, PermissionEmptyState, ErrorEmptyState } from '../components/EmptyState';

describe('EmptyState Component', () => {
  it('renders with title', () => {
    render(<EmptyState title="暂无数据" />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<EmptyState title="暂无数据" description="当前列表为空" />);
    expect(screen.getByText('当前列表为空')).toBeInTheDocument();
  });

  it('renders with emoji', () => {
    render(<EmptyState title="暂无数据" emoji="📋" />);
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const icon = <span data-testid="custom-icon">图标</span>;
    render(<EmptyState title="暂无数据" icon={icon} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders with action button', () => {
    const handleClick = vi.fn();
    render(<EmptyState title="暂无数据" action={{ label: '新建', onClick: handleClick }} />);
    expect(screen.getByText('新建')).toBeInTheDocument();
    fireEvent.click(screen.getByText('新建'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with action href', () => {
    render(<EmptyState title="暂无数据" action={{ label: '查看详情', href: '/details' }} />);
    const button = screen.getByText('查看详情');
    expect(button).toHaveAttribute('href', '/details');
  });

  it('renders in compact mode', () => {
    const { container } = render(<EmptyState title="暂无数据" compact />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with left alignment', () => {
    const { container } = render(<EmptyState title="暂无数据" align="left" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with deprecated actionLabel prop', () => {
    const handleClick = vi.fn();
    render(<EmptyState title="暂无数据" actionLabel="操作" onAction={handleClick} />);
    expect(screen.getByText('操作')).toBeInTheDocument();
    fireEvent.click(screen.getByText('操作'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders children content', () => {
    render(<EmptyState title="暂无数据"><div data-testid="custom-content">自定义内容</div></EmptyState>);
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });
});

describe('ListEmptyState Component', () => {
  it('renders with default title', () => {
    render(<ListEmptyState />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ListEmptyState title="没有记录" />);
    expect(screen.getByText('没有记录')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<ListEmptyState description="暂无符合条件的记录" />);
    expect(screen.getByText('暂无符合条件的记录')).toBeInTheDocument();
  });

  it('renders with action button', () => {
    const handleClick = vi.fn();
    render(<ListEmptyState actionLabel="新建" onAction={handleClick} />);
    expect(screen.getByText('新建')).toBeInTheDocument();
    fireEvent.click(screen.getByText('新建'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('SearchEmptyState Component', () => {
  it('renders with keyword', () => {
    const { container } = render(<SearchEmptyState keyword="测试" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without keyword', () => {
    const { container } = render(<SearchEmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with clear action', () => {
    const { container } = render(<SearchEmptyState keyword="测试" onClear={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('PermissionEmptyState Component', () => {
  it('renders permission denied message', () => {
    const { container } = render(<PermissionEmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with request action', () => {
    const { container } = render(<PermissionEmptyState onRequest={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ErrorEmptyState Component', () => {
  it('renders with default error message', () => {
    const { container } = render(<ErrorEmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with custom error message', () => {
    const { container } = render(<ErrorEmptyState error="网络连接失败" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with retry action', () => {
    const { container } = render(<ErrorEmptyState onRetry={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});