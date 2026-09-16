import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders with title', () => {
    render(<PageHeader title='客户管理' />);

    expect(screen.getByText('客户管理')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(
      <PageHeader
        title='客户管理'
        subtitle='管理所有客户信息'
      />
    );

    expect(screen.getByText('客户管理')).toBeInTheDocument();
    expect(screen.getByText('管理所有客户信息')).toBeInTheDocument();
  });

  it('renders with primary action', () => {
    render(
      <PageHeader
        title='客户管理'
        primaryAction={{ label: '新建客户', onClick: () => {} }}
      />
    );

    expect(screen.getByText('新建客户')).toBeInTheDocument();
  });

  it('renders with breadcrumbs', () => {
    render(
      <PageHeader
        title='客户详情'
        breadcrumbs={[{ label: '首页' }, { label: '客户管理' }, { label: '客户详情' }]}
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('客户管理')).toBeInTheDocument();
  });
});
