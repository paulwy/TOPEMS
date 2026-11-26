import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CrmCustomerRedesignPage from '../crm/CrmCustomerRedesignPage';
import { customerApi } from '@/api/crm/customer';

// A-08 / A-09 集成验证：真实 CrmCustomerRedesignPage 的新建客户弹窗
// 1) 必填留空 → 不发请求、行内报错 + toast
// 2) 补齐必填 → 提交一次，提交期间按钮禁用且重复点击不再发请求
// 3) 提交成功后弹窗关闭
//
// 与 CrmCustomerRedesignPage.test.tsx 的区别：本文件把 redesign 的 Input/Select
// 保留 id、并渲染 error 文案（该页仍按 DOM id 取值），react-query 的 useMutation
// 实现带真实 isPending 状态，因此能验证"提交锁"而不是只断言最终副作用。

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

vi.mock('@/utils/i18n', () => ({
  localizedName: (zh: string) => zh,
}));

vi.mock('@/api/crm/customer', () => ({
  customerApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { list: [], total: 0 } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/redesign', () => {
  const ListPageTemplate = (p: { children?: React.ReactNode }) => {
    mockListPage(p);
    return <div data-testid='list-page-template'>{p.children}</div>;
  };
  const Modal = (p: { open?: boolean; children?: React.ReactNode; footer?: React.ReactNode }) =>
    p.open ? (
      <div data-testid='modal'>
        {p.children}
        {p.footer}
      </div>
    ) : null;
  const Drawer = (p: { open?: boolean; children?: React.ReactNode }) =>
    p.open ? <div data-testid='drawer'>{p.children}</div> : null;
  const Input = (p: {
    id?: string;
    defaultValue?: string;
    placeholder?: string;
    error?: string;
    onChange?: () => void;
  }) => (
    <div>
      <input
        id={p.id}
        defaultValue={p.defaultValue}
        placeholder={p.placeholder}
        onChange={p.onChange}
      />
      {p.error ? <span data-testid={`err-${p.id}`}>{p.error}</span> : null}
    </div>
  );
  const Select = (p: {
    id?: string;
    defaultValue?: string;
    error?: string;
    options?: { value: string; label: string }[];
    onChange?: () => void;
  }) => (
    <div>
      <select
        id={p.id}
        defaultValue={p.defaultValue}
        onChange={p.onChange}
      >
        {(p.options ?? []).map((o) => (
          <option
            key={o.value}
            value={o.value}
          >
            {o.label}
          </option>
        ))}
      </select>
      {p.error ? <span data-testid={`err-${p.id}`}>{p.error}</span> : null}
    </div>
  );
  const Button = (p: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button
      onClick={p.onClick}
      disabled={p.disabled}
    >
      {p.children}
    </button>
  );
  const ToastContainer = (p: { toasts?: { id: string; message: string }[] }) => (
    <div data-testid='toasts'>
      {(p.toasts ?? []).map((t) => (
        <div key={t.id}>{t.message}</div>
      ))}
    </div>
  );
  const Pass = (p: { children?: React.ReactNode }) => <div>{p.children}</div>;
  return {
    Badge: Pass,
    Button,
    Card: Pass,
    Drawer,
    Input,
    ListPageTemplate,
    Modal,
    Pagination: () => null,
    Select,
    StatTile: Pass,
    Tabs: () => null,
    Tab: Pass,
    Tag: Pass,
    ToastContainer,
  };
});

// 带真实 isPending 的 useMutation：run() 内 setPending(true) → 组件重渲染 → 按钮禁用
vi.mock('@tanstack/react-query', async () => {
  const React = await import('react');
  return {
    useQuery: () => ({
      data: { customers: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMutation: (opts: {
      mutationFn: (arg: unknown) => Promise<unknown>;
      onSuccess?: (r: unknown) => void;
      onError?: (e: unknown) => void;
    }) => {
      const [isPending, setPending] = React.useState(false);
      const run = async (arg: unknown) => {
        setPending(true);
        try {
          const result = await opts.mutationFn(arg);
          opts.onSuccess?.(result);
          return result;
        } catch (error) {
          opts.onError?.(error);
          throw error;
        } finally {
          setPending(false);
        }
      };
      return {
        mutate: (arg: unknown) => {
          void run(arg).catch(() => {});
        },
        mutateAsync: run,
        isPending,
      };
    },
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

const openCreateModal = async () => {
  const view = render(<CrmCustomerRedesignPage />);
  await screen.findByTestId('list-page-template');
  const props = mockListPage.mock.calls.at(-1)?.[0] as { toolbar?: React.ReactNode };
  const toolbar = render(<>{props.toolbar}</>);
  fireEvent.click(toolbar.getByText('crm.customer_list_page.btn_create'));
  await screen.findByTestId('modal');
  return { view, toolbar };
};

describe('CRM 新建客户弹窗 · A-08 校验 / A-09 防重复提交', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      customerApi.create as unknown as { mockResolvedValue: (v: unknown) => void }
    ).mockResolvedValue({
      success: true,
    });
  });

  it('必填留空点击提交：不发请求，出现行内报错与 toast', async () => {
    await openCreateModal();

    fireEvent.click(screen.getByText('crm.customer_list_page.btn_submit_create'));

    await waitFor(() =>
      expect(screen.getByTestId('err-field-1')).toHaveTextContent(
        'crm.customer_list_page.err_customer_name_required'
      )
    );
    expect(screen.getByTestId('toasts')).toHaveTextContent(
      'crm.customer_list_page.toast_form_invalid'
    );
    expect(customerApi.create).not.toHaveBeenCalled();
    // 校验失败不关弹窗，输入内容保留
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('邮箱格式非法：给出字段级报错且不发请求', async () => {
    await openCreateModal();

    fireEvent.change(document.getElementById('field-1') as HTMLInputElement, {
      target: { value: '验证客户A' },
    });
    fireEvent.change(document.getElementById('field-6') as HTMLInputElement, {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByText('crm.customer_list_page.btn_submit_create'));

    await waitFor(() =>
      expect(screen.getByTestId('err-field-6')).toHaveTextContent(
        'crm.customer_list_page.err_email_invalid'
      )
    );
    expect(customerApi.create).not.toHaveBeenCalled();
  });

  it('补齐必填后提交一次；提交期间按钮禁用、重复点击不再发请求；成功后关闭弹窗', async () => {
    await openCreateModal();

    let release: ((v: unknown) => void) | undefined;
    (
      customerApi.create as unknown as { mockImplementation: (fn: () => unknown) => void }
    ).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    fireEvent.change(document.getElementById('field-1') as HTMLInputElement, {
      target: { value: '验证客户A' },
    });
    fireEvent.click(screen.getByText('crm.customer_list_page.btn_submit_create'));

    // 提交中：文案切到 btn_submitting，按钮禁用
    await waitFor(() =>
      expect(screen.getByText('crm.customer_list_page.btn_submitting')).toBeInTheDocument()
    );
    expect(screen.getByText('crm.customer_list_page.btn_submitting')).toBeDisabled();

    fireEvent.click(screen.getByText('crm.customer_list_page.btn_submitting'));
    expect(customerApi.create).toHaveBeenCalledTimes(1);
    expect(customerApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: '验证客户A' }));

    await act(async () => {
      release?.({ success: true });
    });

    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
    expect(customerApi.create).toHaveBeenCalledTimes(1);
  });
});
