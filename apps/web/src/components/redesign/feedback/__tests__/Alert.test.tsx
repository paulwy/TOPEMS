import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders with children', () => {
    render(<Alert>这是一条警告信息</Alert>);

    expect(screen.getByText('这是一条警告信息')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<Alert variant='success'>操作成功</Alert>);

    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Alert title='警告标题'>这是一条警告信息</Alert>);

    expect(screen.getByText('警告标题')).toBeInTheDocument();
    expect(screen.getByText('这是一条警告信息')).toBeInTheDocument();
  });

  it('renders with dismissible', () => {
    render(
      <Alert
        dismissible={true}
        onDismiss={() => {}}
      >
        这是一条警告信息
      </Alert>
    );

    // 关闭按钮应该显示
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
  });
});
