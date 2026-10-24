import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TagPage from '../crm/TagPage';
import { tagApi } from '@/api/crm/tags';
import { useNotificationStore } from '@/store';

// 自绘列表页（PageContainer + MUI Table/Dialog），走 CapacityPage 形态：
// mock 页面实际 import 的 @/api/crm/tags 模块，断言 list 参数归一化、行渲染、
// 搜索 refetch、弹窗受控输入、创建/更新/删除精确 payload 与通知文案。
// 注：zh locale 的 crm.tags.* 文案经嵌套 crm 对象展开后可用，
// 渲染与通知断言直接使用真实中文译文。
vi.mock('@/api/crm/tags', () => ({
  tagApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

// setup-mocks 的 useMutation 以 mutationFn.toString() 为 useCallback 依赖，
// 页面 saveMutation 的 mutationFn 闭包直接读 useState 的 form/editingId，
// 重渲染后 toString 不变 → mutate 冻结在首渲染空 form 的旧闭包。
// 此处提供每渲染新鲜闭包的 react-query mock（CapacityPage 先例）。
const mockInvalidateQueries = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => {
  const useQuery = ({ queryKey, queryFn, enabled = true }: any) => {
    const [data, setData] = React.useState<any>(undefined);
    const [isLoading, setIsLoading] = React.useState(true);
    React.useEffect(() => {
      if (!enabled || !queryFn) return;
      let active = true;
      setIsLoading(true);
      Promise.resolve()
        .then(() => queryFn())
        .then((result: unknown) => {
          if (active) {
            setData(result);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [JSON.stringify(queryKey), enabled]);
    return { data, isLoading };
  };
  const useMutation = ({
    mutationFn,
    onSuccess,
    onError,
  }: {
    mutationFn: (vars?: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown, vars: unknown) => void;
    onError?: (err: unknown, vars: unknown) => void;
  }) => ({
    mutate: (vars?: unknown) => {
      Promise.resolve()
        .then(() => mutationFn(vars))
        .then((result: unknown) => onSuccess?.(result, vars))
        .catch((err: unknown) => onError?.(err, vars));
    },
    mutateAsync: (vars?: unknown) => mutationFn(vars),
    isPending: false,
  });
  return {
    useQuery,
    useMutation,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

const addNotification = () =>
  (
    useNotificationStore as unknown as {
      getState: () => { addNotification: ReturnType<typeof vi.fn> };
    }
  ).getState().addNotification;

const tagRow = {
  id: 'tag-1',
  name: 'VIP客户',
  color: '#FF0000',
  description: '重要客户标签',
};

const listResponse = {
  success: true,
  data: { items: [tagRow], total: 1, page: 1, page_size: 10 },
};

describe('TagPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tagApi.list).mockResolvedValue(listResponse as never);
    vi.mocked(tagApi.create).mockResolvedValue({
      success: true,
      data: { id: 'tag-new' },
    } as never);
    vi.mocked(tagApi.update).mockResolvedValue({ success: true, data: { id: 'tag-1' } } as never);
    vi.mocked(tagApi.remove).mockResolvedValue({ success: true } as never);
  });

  it('renders heading, columns and rows, and queries list with normalized page params', async () => {
    render(<TagPage />);

    expect(await screen.findByText('客户标签')).toBeInTheDocument();
    expect(screen.getByText('维护客户标签与营销分组')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索标签')).toBeInTheDocument();
    expect(screen.getByText('新建标签')).toBeInTheDocument();

    // 表头
    expect(screen.getByText('标签名称')).toBeInTheDocument();
    expect(screen.getByText('颜色')).toBeInTheDocument();
    expect(screen.getByText('描述')).toBeInTheDocument();

    // 行数据渲染
    expect(await screen.findByText('VIP客户')).toBeInTheDocument();
    expect(screen.getByText('#FF0000')).toBeInTheDocument();
    expect(screen.getByText('重要客户标签')).toBeInTheDocument();

    // list 参数：page 从 0 → 1，page_size 固定 10，空搜索为 undefined
    await waitFor(() =>
      expect(tagApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10, search: undefined })
    );
  });

  it('refetches with search keyword when typing in search box', async () => {
    render(<TagPage />);
    await screen.findByText('VIP客户');

    fireEvent.change(screen.getByPlaceholderText('搜索标签'), {
      target: { value: 'VIP' },
    });

    await waitFor(() =>
      expect(tagApi.list).toHaveBeenLastCalledWith({ page: 1, page_size: 10, search: 'VIP' })
    );
  });

  it('opens create dialog, binds controlled inputs and creates with exact payload', async () => {
    render(<TagPage />);
    await screen.findByText('VIP客户');

    fireEvent.click(screen.getByText('新建标签'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建标签');

    const nameInput = within(dialog).getByLabelText('标签名称');
    fireEvent.change(nameInput, { target: { value: '渠道客户' } });
    expect(nameInput).toHaveValue('渠道客户');
    fireEvent.change(within(dialog).getByLabelText('颜色'), {
      target: { value: '#00FF00' },
    });
    fireEvent.change(within(dialog).getByLabelText('描述'), {
      target: { value: '渠道标签' },
    });

    fireEvent.click(within(dialog).getByText('保存'));

    // 新鲜闭包 mock 下 mutationFn 读取当前受控 form，可断言精确 payload
    await waitFor(() =>
      expect(tagApi.create).toHaveBeenCalledWith({
        name: '渠道客户',
        color: '#00FF00',
        description: '渠道标签',
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '标签保存成功',
      })
    );
  });

  it('edit backfills row data and updates with id plus payload', async () => {
    render(<TagPage />);
    const rowCell = await screen.findByText('VIP客户');
    const row = rowCell.closest('tr') as HTMLElement;

    // 行内按钮顺序：编辑（Pencil）在前，删除（Trash2）在后
    fireEvent.click(row.querySelectorAll('button')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('编辑标签');

    expect(within(dialog).getByLabelText('标签名称')).toHaveValue('VIP客户');
    expect(within(dialog).getByLabelText('颜色')).toHaveValue('#FF0000');
    expect(within(dialog).getByLabelText('描述')).toHaveValue('重要客户标签');

    fireEvent.change(within(dialog).getByLabelText('颜色'), {
      target: { value: '#111111' },
    });
    fireEvent.click(within(dialog).getByText('保存'));

    await waitFor(() =>
      expect(tagApi.update).toHaveBeenCalledWith('tag-1', {
        name: 'VIP客户',
        color: '#111111',
        description: '重要客户标签',
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '标签保存成功',
      })
    );
  });

  it('calls remove with row id when clicking delete button', async () => {
    render(<TagPage />);
    const rowCell = await screen.findByText('VIP客户');
    const row = rowCell.closest('tr') as HTMLElement;

    fireEvent.click(row.querySelectorAll('button')[1]);

    await waitFor(() => expect(tagApi.remove).toHaveBeenCalledWith('tag-1'));
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '标签删除成功',
      })
    );
  });

  it('create failure shows saveFailed error notification', async () => {
    vi.mocked(tagApi.create).mockRejectedValueOnce(new Error('network'));

    render(<TagPage />);
    await screen.findByText('VIP客户');

    fireEvent.click(screen.getByText('新建标签'));
    fireEvent.change(await screen.findByLabelText('标签名称'), {
      target: { value: '坏标签' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'error',
        message: '标签保存失败',
      })
    );
  });
});
