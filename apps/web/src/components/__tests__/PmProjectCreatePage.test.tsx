import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PmProjectCreatePage from '../pm/PmProjectCreatePage';
import { pmApi } from '@/api/pm';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

// 表单页（FormPageTemplate 模板）：in-spec 捕获 props，直接驱动 onSubmit/onCancel，
// 重点断言提交 payload 归一化（trim / ISO 日期补全 / tags 拆分 / budget 转数值）与
// 成功（code 200/201 导航 + 成功提示）、失败（服务端 message / 异常兜底提示）路径。
const mockNavigate = vi.hoisted(() => vi.fn());
const mockFormPageTemplateProps = vi.hoisted(() => vi.fn());

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

vi.mock('@/components/templates/FormPageTemplate', () => ({
  default: (props: Record<string, unknown>) => {
    mockFormPageTemplateProps(props);
    return <div data-testid='form-page-template' />;
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
  QueryClient: vi.fn(),
}));

const addNotification = () =>
  (
    useNotificationStore as unknown as {
      getState: () => { addNotification: ReturnType<typeof vi.fn> };
    }
  ).getState().addNotification;

const rawFormData = {
  name: '  Alpha Project  ',
  code: ' ALPHA-01 ',
  project_type: 'RESEARCH',
  description: '  project desc ',
  budget: '120.5',
  leader: '  li wei ',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  tags: ' a , b , c ',
};

describe('PmProjectCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through FormPageTemplate with sections and cancel navigation', () => {
    render(<PmProjectCreatePage />);

    expect(screen.getByTestId('form-page-template')).toBeInTheDocument();
    const props = mockFormPageTemplateProps.mock.calls[0][0];
    expect(props.submitting).toBe(false);
    expect(props.submitText).toBe('保存项目');
    expect(props.cancelText).toBe('取消');
    expect(props.sections as unknown[]).toHaveLength(5);

    (props.onCancel as () => void)();
    expect(mockNavigate).toHaveBeenCalledWith('/pm/projects');
  });

  it('creates project with normalized payload and navigates to detail on 200', async () => {
    vi.mocked(pmApi.projects.create).mockResolvedValue({
      code: 200,
      data: { id: 'proj-1' },
      message: 'OK',
    } as never);

    render(<PmProjectCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)(rawFormData);

    await waitFor(() =>
      expect(pmApi.projects.create).toHaveBeenCalledWith({
        name: 'Alpha Project',
        code: 'ALPHA-01',
        project_type: 'RESEARCH',
        description: 'project desc',
        budget: 120.5,
        leader: 'li wei',
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T00:00:00Z',
        tags: ['a', 'b', 'c'],
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/pm/projects/proj-1'));
    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith(
        expect.objectContaining({ message: '项目创建成功' })
      )
    );
  });

  it('shows server error message when response code is not 2xx', async () => {
    vi.mocked(pmApi.projects.create).mockResolvedValue({
      code: 400,
      data: null,
      message: 'duplicate code',
    } as never);

    render(<PmProjectCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)(rawFormData);

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'duplicate code' })
      )
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows generic failure notification and logs when create throws', async () => {
    vi.mocked(pmApi.projects.create).mockRejectedValue(new Error('network'));

    render(<PmProjectCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)(rawFormData);

    await waitFor(() =>
      expect(addNotification()).toHaveBeenCalledWith(
        expect.objectContaining({ message: '创建项目失败' })
      )
    );
    expect(logger.error).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
