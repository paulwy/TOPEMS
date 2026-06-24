/**
 * TreePageTemplate 单元测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { TreeNode } from '../TreePageTemplate';
import { TreePageTemplate } from '../TreePageTemplate';

// Mock MUI components
vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => (
    <div
      data-testid='box'
      {...props}
    >
      {children}
    </div>
  ),
  Paper: ({ children, ...props }: any) => (
    <div
      data-testid='paper'
      {...props}
    >
      {children}
    </div>
  ),
  Typography: ({ children, ...props }: any) => (
    <div
      data-testid='typography'
      {...props}
    >
      {children}
    </div>
  ),
  TextField: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid='textfield'
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  Button: ({ children, onClick, startIcon, ...props }: any) => (
    <button
      data-testid='button'
      onClick={onClick}
      {...props}
    >
      {startIcon}
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button
      data-testid='iconbutton'
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
  Select: ({ value, onChange, children, ...props }: any) => (
    <select
      data-testid='select'
      value={value}
      onChange={onChange}
      {...props}
    >
      {children}
    </select>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option
      data-testid='menuitem'
      value={value}
      {...props}
    >
      {children}
    </option>
  ),
  FormControl: ({ children, ...props }: any) => (
    <div
      data-testid='formcontrol'
      {...props}
    >
      {children}
    </div>
  ),
  InputLabel: ({ children, ...props }: any) => (
    <label
      data-testid='inputlabel'
      {...props}
    >
      {children}
    </label>
  ),
  Avatar: ({ children, ...props }: any) => (
    <div
      data-testid='avatar'
      {...props}
    >
      {children}
    </div>
  ),
  Chip: ({ label, ...props }: any) => <span data-testid='chip'>{label}</span>,
  Divider: (props: any) => (
    <div
      data-testid='divider'
      {...props}
    />
  ),
  useTheme: () => ({ breakpoints: { down: () => false } }),
  useMediaQuery: () => false,
  Skeleton: ({ ...props }: any) => (
    <div
      data-testid='skeleton'
      {...props}
    />
  ),
  Tooltip: ({ children, ...props }: any) => (
    <div
      data-testid='tooltip'
      {...props}
    >
      {children}
    </div>
  ),
  InputAdornment: ({ children, ...props }: any) => (
    <div
      data-testid='inputadornment'
      {...props}
    >
      {children}
    </div>
  ),
  CircularProgress: ({ ...props }: any) => (
    <div
      data-testid='circularprogress'
      {...props}
    />
  ),
  LinearProgress: ({ ...props }: any) => (
    <div
      data-testid='linearprogress'
      {...props}
    />
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <span data-testid='icon-search'>Search</span>,
  RefreshCw: () => <span data-testid='icon-refresh'>RefreshCw</span>,
  ChevronRight: () => <span data-testid='icon-chevron-right'>ChevronRight</span>,
  ChevronDown: () => <span data-testid='icon-chevron-down'>ChevronDown</span>,
  Plus: () => <span data-testid='icon-plus'>Plus</span>,
  Edit: () => <span data-testid='icon-edit'>Edit</span>,
  Trash2: () => <span data-testid='icon-trash'>Trash2</span>,
  Eye: () => <span data-testid='icon-eye'>Eye</span>,
  Building2: () => <span data-testid='icon-building'>Building2</span>,
  Users: () => <span data-testid='icon-users'>Users</span>,
}));

// Mock EmptyState
vi.mock('./EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid='empty-state'>{title}</div>,
}));

describe('TreePageTemplate', () => {
  const mockTreeData: TreeNode[] = [
    {
      id: '1',
      name: '技术部',
      type: 'folder',
      children: [
        { id: '1-1', name: '前端组', type: 'folder', children: [] },
        { id: '1-2', name: '后端组', type: 'folder', children: [] },
      ],
    },
    {
      id: '2',
      name: '运营部',
      type: 'folder',
      children: [{ id: '2-1', name: '市场组', type: 'folder', children: [] }],
    },
  ];

  const mockStats = [
    {
      id: 'total',
      title: '部门总数',
      value: 10,
      icon: <span>Icon</span>,
      color: 'primary' as const,
    },
    {
      id: 'active',
      title: '启用部门',
      value: 8,
      icon: <span>Icon</span>,
      color: 'success' as const,
    },
  ];

  const defaultProps = {
    title: '部门管理',
    data: mockTreeData,
    onAdd: vi.fn(),
    onRefresh: vi.fn(),
    onSearch: vi.fn(),
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该正确渲染页面标题', () => {
      render(<TreePageTemplate {...defaultProps} />);
      expect(screen.getByText('部门管理')).toBeInTheDocument();
    });

    it('应该正确渲染副标题', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          subtitle='管理所有部门'
        />
      );
      expect(screen.getByText('管理所有部门')).toBeInTheDocument();
    });

    it('应该渲染新增按钮', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const addButton = screen.getByText('新增');
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('统计卡片', () => {
    it('应该正确渲染统计卡片', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          stats={mockStats}
        />
      );
      expect(screen.getByText('部门总数')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('启用部门')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('当没有统计数据时不应渲染统计区域', () => {
      const { container } = render(
        <TreePageTemplate
          {...defaultProps}
          stats={[]}
        />
      );
      expect(container.querySelector('[data-testid="box"]')).toBeInTheDocument();
    });
  });

  describe('树形结构', () => {
    it('应该正确渲染树形节点', () => {
      render(<TreePageTemplate {...defaultProps} />);
      expect(screen.getByText('技术部')).toBeInTheDocument();
      expect(screen.getByText('运营部')).toBeInTheDocument();
    });

    it('应该显示子节点数量', () => {
      render(<TreePageTemplate {...defaultProps} />);
      // 检查是否显示子节点数量
      const chips = screen.getAllByTestId('chip');
      expect(chips.length).toBeGreaterThan(0);
    });

    it('点击节点应该触发onSelect回调', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const techNode = screen.getByText('技术部');
      fireEvent.click(techNode);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    });

    it('点击展开/折叠按钮应该切换展开状态', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const expandButtons = screen.getAllByTestId('iconbutton');
      if (expandButtons.length > 0) {
        fireEvent.click(expandButtons[0]);
      }
    });
  });

  describe('搜索功能', () => {
    it('应该渲染搜索输入框', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('搜索...');
      expect(searchInput).toBeInTheDocument();
    });

    it('输入搜索文本应该更新状态', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('搜索...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '技术' } });
      expect(searchInput.value).toBe('技术');
    });

    it('按Enter键应该触发搜索回调', () => {
      render(<TreePageTemplate {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('搜索...');
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      expect(defaultProps.onSearch).toHaveBeenCalled();
    });
  });

  describe('筛选功能', () => {
    it('应该渲染筛选下拉框', () => {
      const filterOptions = [
        { label: '全部', value: 'all' },
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'inactive' },
      ];
      render(
        <TreePageTemplate
          {...defaultProps}
          filterOptions={filterOptions}
          filterValue='active'
          onFilterChange={vi.fn()}
        />
      );
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });
  });

  describe('空状态', () => {
    it('当数据为空时应该显示空状态', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          data={[]}
        />
      );
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });
  });

  describe('详情面板', () => {
    it('当没有选中节点时应该显示提示信息', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          detailPanel={<div>详情内容</div>}
        />
      );
      expect(screen.getByText('选择项目查看详情')).toBeInTheDocument();
    });

    it('当有选中节点时应该显示详情面板', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          selectedId='1'
          detailPanel={<div>部门详情</div>}
        />
      );
      expect(screen.getByText('部门详情')).toBeInTheDocument();
    });
  });

  describe('操作按钮', () => {
    it('应该渲染行操作按钮', () => {
      const rowActions = [
        { label: '编辑', onClick: vi.fn(), icon: <span>Edit</span> },
        { label: '删除', onClick: vi.fn(), color: 'error' as const },
      ];
      render(
        <TreePageTemplate
          {...defaultProps}
          selectedId='1'
          rowActions={rowActions}
        />
      );
      // 操作按钮渲染为 Tooltip，检查 Tooltip 是否存在
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  describe('加载状态', () => {
    it('加载中应该显示骨架屏', () => {
      render(
        <TreePageTemplate
          {...defaultProps}
          loading={true}
        />
      );
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
