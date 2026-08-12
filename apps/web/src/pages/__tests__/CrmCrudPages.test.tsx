import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactManagementPage from '../crm/ContactManagementPage';
import InteractionManagementPage from '../crm/InteractionManagementPage';
import ReturnListPage from '../crm/ReturnListPage';
import { crmApi, interactionApi, returnsApi } from '@/api/crm';

const mockCrudPage = vi.hoisted(() => vi.fn());
const mockCreateCrudPageAdapter = vi.hoisted(() =>
  vi.fn((handlers) => ({
    list: handlers.list,
    create: handlers.create,
    update: handlers.update,
    delete: handlers.delete,
  }))
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schema/crudPageAdapter', () => ({
  createCrudPageAdapter: mockCreateCrudPageAdapter,
}));

vi.mock('@/schemas/crm/contact', () => ({
  contactSchema: { name: 'contactSchema' },
}));

vi.mock('@/schemas/crm', () => ({
  interactionSchema: { name: 'interactionSchema' },
  returnSchema: { name: 'returnSchema' },
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    contacts: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'contact-1', name: '张三' }], total: 1 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'contact-2', name: '李四' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'contact-1', name: '王五' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
  interactionApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  returnsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CrmCrudPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contact management through CrudPage with CRM breadcrumbs', () => {
    render(<ContactManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'contactSchema' },
        breadcrumbs: [
          { label: 'crm.common.home', href: '/dashboard' },
          { label: 'crm.common.crm', href: '/crm' },
          { label: 'crm.contactList.title' },
        ],
      })
    );
  });

  it('maps contact list params and response for CrudPage', async () => {
    render(<ContactManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: '张',
      status: 'active',
    });

    expect(crmApi.contacts.list).toHaveBeenCalledWith({
      page: 2,
      pagesize: 20,
      search: '张',
      status: 'active',
    });
    expect(result).toEqual({
      data: [{ id: 'contact-1', name: '张三' }],
      total: 1,
    });
  });

  it('delegates contact create, update and delete operations', async () => {
    render(<ContactManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '李四' })).resolves.toEqual({
      id: 'contact-2',
      name: '李四',
    });
    await expect(props.apiAdapter.update('contact-1', { name: '王五' })).resolves.toEqual({
      id: 'contact-1',
      name: '王五',
    });
    await expect(props.apiAdapter.delete('contact-1')).resolves.toBeUndefined();

    expect(crmApi.contacts.create).toHaveBeenCalledWith({ name: '李四' });
    expect(crmApi.contacts.update).toHaveBeenCalledWith('contact-1', { name: '王五' });
    expect(crmApi.contacts.delete).toHaveBeenCalledWith('contact-1');
  });

  it('throws translated errors when contact API operations fail', async () => {
    vi.mocked(crmApi.contacts.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(crmApi.contacts.create).mockResolvedValueOnce({ success: false });
    vi.mocked(crmApi.contacts.update).mockResolvedValueOnce({ success: false });
    vi.mocked(crmApi.contacts.delete).mockResolvedValueOnce({ success: false });

    render(<ContactManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('crm.contactList.error_load_list');
    await expect(props.apiAdapter.create({})).rejects.toThrow('crm.contactList.error_create');
    await expect(props.apiAdapter.update('contact-1', {})).rejects.toThrow(
      'crm.contactList.error_update'
    );
    await expect(props.apiAdapter.delete('contact-1')).rejects.toThrow(
      'crm.contactList.error_delete'
    );
  });

  it('renders interaction management with adapter-backed API methods', () => {
    render(<InteractionManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'interactionSchema' },
        breadcrumbs: [{ label: 'crm.common.crm' }, { label: 'crm.interactionList.title' }],
      })
    );
    expect(props.apiAdapter).toEqual(
      expect.objectContaining({
        list: expect.any(Function),
        create: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      })
    );
  });

  it('renders return list with adapter-backed API methods', () => {
    render(<ReturnListPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'returnSchema' },
        breadcrumbs: [{ label: 'crm.common.crm' }, { label: 'crm.returnList.title' }],
      })
    );
    expect(props.apiAdapter).toEqual(
      expect.objectContaining({
        list: expect.any(Function),
        create: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      })
    );
  });
});
