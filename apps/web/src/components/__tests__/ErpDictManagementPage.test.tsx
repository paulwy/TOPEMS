import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import DictManagementPage from '../erp/DictManagementPage';
import { dictTypeApi, dictItemApi } from '@/api/system';

// DictManagementPage：左面板字典类型 CRUD（自绘 useQuery + 3 useMutation + useConfirmDialog）
// + 右侧 CrudPage 字典项（itemApiAdapter 依赖 selectedTypeId）。
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

const addNotificationMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({ addNotification: addNotificationMock }));
vi.mock('@/store', () => ({
  useNotificationStore: (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
}));

// 捕获 useConfirmDialog.openConfirm 的入参，便于触发 onConfirm 走删除分支
const openConfirmMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks', () => ({
  useConfirmDialog: () => ({
    confirmOpen: false,
    confirmConfig: null,
    openConfirm: openConfirmMock,
    closeConfirm: vi.fn(),
  }),
}));

const mockCrudPage = vi.hoisted(() => vi.fn());
vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return (
      <div data-testid='crud-page'>
        crud-page
        {props.headerContent as React.ReactNode}
      </div>
    );
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/components/common', () => ({
  PageContainer: ({
    title,
    headerActions,
    children,
  }: {
    title?: React.ReactNode;
    headerActions?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {title != null && <div data-testid='page-title'>{title}</div>}
      {headerActions}
      {children}
    </div>
  ),
}));

vi.mock('@/schemas/admin', () => ({
  dictItemSchema: { name: 'dictItemSchema' },
}));

vi.mock('@/api/system', () => ({
  dictTypeApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 't1',
            code: 'T_CODE1',
            name: '类型一',
            category: 'erp',
            description: 'desc1',
            status: 'active',
          },
          {
            id: 't2',
            code: 'T_CODE2',
            name: '类型二',
            category: 'system',
            status: 'inactive',
          },
        ],
        total: 2,
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 't3' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 't1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  dictItemApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'i1', code: 'I1', name: '项1' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'i2' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 'i1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('DictManagementPage（左字典类型 CRUD + 右 CrudPage 字典项）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染标题 + 字典类型列表，自动选中第一个并渲染右侧 CrudPage', async () => {
    render(<DictManagementPage />);

    expect(screen.getByText('erp.dict_management_page.k27')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('类型一')).toBeInTheDocument();
    });
    expect(screen.getByText('类型二')).toBeInTheDocument();
    expect(screen.getByText('T_CODE1')).toBeInTheDocument();

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[mockCrudPage.mock.calls.length - 1][0] as Record<
      string,
      unknown
    >;
    expect(props.schema).toEqual({ name: 'dictItemSchema' });
    expect(props.breadcrumbs).toEqual([
      { label: 'erp.dict_management_page.k35' },
      { label: '类型一' },
    ]);
  });

  it('点击新建类型 → Dialog 打开 → 保存调 dictTypeApi.create + 成功通知', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    fireEvent.click(screen.getByLabelText('erp.dict_management_page.k29'));
    expect(screen.getByText('erp.dict_management_page.k36')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('erp.dict_management_page.k38'), {
      target: { value: 'NEW_CODE' },
    });
    fireEvent.change(screen.getByLabelText('erp.dict_management_page.k41'), {
      target: { value: '新类型' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'erp.dict_management_page.k46' }));

    await waitFor(() => {
      expect(dictTypeApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'NEW_CODE', name: '新类型' })
      );
    });
    expect(addNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', message: 'erp.dict_management_page.k8' })
    );
  });

  it('点击编辑类型 → Dialog 预填 → 保存调 dictTypeApi.update', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    // 第一个类型（类型一）的编辑按钮
    const editBtns = screen.getAllByLabelText('erp.dict_management_page.k32');
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('erp.dict_management_page.k37')).toBeInTheDocument();
    expect(screen.getByLabelText('erp.dict_management_page.k38')).toHaveValue('T_CODE1');
    expect(screen.getByLabelText('erp.dict_management_page.k41')).toHaveValue('类型一');

    fireEvent.change(screen.getByLabelText('erp.dict_management_page.k41'), {
      target: { value: '类型一改' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'erp.dict_management_page.k46' }));

    await waitFor(() => {
      expect(dictTypeApi.update).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ name: '类型一改' })
      );
    });
  });

  it('点击删除类型 → 触发 confirm → 确认调 dictTypeApi.delete + 成功通知', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    // 删除第二个类型（类型二），避免 selectedTypeId 被置空
    const deleteBtns = screen.getAllByLabelText('erp.dict_management_page.k34');
    fireEvent.click(deleteBtns[1]);

    expect(openConfirmMock).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const config = openConfirmMock.mock.calls[openConfirmMock.mock.calls.length - 1][0] as {
      onConfirm: () => void;
    };
    config.onConfirm();

    await waitFor(() => {
      expect(dictTypeApi.delete).toHaveBeenCalledWith('t2');
    });
    expect(addNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', message: 'erp.dict_management_page.k16' })
    );
  });

  it('itemApiAdapter.list 调用 dictItemApi.list(selectedTypeId, 归一化参数)', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    const props = mockCrudPage.mock.calls[mockCrudPage.mock.calls.length - 1][0] as {
      apiAdapter: {
        list: (p: unknown) => Promise<{ data: unknown[]; total: number }>;
      };
    };
    await props.apiAdapter.list({ page: 2, pageSize: 10, search: 'x' });

    expect(dictItemApi.list).toHaveBeenCalledWith('t1', {
      page: 2,
      page_size: 10,
      search: 'x',
    });
  });

  it('itemApiAdapter.create 注入 dict_type_id', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    const props = mockCrudPage.mock.calls[mockCrudPage.mock.calls.length - 1][0] as {
      apiAdapter: {
        create: (d: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const result = await props.apiAdapter.create({ code: 'I2', name: '项2' });

    expect(result).toEqual({ id: 'i2' });
    expect(dictItemApi.create).toHaveBeenCalledWith({
      code: 'I2',
      name: '项2',
      dict_type_id: 't1',
    });
  });

  it('点击刷新按钮触发 invalidateQueries', async () => {
    render(<DictManagementPage />);
    await waitFor(() => screen.getByText('类型一'));

    const queryClient = useQueryClient();
    fireEvent.click(screen.getByText('pages.dict_management_page.k0'));

    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
});
