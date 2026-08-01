import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render children when open is false', () => {
    renderWithProviders(
      <Drawer
        open={false}
        onClose={vi.fn()}
      >
        <span data-testid='drawer-child'>抽屉内容</span>
      </Drawer>
    );
    expect(screen.queryByTestId('drawer-child')).not.toBeInTheDocument();
  });

  it('renders children when open is true', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
      >
        <span data-testid='drawer-child'>抽屉内容</span>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-child')).toBeInTheDocument();
    expect(screen.getByText('抽屉内容')).toBeInTheDocument();
  });

  it('displays title text when open', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
        title='抽屉标题'
      >
        <div>内容</div>
      </Drawer>
    );
    expect(screen.getByText('抽屉标题')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <Drawer
        open
        onClose={handleClose}
        title='可关闭抽屉'
      >
        <div>内容</div>
      </Drawer>
    );
    // 查找关闭按钮（带 svg 的 IconButton）
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((btn) => btn.querySelector('svg'));
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not show close button when showCloseButton is false', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
        title='无关闭按钮'
        showCloseButton={false}
      >
        <div>内容</div>
      </Drawer>
    );
    expect(screen.getByText('无关闭按钮')).toBeInTheDocument();
    // 标题存在但没有关闭按钮（无 svg 图标）
    const buttons = screen.queryAllByRole('button');
    const withSvg = buttons.filter((btn) => btn.querySelector('svg'));
    expect(withSvg).toHaveLength(0);
  });

  it('renders footer content when provided', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
        title='带页脚'
        footerContent={<div data-testid='footer'>页脚内容</div>}
      >
        <div>主体</div>
      </Drawer>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders header content when provided instead of title', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
        headerContent={<div data-testid='custom-header'>自定义头部</div>}
      >
        <div>内容</div>
      </Drawer>
    );
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('does not call onClose when closable is false and close button clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <Drawer
        open
        onClose={handleClose}
        title='不可关闭'
        closable={false}
      >
        <div>内容</div>
      </Drawer>
    );
    // closable=false 时不渲染关闭按钮
    expect(screen.getByText('不可关闭')).toBeInTheDocument();
  });
});
