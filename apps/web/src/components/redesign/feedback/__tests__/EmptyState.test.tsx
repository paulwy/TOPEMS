import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title='暂无数据'
        description='当前列表为空'
      />
    );

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前列表为空')).toBeInTheDocument();
  });

  it('renders with action', () => {
    render(
      <EmptyState
        title='暂无数据'
        description='当前列表为空'
        action={{ label: '新建', onClick: () => {} }}
      />
    );

    expect(screen.getByText('新建')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(
      <EmptyState
        variant='search'
        title='未找到结果'
        description='请尝试其他搜索条件'
      />
    );

    expect(screen.getByText('未找到结果')).toBeInTheDocument();
  });
});
