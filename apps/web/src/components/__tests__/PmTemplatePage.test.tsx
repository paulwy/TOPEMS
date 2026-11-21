import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PmTemplatePage from '../pm/PmTemplatePage';
import { pmApi } from '@/api/pm';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

// ListPageTemplate 壳 + 静态模板列表（自绘页）：
// setup-mocks 的全局 ListPageTemplate mock 忽略 renderCardView 直接渲染 cell，
// 这里 in-spec 重写 barrel 模板：渲染 actions 按钮 + renderCardView(data) + children，
// 从而驱动「选模板 → 弹窗确认 → 创建项目」路径，
// 断言 payload、成功导航（response.success）、失败错误提示（title+message）。
const mockNavigate = vi.hoisted(() => vi.fn());
const mockModalProps = vi.hoisted(() => vi.fn());

vi.mock('@/api/pm', () => ({
  pmApi: {
    projects: {
      create: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/templates', () => ({
  ListPageTemplate: (props: {
    actions?: { label: string; onClick: () => void }[];
    data?: unknown[];
    renderCardView?: (data: unknown[]) => React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {(props.actions ?? []).map((a, i) => (
        <button
          key={i}
          onClick={a.onClick}
        >
          {a.label}
        </button>
      ))}
      {props.renderCardView?.(props.data ?? [])}
      {props.children}
    </div>
  ),
}));

vi.mock('@/components/pm/ProjectTemplateCard', () => ({
  default: ({
    template,
    onSelect,
  }: {
    template: { id: string; name: string };
    onSelect: (t: unknown) => void;
  }) => (
    <button
      data-testid={`card-${template.id}`}
      onClick={() => onSelect(template)}
    >
      {template.name}
    </button>
  ),
}));

vi.mock('@/components/pm/ProjectTemplateModal', () => ({
  default: (props: {
    open: boolean;
    template: { description?: string; project_type?: string } | null;
    onConfirm: (data: Record<string, unknown>) => void;
  }) => {
    mockModalProps(props);
    return (
      <button
        data-testid='modal-confirm'
        onClick={() =>
          props.onConfirm({
            name: 'T1',
            code: 'T-1',
            description: props.template?.description ?? '',
            project_type: props.template?.project_type ?? 'general',
            budget: 80000,
            start_date: '2026-02-01',
          })
        }
      >
        confirm
      </button>
    );
  },
}));

// setup-mocks 的 useMutation 在 onError 后会 rethrow（页面以 void mutate() 调用，
// 产生 unhandled rejection）。此处提供不 rethrow 的新鲜闭包 mock。
vi.mock('@tanstack/react-query', () => ({
  useMutation: ({
    mutationFn,
    onSuccess,
    onError,
  }: {
    mutationFn: (vars: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown, vars: unknown) => void;
    onError?: (err: unknown, vars: unknown) => void;
  }) => ({
    mutate: (vars: unknown) => {
      Promise.resolve()
        .then(() => mutationFn(vars))
        .then((result: unknown) => onSuccess?.(result, vars))
        .catch((err: unknown) => onError?.(err, vars));
    },
    mutateAsync: (vars: unknown) => mutationFn(vars),
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(function QueryClient() {
    return { invalidateQueries: vi.fn() };
  }),
}));

const addNotification = () =>
  (
    useNotificationStore as unknown as {
      getState: () => { addNotification: ReturnType<typeof vi.fn> };
    }
  ).getState().addNotification;

describe('PmTemplatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders static templates through cards and new-project action navigates', () => {
    render(<PmTemplatePage />);

    // 真实 zh 模板数据（页面内静态 useMemo）经 renderCardView 渲染为卡片
    expect(screen.getByText('研发项目模板')).toBeInTheDocument();
    expect(screen.getByText('生产项目模板')).toBeInTheDocument();

    fireEvent.click(screen.getByText('新建项目'));
    expect(mockNavigate).toHaveBeenCalledWith('/pm/projects/create');
  });

  it('selecting a template and confirming creates project and navigates on success', async () => {
    vi.mocked(pmApi.projects.create).mockResolvedValue({ success: true } as never);

    render(<PmTemplatePage />);

    fireEvent.click(screen.getByTestId('card-1'));
    const modalProps = mockModalProps.mock.calls[mockModalProps.mock.calls.length - 1][0];
    expect(modalProps.open).toBe(true);
    expect(modalProps.template.id).toBe('1');

    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() =>
      expect(pmApi.projects.create).toHaveBeenCalledWith({
        name: 'T1',
        code: 'T-1',
        description:
          '适用于软件研发、产品开发等技术类项目，包含需求分析、设计、开发、测试、上线等阶段',
        project_type: 'research',
        budget: 80000,
        start_date: '2026-02-01',
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/pm/projects'));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.PM.PROJECTS,
      exact: false,
      refetchType: 'active',
    });
  });

  it('does not navigate when create response success is false', async () => {
    vi.mocked(pmApi.projects.create).mockResolvedValue({ success: false } as never);

    render(<PmTemplatePage />);
    fireEvent.click(screen.getByTestId('card-2'));
    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() => expect(pmApi.projects.create).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalledWith('/pm/projects');
  });

  it('create failure notifies error with title and logs', async () => {
    vi.mocked(pmApi.projects.create).mockRejectedValue(new Error('network'));

    render(<PmTemplatePage />);
    fireEvent.click(screen.getByTestId('card-3'));
    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith({
        title: '错误',
        message: '搜索模板名称、类型或标签...',
        type: 'error',
      })
    );
    expect(logger.error).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
