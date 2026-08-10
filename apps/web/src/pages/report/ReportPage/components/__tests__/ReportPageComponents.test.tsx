import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ReportHeader from '../ReportHeader';
import SearchFilterBar from '../SearchFilterBar';
import TabSwitcher from '../TabSwitcher';
import LoadingState from '../LoadingState';
import ServiceDownState from '../ServiceDownState';
import ReportStats from '../ReportStats';
import NotificationToast from '../NotificationToast';
import ReportList from '../ReportList';
import TemplateList from '../TemplateList';
import TemplateFormDialog from '../TemplateFormDialog';
import type {
  CreateTemplateRequest,
  ReportData,
  ReportTemplate,
  ReportTypeInfo,
} from '@/api/report';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockInvalidateQueries = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@/routes/dashboard', () => ({
  DASHBOARD_PATHS: {
    dashboard: '/dashboard',
  },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    REPORT: {
      TEMPLATES: ['report', 'templates'],
    },
  },
}));

vi.mock('lucide-react', async () => {
  const icon =
    (name: string) =>
    ({ sx: _sx, ...props }: Record<string, unknown>) => (
      <svg
        data-testid={`icon-${name}`}
        {...props}
      />
    );

  return {
    Calendar: icon('calendar'),
    CheckCircle: icon('check-circle'),
    Columns: icon('columns'),
    Download: icon('download'),
    Eye: icon('eye'),
    File: icon('file'),
    FileText: icon('file-text'),
    FileSpreadsheet: icon('file-spreadsheet'),
    LayoutTemplate: icon('layout-template'),
    Loader2: icon('loader'),
    Plus: icon('plus'),
    Play: icon('play'),
    Search: icon('search'),
    Trash2: icon('trash'),
    X: icon('x'),
    Edit: icon('edit'),
  };
});

const reportTypes: ReportTypeInfo[] = [
  { type: 'rs_project_progress', name: '项目进度报表', module: 'RS' },
  { type: 'lims_sample_summary', name: '样品汇总报表', module: 'LIMS' },
  { type: 'qms_quality_analysis', name: '质量分析报表', module: 'QMS' },
];

const reports: ReportData[] = [
  {
    id: 'report-1',
    config: {
      report_type: 'rs_project_progress',
      format: 'pdf',
      title: '项目进度月报',
      description: '展示项目计划和完成进度',
      columns: ['project', 'progress', 'owner'],
    },
    data: [{ project: '智慧工厂', progress: 80 }],
    row_count: 18,
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'report-2',
    config: {
      report_type: 'lims_sample_summary',
      format: 'excel',
      title: '样品汇总报表',
      columns: ['sample', 'status'],
    },
    data: [{ sample: 'S-001', status: 'done' }],
    row_count: 7,
    created_at: '2026-08-02T00:00:00Z',
  },
  {
    id: 'report-3',
    config: {
      report_type: 'qms_quality_analysis',
      format: 'csv',
      title: '质量分析报表',
      columns: ['batch'],
    },
    data: [],
    row_count: 3,
    created_at: '2026-08-03T00:00:00Z',
  },
];

const template: ReportTemplate = {
  id: 'template-1',
  name: '项目进度模板',
  code: 'TPL_PM_PROGRESS',
  description: '按项目输出进度概览',
  category: '项目',
  report_type: 'rs_project_progress',
  isactive: true,
  outputformat: 'pdf',
  columns: [{ key: 'project' }, { key: 'progress' }],
  data_source: { source_type: 'sql', query: 'select * from projects', params: {} },
  layout_config: {
    layout_type: 'table',
    orientation: 'portrait',
    papersize: 'A4',
    margins: {},
    sections: {},
  },
  filter_config: { conditions: [], sort_by: [] },
  style_config: {
    theme: 'default',
    colors: {},
    fonts: {},
    borders: {},
    header_style: {},
    body_style: {},
  },
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

const templateFormData: CreateTemplateRequest = {
  name: '项目进度模板',
  code: 'TPL_PM_PROGRESS',
  description: '按项目输出进度概览',
  category: '项目',
  report_type: 'rs_project_progress',
  isactive: true,
  outputformat: 'pdf',
  columns: [{ key: 'project', title: '项目' }],
  data_source: { source_type: 'sql', query: 'select * from projects', params: {} },
  layout_config: {
    layout_type: 'table',
    orientation: 'portrait',
    papersize: 'A4',
    margins: {},
    sections: {},
  },
  filter_config: { conditions: [], sort_by: [] },
  style_config: {
    theme: 'default',
    colors: {},
    fonts: {},
    borders: {},
    header_style: {},
    body_style: {},
  },
};

describe('Report page shell components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header and delegates navigation and report builder action', () => {
    const onShowBuilder = vi.fn();
    renderWithProviders(<ReportHeader onShowBuilder={onShowBuilder} />);

    fireEvent.click(screen.getByTestId('icon-x').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: '生成报表' }));

    expect(screen.getByText('报表中心')).toBeInTheDocument();
    expect(screen.getByText('Report Center')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    expect(onShowBuilder).toHaveBeenCalledTimes(1);
  });

  it('renders search and module filter controls with callbacks', () => {
    const onSearchChange = vi.fn();
    const onFilterModuleChange = vi.fn();
    const { rerender } = renderWithProviders(
      <SearchFilterBar
        searchTerm='质量'
        onSearchChange={onSearchChange}
        activeTab='reports'
        filterModule='all'
        onFilterModuleChange={onFilterModuleChange}
        uniqueModules={['RS', 'LIMS', 'QMS']}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: '项目' } });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'LIMS' }));

    expect(onSearchChange).toHaveBeenCalledWith('项目');
    expect(onFilterModuleChange).toHaveBeenCalledWith('LIMS');

    rerender(
      <SearchFilterBar
        searchTerm=''
        onSearchChange={vi.fn()}
        activeTab='templates'
        filterModule='all'
        onFilterModuleChange={vi.fn()}
        uniqueModules={[]}
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('switches tabs and invalidates templates query', () => {
    const onTabChange = vi.fn();
    renderWithProviders(
      <TabSwitcher
        activeTab='reports'
        onTabChange={onTabChange}
        templatesCount={6}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '报表列表' }));
    fireEvent.click(screen.getByRole('button', { name: '模板管理 (6)' }));

    expect(onTabChange).toHaveBeenCalledWith('reports');
    expect(onTabChange).toHaveBeenCalledWith('templates');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['report', 'templates'] });
  });

  it('renders loading, service down and toast states', () => {
    const { rerender } = renderWithProviders(<LoadingState />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();

    rerender(<ServiceDownState />);
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
    expect(screen.getByText('报表服务未启动')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

    rerender(
      <NotificationToast
        type='success'
        message='保存成功'
      />
    );
    expect(screen.getByText('保存成功')).toBeInTheDocument();
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();

    rerender(
      <NotificationToast
        type='error'
        message='保存失败'
      />
    );
    expect(screen.getByText('保存失败')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-check-circle')).not.toBeInTheDocument();
  });
});

describe('Report page data components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report stats grouped by module', () => {
    renderWithProviders(
      <ReportStats
        reports={reports}
        reportTypes={reportTypes}
      />
    );

    expect(screen.getByText('报表总数')).toBeInTheDocument();
    expect(screen.getByText('RS 模块')).toBeInTheDocument();
    expect(screen.getByText('LIMS 模块')).toBeInTheDocument();
    expect(screen.getByText('QMS 模块')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(3);
  });

  it('renders report list, row metadata and row actions', () => {
    const onView = vi.fn();
    const onExport = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <ReportList
        reports={reports}
        reportTypes={reportTypes}
        onShowBuilder={vi.fn()}
        onView={onView}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: '查看' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '导出' })[0]);
    fireEvent.click(screen.getAllByTestId('icon-trash')[0].closest('button') as HTMLButtonElement);

    expect(screen.getByText('项目进度月报')).toBeInTheDocument();
    expect(screen.getByText('展示项目计划和完成进度')).toBeInTheDocument();
    expect(screen.getByText('18 条数据')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('3 列')).toBeInTheDocument();
    expect(onView).toHaveBeenCalledWith(reports[0]);
    expect(onExport).toHaveBeenCalledWith(reports[0]);
    expect(onDelete).toHaveBeenCalledWith('report-1');
  });

  it('renders empty report list and starts first report creation', () => {
    const onShowBuilder = vi.fn();
    renderWithProviders(
      <ReportList
        reports={[]}
        reportTypes={reportTypes}
        onShowBuilder={onShowBuilder}
        onView={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '生成第一个报表' }));

    expect(screen.getByText('暂无报表')).toBeInTheDocument();
    expect(onShowBuilder).toHaveBeenCalledTimes(1);
  });

  it('renders template list and template row actions', () => {
    const onShowCreateTemplateModal = vi.fn();
    const onCreateReportFromTemplate = vi.fn();
    const onEditTemplateClick = vi.fn();
    const onDeleteTemplate = vi.fn();

    renderWithProviders(
      <TemplateList
        templates={[template]}
        reportTypes={reportTypes}
        onShowCreateTemplateModal={onShowCreateTemplateModal}
        onCreateReportFromTemplate={onCreateReportFromTemplate}
        onEditTemplateClick={onEditTemplateClick}
        onDeleteTemplate={onDeleteTemplate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '新增模板' }));
    fireEvent.click(screen.getByRole('button', { name: '创建报表' }));
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByTestId('icon-trash').closest('button') as HTMLButtonElement);

    expect(screen.getByText('项目进度模板')).toBeInTheDocument();
    expect(screen.getByText('按项目输出进度概览')).toBeInTheDocument();
    expect(screen.getByText('编码: TPL_PM_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('类型: 项目进度报表')).toBeInTheDocument();
    expect(screen.getByText('列数: 2')).toBeInTheDocument();
    expect(onShowCreateTemplateModal).toHaveBeenCalledTimes(1);
    expect(onCreateReportFromTemplate).toHaveBeenCalledWith('template-1');
    expect(onEditTemplateClick).toHaveBeenCalledWith(template);
    expect(onDeleteTemplate).toHaveBeenCalledWith('template-1');
  });

  it('renders empty template list and starts first template creation', () => {
    const onShowCreateTemplateModal = vi.fn();
    renderWithProviders(
      <TemplateList
        templates={[]}
        reportTypes={reportTypes}
        onShowCreateTemplateModal={onShowCreateTemplateModal}
        onCreateReportFromTemplate={vi.fn()}
        onEditTemplateClick={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '创建第一个模板' }));

    expect(screen.getByText('暂无模板')).toBeInTheDocument();
    expect(onShowCreateTemplateModal).toHaveBeenCalledTimes(1);
  });
});

describe('Template form dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a template and emits field changes', () => {
    const onFormDataChange = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    renderWithProviders(
      <TemplateFormDialog
        open
        selectedTemplate={null}
        templateFormData={templateFormData}
        mockReportTypes={reportTypes}
        onClose={onClose}
        onFormDataChange={onFormDataChange}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/模板名称/), { target: { value: '质量分析模板' } });
    fireEvent.change(screen.getByLabelText(/模板编码/), { target: { value: 'TPL_QMS' } });
    fireEvent.change(screen.getByLabelText('分类'), { target: { value: '质量' } });
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: '质量报表模板' } });
    fireEvent.change(screen.getByLabelText('数据源查询'), {
      target: { value: 'select * from qms_defects' },
    });
    fireEvent.change(screen.getByLabelText('列配置 (JSON)'), {
      target: { value: '[{"key":"defect","title":"缺陷"}]' },
    });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    expect(screen.getByText('新增模板')).toBeInTheDocument();
    expect(onFormDataChange).toHaveBeenCalledWith({ ...templateFormData, name: '质量分析模板' });
    expect(onFormDataChange).toHaveBeenCalledWith({ ...templateFormData, code: 'TPL_QMS' });
    expect(onFormDataChange).toHaveBeenCalledWith({ ...templateFormData, category: '质量' });
    expect(onFormDataChange).toHaveBeenCalledWith({
      ...templateFormData,
      description: '质量报表模板',
    });
    expect(onFormDataChange).toHaveBeenCalledWith({
      ...templateFormData,
      data_source: { ...templateFormData.data_source, query: 'select * from qms_defects' },
    });
    expect(onFormDataChange).toHaveBeenCalledWith({
      ...templateFormData,
      columns: [{ key: 'defect', title: '缺陷' }],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('edits an existing template and keeps status switch disabled', () => {
    renderWithProviders(
      <TemplateFormDialog
        open
        selectedTemplate={template}
        templateFormData={templateFormData}
        mockReportTypes={reportTypes}
        onClose={vi.fn()}
        onFormDataChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('编辑模板')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });
});
