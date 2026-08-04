import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { Box } from '@mui/material';
import type {
  ReportData,
  ReportTypeInfo,
  ReportType,
  ReportTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateReportFromTemplateRequest,
} from '@/api/report';
import { reportApi } from '@/api/report';
import { useNotificationStore } from '@/store';
import ReportBuilder from '../ReportBuilder';
import ReportViewer from '../ReportViewer';
import { ExportModal } from '@/components/export';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

import LoadingState from './components/LoadingState';
import ServiceDownState from './components/ServiceDownState';
import ReportHeader from './components/ReportHeader';
import NotificationToast from './components/NotificationToast';
import SearchFilterBar from './components/SearchFilterBar';
import TabSwitcher from './components/TabSwitcher';
import ReportStats from './components/ReportStats';
import ReportList from './components/ReportList';
import TemplateList from './components/TemplateList';
import TemplateFormDialog from './components/TemplateFormDialog';
import { getModuleFromReportType } from './utils';

const ct = designTokens.colors;

const ReportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    report: false,
  });

  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  const checkServiceStatus = async (
    serviceName: string,
    port: number,
    setStatus: (up: boolean) => void
  ) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('bi', 8060, (up) =>
        setServiceStatuses((prev) => ({ ...prev, report: up }))
      );
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [filterModule, setFilterModule] = useState<string>('all');

  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showCreateReportFromTemplateModal, setShowCreateReportFromTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'templates'>('reports');

  const [templateFormData, setTemplateFormData] = useState<CreateTemplateRequest>({
    name: '',
    code: '',
    description: '',
    category: '',
    report_type: 'rs_project_progress',
    isactive: true,
    data_source: {
      source_type: 'sql',
      query: '',
      params: {},
    },
    layout_config: {
      layout_type: 'table',
      orientation: 'portrait',
      papersize: 'A4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sections: {},
    },
    filter_config: {
      conditions: [],
      sort_by: [],
    },
    style_config: {
      theme: 'default',
      colors: {},
      fonts: {},
      borders: {},
      header_style: {},
      body_style: {},
    },
    columns: [],
    outputformat: 'pdf',
  });

  const mockReportTypes: ReportTypeInfo[] = [
    { type: 'rs_project_progress', name: '研发项目进度报表', module: 'RS' },
    { type: 'rs_experiment_record', name: '试验记录报表', module: 'RS' },
    { type: 'lims_inspection_stats', name: '实验室检验统计', module: 'LIMS' },
    { type: 'lims_sample_summary', name: '样品汇总报表', module: 'LIMS' },
    { type: 'qms_quality_analysis', name: '质量分析报表', module: 'QMS' },
    { type: 'qms_defect_stats', name: '缺陷统计报表', module: 'QMS' },
    { type: 'ehs_safety_check', name: '安全检查报表', module: 'EHS' },
    { type: 'ehs_risk_assessment', name: '风险评估报表', module: 'EHS' },
    { type: 'srm_supplier_eval', name: '供应商评估报表', module: 'SRM' },
    { type: 'srm_purchase_stats', name: '采购统计报表', module: 'SRM' },
    { type: 'pdm_production_stats', name: '生产统计报表', module: 'PDM' },
    { type: 'pdm_process_summary', name: '工艺汇总报表', module: 'PDM' },
  ];

  const mockReports: ReportData[] = [
    {
      id: 'report-001',
      config: {
        report_type: 'rs_project_progress',
        format: 'excel',
        title: '研发项目进度报表',
        description: '展示所有研发项目的当前进度',
        columns: ['项目名称', '负责人', '开始日期', '结束日期', '进度', '状态'],
      },
      data: [
        {
          项目名称: '新型催化剂研发',
          负责人: '张工程师',
          开始日期: '2026-01-01',
          结束日期: '2026-12-31',
          进度: '45%',
          状态: '进行中',
        },
        {
          项目名称: '高分子材料改性研究',
          负责人: '李工程师',
          开始日期: '2026-03-01',
          结束日期: '2026-09-30',
          进度: '30%',
          状态: '进行中',
        },
        {
          项目名称: '生物降解塑料开发',
          负责人: '王工程师',
          开始日期: '2026-02-15',
          结束日期: '2026-11-30',
          进度: '65%',
          状态: '进行中',
        },
      ],
      row_count: 3,
      created_at: '2026-05-22T10:00:00Z',
    },
    {
      id: 'report-002',
      config: {
        report_type: 'lims_inspection_stats',
        format: 'pdf',
        title: '实验室检验统计报表',
        description: '实验室检验数据统计分析',
        columns: ['样品名称', '检验日期', '检验项目', '结论'],
      },
      data: [
        {
          样品名称: '原料A-001',
          检验日期: '2026-05-20',
          检验项目: '成分分析',
          结论: '合格',
        },
        {
          样品名称: '原料B-002',
          检验日期: '2026-05-21',
          检验项目: '纯度检测',
          结论: '合格',
        },
      ],
      row_count: 2,
      created_at: '2026-05-22T09:30:00Z',
    },
    {
      id: 'report-003',
      config: {
        report_type: 'qms_quality_analysis',
        format: 'excel',
        title: '质量分析报表',
        description: '产品质量数据分析',
        columns: ['产品编号', '批次', '合格率', '缺陷率'],
      },
      data: [
        {
          产品编号: 'P-001',
          批次: '20260501',
          合格率: '98.5%',
          缺陷率: '1.5%',
        },
        {
          产品编号: 'P-002',
          批次: '20260502',
          合格率: '99.2%',
          缺陷率: '0.8%',
        },
      ],
      row_count: 2,
      created_at: '2026-05-21T14:00:00Z',
    },
  ];

  const reportsQuery = useQuery<ReportData[]>({
    queryKey: QUERY_KEYS.REPORT.REPORTS,
    queryFn: async () => {
      return mockReports;
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery<ReportTemplate[]>({
    queryKey: QUERY_KEYS.REPORT.TEMPLATES,
    queryFn: async () => {
      try {
        const response = await reportApi.listTemplates();
        if (response.success && response.data) {
          return response.data;
        }
      } catch (err: unknown) {
        apiLogger.error('加载模板失败:', err);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const reports = reportsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const reportTypes = mockReportTypes;
  const loading = reportsQuery.isLoading || templatesQuery.isLoading;

  useEffect(() => {
    if (templatesQuery.isError) {
      apiLogger.error('加载模板失败:', templatesQuery.error);
    }
  }, [templatesQuery.isError, templatesQuery.error]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteReport(id),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', '报表删除成功');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS });
      } else {
        showNotification('error', response.message || '删除失败');
      }
    },
    onError: (err: unknown) => {
      showNotification('error', '删除报表失败');
      apiLogger.error('删除报表失败:', err);
    },
  });

  const handleDeleteReport = (id: string) => {
    if (!confirm('确定要删除这个报表吗？')) return;
    deleteReportMutation.mutate(id);
  };

  const handleExport = (report: ReportData) => {
    setSelectedReport(report);
    setShowExportModal(true);
  };

  const handleView = (report: ReportData) => {
    setSelectedReport(report);
    setShowViewer(true);
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) => reportApi.createTemplate(data),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', '模板创建成功');
        setShowCreateTemplateModal(false);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES });
        resetTemplateForm();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || '创建失败');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateRequest }) =>
      reportApi.updateTemplate(id, data),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', '模板更新成功');
        setShowEditTemplateModal(false);
        setSelectedTemplate(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES });
        resetTemplateForm();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || '更新失败');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteTemplate(id),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', '模板删除成功');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES });
      } else {
        showNotification('error', response.message || '删除失败');
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || '删除失败');
    },
  });

  const createReportFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => {
      const request: CreateReportFromTemplateRequest = {
        template_id: templateId,
        created_by: 'current-user',
      };
      return reportApi.createReportFromTemplate(request);
    },
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', '报表创建成功');
        setShowCreateReportFromTemplateModal(false);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS });
      } else {
        showNotification('error', response.message || '创建失败');
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || '创建失败');
    },
  });

  const actionLoading =
    deleteReportMutation.isPending ||
    createTemplateMutation.isPending ||
    updateTemplateMutation.isPending ||
    deleteTemplateMutation.isPending ||
    createReportFromTemplateMutation.isPending;

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate(templateFormData);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: templateFormData });
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    deleteTemplateMutation.mutate(id);
  };

  const handleCreateReportFromTemplate = (templateId: string) => {
    createReportFromTemplateMutation.mutate(templateId);
  };

  const handleEditTemplateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      code: template.code,
      description: template.description || '',
      category: template.category,
      report_type: template.report_type,
      isactive: template.isactive,
      data_source: template.data_source,
      layout_config: template.layout_config,
      filter_config: template.filter_config,
      style_config: template.style_config,
      columns: template.columns,
      outputformat: template.outputformat,
    });
    setShowEditTemplateModal(true);
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      report_type: 'rs_project_progress',
      isactive: true,
      data_source: {
        source_type: 'sql',
        query: '',
        params: {},
      },
      layout_config: {
        layout_type: 'table',
        orientation: 'portrait',
        papersize: 'A4',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        sections: {},
      },
      filter_config: {
        conditions: [],
        sort_by: [],
      },
      style_config: {
        theme: 'default',
        colors: {},
        fonts: {},
        borders: {},
        header_style: {},
        body_style: {},
      },
      columns: [],
      outputformat: 'pdf',
    });
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.config.report_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule =
      filterModule === 'all' ||
      getModuleFromReportType(r.config.report_type, reportTypes) === filterModule;
    return matchesSearch && matchesModule;
  });

  const filteredTemplates = templates.filter((t) => {
    return (
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const uniqueModules = Array.from(new Set(reportTypes.map((t) => t.module)));

  const handleTemplateFormClose = () => {
    setShowCreateTemplateModal(false);
    setShowEditTemplateModal(false);
    setSelectedTemplate(null);
    resetTemplateForm();
  };

  const handleTemplateFormSubmit = () => {
    if (selectedTemplate) {
      handleEditTemplate();
    } else {
      handleCreateTemplate();
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!isServiceUp('report')) {
    return <ServiceDownState />;
  }

  return (
    <PageContainer
      maxWidth={false}
      padding={false}
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
      }}
    >
      <ReportHeader onShowBuilder={() => setShowBuilder(true)} />

      {notification && (
        <NotificationToast
          type={notification.type}
          message={notification.message}
        />
      )}

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 4 }}>
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeTab={activeTab}
          filterModule={filterModule}
          onFilterModuleChange={setFilterModule}
          uniqueModules={uniqueModules}
        />

        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          templatesCount={templates.length}
        />

        {activeTab === 'reports' ? (
          <>
            <ReportStats
              reports={reports}
              reportTypes={reportTypes}
            />
            <ReportList
              reports={filteredReports}
              reportTypes={reportTypes}
              onShowBuilder={() => setShowBuilder(true)}
              onView={handleView}
              onExport={handleExport}
              onDelete={handleDeleteReport}
            />
          </>
        ) : (
          <TemplateList
            templates={filteredTemplates}
            reportTypes={reportTypes}
            onShowCreateTemplateModal={() => setShowCreateTemplateModal(true)}
            onCreateReportFromTemplate={handleCreateReportFromTemplate}
            onEditTemplateClick={handleEditTemplateClick}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}
      </Box>

      {showBuilder && (
        <ReportBuilder
          onClose={() => setShowBuilder(false)}
          reportTypes={reportTypes}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS });
            setShowBuilder(false);
            showNotification('success', '报表生成成功');
          }}
        />
      )}

      {showViewer && selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => {
            setShowViewer(false);
            setSelectedReport(null);
          }}
        />
      )}

      {showExportModal && selectedReport && (
        <ExportModal
          report={selectedReport}
          onClose={() => {
            setShowExportModal(false);
            setSelectedReport(null);
          }}
        />
      )}

      <TemplateFormDialog
        open={showCreateTemplateModal || showEditTemplateModal}
        selectedTemplate={selectedTemplate}
        templateFormData={templateFormData}
        mockReportTypes={mockReportTypes}
        onClose={handleTemplateFormClose}
        onFormDataChange={setTemplateFormData}
        onSubmit={handleTemplateFormSubmit}
      />
    </PageContainer>
  );
};

export default ReportPage;
