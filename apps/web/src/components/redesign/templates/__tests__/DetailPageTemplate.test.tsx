import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DetailPageTemplate } from '../DetailPageTemplate';

describe('DetailPageTemplate', () => {
  it('renders with header and children', () => {
    render(
      <DetailPageTemplate header={{ title: '客户详情' }}>
        <div>详情内容</div>
      </DetailPageTemplate>
    );

    expect(screen.getByText('客户详情')).toBeInTheDocument();
    expect(screen.getByText('详情内容')).toBeInTheDocument();
  });

  it('renders with sections', () => {
    render(
      <DetailPageTemplate
        header={{ title: '客户详情' }}
        sections={[
          { label: '客户名称', value: '张三' },
          { label: '联系电话', value: '13800138000' },
        ]}
      >
        <div>详情内容</div>
      </DetailPageTemplate>
    );

    expect(screen.getByText('客户名称')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('renders with tabs', () => {
    render(
      <DetailPageTemplate
        header={{ title: '客户详情' }}
        tabs={[
          { id: 'basic', label: '基本信息' },
          { id: 'orders', label: '订单记录' },
        ]}
        activeTab='basic'
      >
        <div>详情内容</div>
      </DetailPageTemplate>
    );

    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByText('订单记录')).toBeInTheDocument();
  });
});
