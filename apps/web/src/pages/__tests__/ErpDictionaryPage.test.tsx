import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DictionaryPage from '../erp/DictionaryPage';
import { dictionaryApi } from '@/api/erp/dictionaries';
import { useNotificationStore } from '@/store';

// DictionaryPage：自绘 useQuery + useMutation + Dialog 表单 + Table（react-i18next useTranslation）。
vi.mock('@/i18n', () => ({
  default: { t: (k: string) => k, exists: () => true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const addNotificationMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({ addNotification: addNotificationMock }));
vi.mock('@/store', () => ({
  useNotificationStore: (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
}));

vi.mock('@/api/erp/dictionaries', () => ({
  dictionaryApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'd1',
            code: 'CODE1',
            name: '名称一',
            category: 'system',
            status: 'active',
            description: 'desc1',
          },
          {
            id: 'd2',
            code: 'CODE2',
            name: '名称二',
            category: 'erp',
            status: 'inactive',
            description: '',
          },
        ],
        total: 2,
        page: 1,
        page_size: 10,
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('DictionaryPage（自绘 useQuery + 增删改 Dialog）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染标题 + 表格列（code/name/category/status/actions）', async () => {
    render(<DictionaryPage />);

    expect(screen.getByText('erp.dictionaries.title')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('erp.dictionaries.code')).toBeInTheDocument();
    });
    expect(screen.getByText('erp.dictionaries.name')).toBeInTheDocument();
    expect(screen.getByText('erp.dictionaries.category')).toBeInTheDocument();
    expect(screen.getByText('erp.dictionaries.status')).toBeInTheDocument();
    expect(screen.getByText('erp.dictionaries.actions')).toBeInTheDocument();
  });

  it('list 调用 dictionaryApi.list({page:page+1, page_size:10}) + 渲染 2 行数据', async () => {
    render(<DictionaryPage />);

    await waitFor(() => {
      expect(dictionaryApi.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        search: undefined,
      });
    });
    // 行数据渲染
    expect(screen.getByText('CODE1')).toBeInTheDocument();
    expect(screen.getByText('名称一')).toBeInTheDocument();
    expect(screen.getByText('CODE2')).toBeInTheDocument();
    // status active 渲染 chip（文本 active）
    expect(screen.getAllByText('active')).toHaveLength(1);
  });

  it('点击新建 → 打开 Dialog → 保存调 dictionaryApi.create + 成功通知', async () => {
    render(<DictionaryPage />);
    await waitFor(() => screen.getByText('erp.dictionaries.code'));

    // 工具栏新建按钮
    fireEvent.click(screen.getByRole('button', { name: 'erp.dictionaries.create' }));
    // Dialog 打开（标题为 create）—— 用 getAllByText 因工具栏按钮文本与标题相同
    expect(screen.getAllByText('erp.dictionaries.create').length).toBeGreaterThan(1);

    // 填写表单
    fireEvent.change(screen.getByLabelText('erp.dictionaries.code'), { target: { value: 'NEW' } });
    fireEvent.change(screen.getByLabelText('erp.dictionaries.name'), {
      target: { value: '新字典' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'erp.dictionaries.save' }));

    await waitFor(() => {
      expect(dictionaryApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'NEW', name: '新字典' })
      );
    });
    expect(addNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', message: 'erp.dictionaries.saveSuccess' })
    );
  });

  it('点击编辑 → Dialog 打开并预填该行数据（openEdit 逻辑）', async () => {
    render(<DictionaryPage />);
    await waitFor(() => screen.getByText('CODE1'));

    // 定位 CODE1 所在行
    const code1Cell = screen.getByText('CODE1');
    const dataRow = code1Cell.closest('tr') as HTMLElement;
    const rowButtons = within(dataRow).getAllByRole('button');
    fireEvent.click(rowButtons[0]); // 编辑

    // Dialog 标题为 edit
    expect(screen.getByText('erp.dictionaries.edit')).toBeInTheDocument();
    // 预填 code/name/category/status
    expect(screen.getByLabelText('erp.dictionaries.code')).toHaveValue('CODE1');
    expect(screen.getByLabelText('erp.dictionaries.name')).toHaveValue('名称一');
    expect(screen.getByLabelText('erp.dictionaries.category')).toHaveValue('system');
    expect(screen.getByLabelText('erp.dictionaries.status')).toHaveValue('active');
  });

  it('点击删除 → 调 dictionaryApi.remove(id) + 成功通知', async () => {
    render(<DictionaryPage />);
    await waitFor(() => screen.getByText('CODE1'));

    const code1Cell = screen.getByText('CODE1');
    const dataRow = code1Cell.closest('tr') as HTMLElement;
    const rowButtons = within(dataRow).getAllByRole('button');
    fireEvent.click(rowButtons[1]); // 删除

    await waitFor(() => {
      expect(dictionaryApi.remove).toHaveBeenCalledWith('d1');
    });
    expect(addNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', message: 'erp.dictionaries.deleteSuccess' })
    );
  });

  it('搜索输入触发 list（search 参数）', async () => {
    render(<DictionaryPage />);
    await waitFor(() => screen.getByText('erp.dictionaries.code'));

    fireEvent.change(screen.getByPlaceholderText('erp.dictionaries.searchPlaceholder'), {
      target: { value: 'CODE' },
    });

    await waitFor(() => {
      expect(dictionaryApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'CODE' }));
    });
  });
});
