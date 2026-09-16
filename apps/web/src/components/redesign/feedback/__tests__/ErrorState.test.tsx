import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders with title and message', () => {
    render(
      <ErrorState
        title='加载失败'
        message='网络错误，请稍后重试'
      />
    );

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('网络错误，请稍后重试')).toBeInTheDocument();
  });

  it('renders with retry button', () => {
    render(
      <ErrorState
        title='加载失败'
        message='网络错误，请稍后重试'
        onRetry={() => {}}
      />
    );

    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('renders with default title', () => {
    render(<ErrorState />);

    expect(screen.getByText('出错了')).toBeInTheDocument();
  });
});
