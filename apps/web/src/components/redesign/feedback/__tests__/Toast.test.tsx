import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ToastContainer, ToastItem, type Toast } from '../Toast';

describe('Toast', () => {
  it('renders toast item', () => {
    const toast: Toast = {
      id: '1',
      variant: 'success',
      message: '操作成功',
    };

    render(
      <ToastItem
        toast={toast}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('renders toast container with multiple toasts', () => {
    const toasts: Toast[] = [
      { id: '1', variant: 'success', message: '操作成功' },
      { id: '2', variant: 'error', message: '操作失败' },
    ];

    render(
      <ToastContainer
        toasts={toasts}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText('操作成功')).toBeInTheDocument();
    expect(screen.getByText('操作失败')).toBeInTheDocument();
  });

  it('renders toast with title', () => {
    const toast: Toast = {
      id: '1',
      variant: 'info',
      title: '提示',
      message: '这是一条提示信息',
    };

    render(
      <ToastItem
        toast={toast}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText('提示')).toBeInTheDocument();
    expect(screen.getByText('这是一条提示信息')).toBeInTheDocument();
  });
});
