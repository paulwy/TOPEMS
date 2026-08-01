import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { AlertCard } from '../AlertCard';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('AlertCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and message', () => {
    renderWithProviders(
      <AlertCard
        level='info'
        title='提示标题'
        message='这是一条提示消息'
      />
    );
    expect(screen.getByText('提示标题')).toBeInTheDocument();
    expect(screen.getByText('这是一条提示消息')).toBeInTheDocument();
  });

  it('renders message only without title', () => {
    renderWithProviders(
      <AlertCard
        level='info'
        message='只有消息'
      />
    );
    expect(screen.getByText('只有消息')).toBeInTheDocument();
  });

  it('renders success severity level', () => {
    renderWithProviders(
      <AlertCard
        level='success'
        title='成功'
        message='操作成功完成'
      />
    );
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('操作成功完成')).toBeInTheDocument();
  });

  it('renders error severity level', () => {
    renderWithProviders(
      <AlertCard
        level='error'
        title='错误'
        message='操作失败'
      />
    );
    expect(screen.getByText('错误')).toBeInTheDocument();
    expect(screen.getByText('操作失败')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked (card mode)', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <AlertCard
        level='warning'
        title='警告'
        message='请注意'
        closable
        onClose={handleClose}
      />
    );
    // The close button is the last IconButton in the card
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders action buttons and triggers their onClick', () => {
    const handleView = vi.fn();
    const handleClose = vi.fn();
    renderWithProviders(
      <AlertCard
        level='success'
        title='操作成功'
        message='是否继续其他操作？'
        actions={[
          { label: '查看详情', onClick: handleView },
          { label: '关闭', onClick: handleClose, primary: true },
        ]}
      />
    );
    const viewBtn = screen.getByRole('button', { name: /查看详情/ });
    const closeBtn = screen.getByRole('button', { name: /关闭/ });
    fireEvent.click(viewBtn);
    expect(handleView).toHaveBeenCalledTimes(1);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders in alert mode when useAlert is true', () => {
    renderWithProviders(
      <AlertCard
        level='error'
        title='错误'
        message='使用Alert模式'
        useAlert
      />
    );
    expect(screen.getByText('错误')).toBeInTheDocument();
    expect(screen.getByText('使用Alert模式')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    // AlertCard uses `icon` as a component type (<IconComponent />), so pass a component
    const CustomIcon = () => <span data-testid='custom-icon'>★</span>;
    renderWithProviders(
      <AlertCard
        level='info'
        message='自定义图标'
        icon={CustomIcon as any}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
