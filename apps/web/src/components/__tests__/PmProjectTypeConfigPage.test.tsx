import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PmProjectTypeConfigPage from '../pm/PmProjectTypeConfigPage';
import { projectTypeConfigApi } from '@/api/pm/projectTypeConfig';
import { useNotificationStore } from '@/store';

// 页面自绘 MUI 表格 + Dialog 表单（非 CrudPage 模板），
// list/create/update/remove 逐一 mock；响应为 axios 双层解包（页面取 .data.data）。
vi.mock('@/api/pm/projectTypeConfig', () => ({
  projectTypeConfigApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 'tpc-1',
              type_code: 'RND-001',
              type_name: 'Research Project',
              name_en: 'Research',
              description: 'desc-1',
              is_active: true,
            },
            {
              id: 'tpc-2',
              type_code: 'BLD-002',
              type_name: 'Building Project',
              name_en: 'Building',
              description: 'desc-2',
              is_active: false,
            },
          ],
          total: 2,
          page: 1,
          page_size: 10,
        },
      },
    }),
    create: vi.fn().mockResolvedValue({ data: { success: true, data: { id: 'tpc-new' } } }),
    update: vi.fn().mockResolvedValue({ data: { success: true, data: { id: 'tpc-1' } } }),
    remove: vi.fn().mockResolvedValue({ data: { success: true, data: 'tpc-1' } }),
  },
}));

// setup-mocks 的 useMutation 用 mutationFn.toString() 做 useCallback 依赖，
// 页面 mutationFn 闭包直接读 useState 的 form，重渲染后 toString 不变导致
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

describe('PmProjectTypeConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries list with page params and renders rows through real MUI table', async () => {
    render(<PmProjectTypeConfigPage />);

    expect(await screen.findByText('RND-001')).toBeInTheDocument();
    expect(screen.getByText('Building Project')).toBeInTheDocument();
    expect(projectTypeConfigApi.list).toHaveBeenCalledWith({ page: 1, page_size: 10 });
  });

  it('creates a type config via dialog with normalized payload and success notification', async () => {
    render(<PmProjectTypeConfigPage />);
    expect(await screen.findByText('RND-001')).toBeInTheDocument();

    fireEvent.click(screen.getByText('新建'));

    fireEvent.change(await screen.findByLabelText('类型编码'), {
      target: { value: 'MKT-003' },
    });
    fireEvent.change(screen.getByLabelText('类型名称'), {
      target: { value: 'Marketing Project' },
    });
    fireEvent.change(screen.getByLabelText('英文名称'), {
      target: { value: 'Marketing' },
    });
    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: 'desc-new' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(projectTypeConfigApi.create).toHaveBeenCalledWith({
        type_code: 'MKT-003',
        type_name: 'Marketing Project',
        name_en: 'Marketing',
        description: 'desc-new',
        default_phases: null,
        default_milestones: null,
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '保存成功',
      })
    );
  });

  it('update sends id plus payload without type_code and notifies success', async () => {
    render(<PmProjectTypeConfigPage />);
    const rowCell = await screen.findByText('RND-001');
    const row = rowCell.closest('tr') as HTMLElement;

    const editButton = row.querySelectorAll('button')[0];
    fireEvent.click(editButton);

    fireEvent.change(await screen.findByLabelText('类型名称'), {
      target: { value: 'Research Project V2' },
    });
    fireEvent.change(screen.getByLabelText('英文名称'), {
      target: { value: 'Research V2' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(projectTypeConfigApi.update).toHaveBeenCalledWith('tpc-1', {
        type_name: 'Research Project V2',
        name_en: 'Research V2',
        description: 'desc-1',
        default_phases: null,
        default_milestones: null,
      })
    );
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '保存成功',
      })
    );
  });

  it('delete calls remove(id) and shows success notification', async () => {
    render(<PmProjectTypeConfigPage />);
    const rowCell = await screen.findByText('RND-001');
    const row = rowCell.closest('tr') as HTMLElement;

    fireEvent.click(row.querySelectorAll('button')[1]);

    await waitFor(() => expect(projectTypeConfigApi.remove).toHaveBeenCalledWith('tpc-1'));
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'success',
        message: '删除成功',
      })
    );
  });

  it('create failure shows saveFailed notification', async () => {
    vi.mocked(projectTypeConfigApi.create).mockRejectedValueOnce(new Error('network'));

    render(<PmProjectTypeConfigPage />);
    expect(await screen.findByText('RND-001')).toBeInTheDocument();

    fireEvent.click(screen.getByText('新建'));
    fireEvent.change(await screen.findByLabelText('类型编码'), { target: { value: 'X-1' } });
    fireEvent.change(screen.getByLabelText('类型名称'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'error',
        message: '保存失败',
      })
    );
  });

  it('delete failure shows deleteFailed notification', async () => {
    vi.mocked(projectTypeConfigApi.remove).mockRejectedValueOnce(new Error('network'));

    render(<PmProjectTypeConfigPage />);
    const rowCell = await screen.findByText('BLD-002');
    const row = rowCell.closest('tr') as HTMLElement;

    fireEvent.click(row.querySelectorAll('button')[1]);

    await waitFor(() => expect(projectTypeConfigApi.remove).toHaveBeenCalledWith('tpc-2'));
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        type: 'error',
        message: '删除失败',
      })
    );
  });
});
