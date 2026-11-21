import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CustomerCreatePage from '../crm/CustomerCreatePage';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';

// 表单页（FormPageTemplate 模板）：in-spec 捕获 props，直接驱动 onSubmit/onCancel，
// 重点断言提交 payload 归一化（trim / 空串转 undefined / type→customer_type /
// description→notes）与成功（导航回列表）、失败（logger.error 且不导航）路径。
const mockNavigate = vi.hoisted(() => vi.fn());
const mockFormPageTemplateProps = vi.hoisted(() => vi.fn());

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: {
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

// setup-mocks 的 useMutation 在 onError 后会 rethrow；页面 handleSubmit 以
// mutateAsync + try/catch 调用。此处提供不 rethrow 的新鲜闭包 mock
// （PmProjectCreatePage 先例）。
vi.mock('@tanstack/react-query', () => ({
  useMutation: ({
    mutationFn,
    onSuccess,
  }: {
    mutationFn: (vars: unknown) => Promise<unknown>;
    onSuccess?: (result: unknown, vars: unknown) => void;
  }) => {
    const run = (vars: unknown) =>
      Promise.resolve()
        .then(() => mutationFn(vars))
        .then((result: unknown) => {
          onSuccess?.(result, vars);
          return result;
        });
    return {
      mutate: (vars: unknown) => {
        void run(vars);
      },
      mutateAsync: (vars: unknown) => run(vars),
      isPending: false,
    };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
}));

const rawFormData = {
  name: '  华北集团  ',
  code: ' HB-001 ',
  type: 'enterprise',
  industry: 'it',
  source: 'website',
  website: ' https://www.example.com ',
  phone: ' 0311-8888 ',
  email: ' contact@example.com ',
  address: ' 石家庄市长安区 ',
  description: ' 重要战略客户 ',
};

describe('CustomerCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmApi.customers.create).mockResolvedValue({
      success: true,
      data: { id: 'cust-1' },
    } as never);
  });

  it('renders through FormPageTemplate with sections, texts and cancel navigation', () => {
    render(<CustomerCreatePage />);

    expect(screen.getByTestId('form-page-template')).toBeInTheDocument();
    const props = mockFormPageTemplateProps.mock.calls[0][0];
    expect(props.submitting).toBe(false);
    expect(props.submitText).toBe('创建客户');
    expect(props.cancelText).toBe('取消');
    expect(props.sections as unknown[]).toHaveLength(3);
    expect(props.breadcrumbs as unknown[]).toHaveLength(4);

    (props.onCancel as () => void)();
    expect(mockNavigate).toHaveBeenCalledWith('/crm/customers');
  });

  it('creates customer with normalized payload and navigates to list on success', async () => {
    render(<CustomerCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)(rawFormData);

    await waitFor(() =>
      expect(crmApi.customers.create).toHaveBeenCalledWith({
        name: '华北集团',
        code: 'HB-001',
        customer_type: 'enterprise',
        industry: 'it',
        source: 'website',
        website: 'https://www.example.com',
        phone: '0311-8888',
        email: 'contact@example.com',
        address: '石家庄市长安区',
        notes: '重要战略客户',
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/crm/customers'));
  });

  it('omits empty optional fields as undefined in create payload', async () => {
    render(<CustomerCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)({
      name: '个体户',
      code: '',
      type: 'personal',
      industry: '',
      source: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      description: '',
    });

    await waitFor(() =>
      expect(crmApi.customers.create).toHaveBeenCalledWith({
        name: '个体户',
        code: undefined,
        customer_type: 'personal',
        industry: undefined,
        source: undefined,
        website: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        notes: undefined,
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/crm/customers'));
  });

  it('logs and does not navigate when create API rejects', async () => {
    vi.mocked(crmApi.customers.create).mockRejectedValue(new Error('network'));

    render(<CustomerCreatePage />);
    const props = mockFormPageTemplateProps.mock.calls[0][0];

    (props.onSubmit as (data: unknown) => void)(rawFormData);

    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith('Failed to create customer:', expect.any(Error))
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
