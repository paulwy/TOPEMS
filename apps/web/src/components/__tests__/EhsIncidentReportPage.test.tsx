import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EhsIncidentReportPage from '../ehs/EhsIncidentReportPage';
import { ehsApi } from '@/api/ehs';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页用裸方法对象 { list/create/update/delete } 走真实适配器，需恢复真实实现。
vi.unmock('@/schema-dsl/crudPageAdapter');

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'ehs.ehs_incident_report_page.k0': '事件上报',
      };
      return translations[key] ?? key;
    },
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

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

vi.mock('@/schemas/ehs', () => ({
  incidentReportSchema: { name: 'incidentReportSchema' },
}));

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listIncidents: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          { id: 'inc-1', title: '机械伤害', status: 'open' },
          { id: 'inc-2', title: '化学品泄漏', status: 'closed' },
        ],
        total: 2,
      },
    }),
    createIncident: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'inc-9', title: '新报事件', status: 'open' },
    }),
    updateIncident: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'inc-1', title: '机械伤害', status: 'closed' },
    }),
    deleteIncident: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('EhsIncidentReportPage（批次4）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with incident schema and EHS breadcrumbs', () => {
    render(<EhsIncidentReportPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'incidentReportSchema' },
        breadcrumbs: [{ label: 'EHS' }, { label: '事件上报' }],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unwraps incident response', async () => {
    render(<EhsIncidentReportPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 1,
      pageSize: 50,
      search: '机械',
      status: 'open',
    });

    // 页面对裸方法对象做适配：listIncidents 直接接收归一化后的查询参数
    expect(ehsApi.listIncidents).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
      search: '机械',
      status: 'open',
    });
    expect(result).toEqual({
      data: [
        { id: 'inc-1', title: '机械伤害', status: 'open' },
        { id: 'inc-2', title: '化学品泄漏', status: 'closed' },
      ],
      total: 2,
    });
  });

  it('delegates create, update and delete to ehs incident methods', async () => {
    render(<EhsIncidentReportPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ title: '新报事件' })).resolves.toEqual({
      id: 'inc-9',
      title: '新报事件',
      status: 'open',
    });
    await expect(props.apiAdapter.update('inc-1', { status: 'closed' })).resolves.toEqual({
      id: 'inc-1',
      title: '机械伤害',
      status: 'closed',
    });
    await expect(props.apiAdapter.delete('inc-1')).resolves.toBeUndefined();

    expect(ehsApi.createIncident).toHaveBeenCalledWith({ title: '新报事件' });
    expect(ehsApi.updateIncident).toHaveBeenCalledWith('inc-1', { status: 'closed' });
    expect(ehsApi.deleteIncident).toHaveBeenCalledWith('inc-1');
  });

  it('throws translated errors when incident API operations fail', async () => {
    vi.mocked(ehsApi.listIncidents).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(ehsApi.createIncident).mockResolvedValueOnce({ success: false });
    vi.mocked(ehsApi.updateIncident).mockResolvedValueOnce({ success: false });
    vi.mocked(ehsApi.deleteIncident).mockResolvedValueOnce({ success: false });

    render(<EhsIncidentReportPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('inc-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('inc-1')).rejects.toThrow('删除失败');
  });
});
