import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ListPageTemplate } from '../ListPageTemplate';

interface TestRow {
  id: string;
  name: string;
}

const columns = [{ key: 'name', header: '名称' }];

const data: TestRow[] = [
  { id: '1', name: '张三' },
  { id: '2', name: '李四' },
];

describe('ListPageTemplate', () => {
  it('renders with header and table', () => {
    render(
      <ListPageTemplate
        header={{ title: '客户管理' }}
        columns={columns}
        data={data}
        rowKey='id'
      />
    );

    expect(screen.getByText('客户管理')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('renders with toolbar', () => {
    render(
      <ListPageTemplate
        header={{ title: '客户管理' }}
        toolbar={<div>工具栏</div>}
        columns={columns}
        data={data}
        rowKey='id'
      />
    );

    expect(screen.getByText('工具栏')).toBeInTheDocument();
  });

  it('renders with empty state', () => {
    render(
      <ListPageTemplate
        header={{ title: '客户管理' }}
        columns={columns}
        data={[]}
        rowKey='id'
        emptyTitle='暂无数据'
        emptyDescription='当前列表为空'
      />
    );

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前列表为空')).toBeInTheDocument();
  });
});
