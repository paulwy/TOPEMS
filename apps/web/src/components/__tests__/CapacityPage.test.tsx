import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CapacityPage from '../mes/CapacityPage';
import { capacityApi } from '@/api/mes/capacity';
import { useNotificationStore } from '@/store';

// 页面自绘 MUI 表格 + Dialog 表单（非 CrudPage 模板），
// list/create/update/remove 逐一 mock；后端单层 ApiResponse，页面从 data.data.items 取行。
vi.mock('@/api/mes/capacity', () => ({
  capacityApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'success',
      data: {
        items: [
          {
            id: 'cap-1',
            work_center_name: 'WC-01',
            capacity_date: '2026-10-01',
            available_hours: 8,
            used_hours: 6,
            utilization_rate: 75,
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true, code: 200, data: { id: 'cap-new' } }),
    update: vi.fn().mockResolvedValue({ success: true, code: 200, data: { id: 'cap-1' } }),
    remove: vi.fn().mockResolvedValue({ success: true, code: 200, data: 'cap-1' }),
  },
}));

// setup-mocks 的 useMutation 用 mutationFn.toString() 做 useCallback 依赖，
// 页面 mutationFn 闭包直接读 useState 的 form/editingId，重渲染后 toString 不变导致
// mutate 永远持有首渲染空 form 的旧闭包。此处提供每渲染新鲜闭包的 react-query mock。
const mockInvalidateQueries = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => {
  const useQuery = ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
    const [data, setData] = React.useState<unknown>(undefined);
    const [isLoading, setIsLoading] = React.useState(true);
    React.useEffect(() => {
      let active = true;
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
    }, []);
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

describe('CapacityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries list with page params on mount and renders rows through real MUI table', async () => {
    render(<CapacityPage />);

    expect(await screen.findByText('WC-01')).toBeInTheDocument();
    expect(screen.getByText('2026-10-01')).toBeInTheDocument();
    expect(capacityApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10, search: undefined });
  });

  it('opens create dialog, fills fields and creates with exact payload', async () => {
    render(<CapacityPage />);
    expect(await screen.findByText('WC-01')).toBeInTheDocument();

    fireEvent.click(screen.getByText('新建产能'));

    fireEvent.change(await screen.findByLabelText('工作中心'), {
      target: { value: 'WC-09' },
    });
    fireEvent.change(screen.getByLabelText('日期'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('可用工时'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('状态'), {
      target: { value: 'active' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(capacityApi.create).toHaveBeenCalledWith({
        work_center_name: 'WC-09',
        capacity_date: '2026-11-01',
        available_hours: '10',
        status: 'active',
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '产能保存成功',
      })
    );
  });

  it('edit backfills row data and sends update with id plus payload', async () => {
    render(<CapacityPage />);
    const rowCell = await screen.findByText('WC-01');
    const row = rowCell.closest('tr') as HTMLElement;

    fireEvent.click(row.querySelectorAll('button')[0]);

    expect(await screen.findByLabelText('工作中心')).toHaveValue('WC-01');
    expect(screen.getByLabelText('可用工时')).toHaveValue('8');

    fireEvent.change(screen.getByLabelText('可用工时'), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(capacityApi.update).toHaveBeenCalledWith('cap-1', {
        work_center_name: 'WC-01',
        capacity_date: '2026-10-01',
        available_hours: '12',
        status: 'active',
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '产能保存成功',
      })
    );
  });

  it('delete calls remove(id) and shows success notification', async () => {
    render(<CapacityPage />);
    const rowCell = await screen.findByText('WC-01');
    const row = rowCell.closest('tr') as HTMLElement;

    fireEvent.click(row.querySelectorAll('button')[1]);

    await waitFor(() => expect(capacityApi.remove).toHaveBeenCalledWith('cap-1'));
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '产能删除成功',
      })
    );
  });

  it('create failure shows saveFailed error notification', async () => {
    vi.mocked(capacityApi.create).mockRejectedValueOnce(new Error('network'));

    render(<CapacityPage />);
    expect(await screen.findByText('WC-01')).toBeInTheDocument();

    fireEvent.click(screen.getByText('新建产能'));
    fireEvent.change(await screen.findByLabelText('工作中心'), {
      target: { value: 'WC-99' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'error',
        message: '产能保存失败',
      })
    );
  });
});
