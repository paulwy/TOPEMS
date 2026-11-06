import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ListPageTemplate } from '../ListPageTemplate';

// 批 12：ListPageTemplate 内部用 usePermission 判定 writeOnly 列；
// 该 hook 依赖 AuthProvider，测试中显式 mock 以保证可控。
const mockCheckPermission = vi.fn<(permission: string) => boolean>(() => true);
vi.mock('@/hooks/useOptionalPermission', () => ({
  useOptionalPermission: () => mockCheckPermission,
}));

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

describe('ListPageTemplate writeOnly 列（批 12）', () => {
  const writeCols = [
    { key: 'name', header: '名称' },
    { key: 'actions', header: '操作', writeOnly: true, render: () => <span>行操作</span> },
  ];

  beforeEach(() => {
    mockCheckPermission.mockReset();
    mockCheckPermission.mockReturnValue(true);
  });

  it('未传 writePermission 时不过滤（存量零回归）', () => {
    render(
      <ListPageTemplate
        header={{ title: 'T' }}
        columns={writeCols}
        data={data}
        rowKey='id'
      />
    );
    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('传 writePermission 且无权限时隐藏 writeOnly 列', () => {
    mockCheckPermission.mockReturnValue(false);
    render(
      <ListPageTemplate
        header={{ title: 'T' }}
        columns={writeCols}
        data={data}
        rowKey='id'
        writePermission='mes:work_order:write'
      />
    );
    expect(screen.queryByText('操作')).not.toBeInTheDocument();
    expect(screen.getByText('名称')).toBeInTheDocument();
  });

  it('传 writePermission 且有权限时正常渲染 writeOnly 列', () => {
    render(
      <ListPageTemplate
        header={{ title: 'T' }}
        columns={writeCols}
        data={data}
        rowKey='id'
        writePermission='mes:work_order:write'
      />
    );
    expect(screen.getByText('操作')).toBeInTheDocument();
    expect(mockCheckPermission).toHaveBeenCalledWith('mes:work_order:write');
  });
});
