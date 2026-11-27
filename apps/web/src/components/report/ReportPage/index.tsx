import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, useTheme } from '@mui/material';
import { ReportViewerTemplate } from '@/components/templates/ReportViewerTemplate';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import type {
  ReportData,
  ReportTypeInfo,
  ReportTemplate,
  CreateTemplateRequest,
  CreateReportFromTemplateRequest,
} from '@/api/report';
import i18n from '@/i18n';
import { reportApi } from '@/api/report';
import ReportBuilder from '../ReportBuilder';
import { ReportViewer } from '../ReportViewer';
import { ExportModal } from '@/components/export';
import { apiLogger } from '@/utils/logger';

import ReportHeader from './components/ReportHeader';
import NotificationToast from './components/NotificationToast';
import SearchFilterBar from './components/SearchFilterBar';
import TabSwitcher from './components/TabSwitcher';
import ReportStats from './components/ReportStats';
import ReportList from './components/ReportList';
import TemplateList from './components/TemplateList';
import TemplateFormDialog from './components/TemplateFormDialog';
import { getModuleFromReportType } from '@/components/report/ReportPageUtils';
import { normalizeReportRows } from '@/components/report/reportDataNormalize';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ReportPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: _backendData, isLoading: _isBackendLoading } = useQuery({
    queryKey: ['report-dashboard'],
    queryFn: async () => {
      try {
        const res = await reportApi.getReportsCenterStats();
        if (res.success && res.data) return res.data;
        return {};
      } catch {
        return {};
      }
    },
  });
  const queryClient = useQueryClient();
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    report: false,
  });

  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  const checkServiceStatus = async (serviceName: string, setStatus: (up: boolean) => void) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // 使用 Vite 代理的相对路径 /{service}/health，而不是直接访问后端端口。
      // 这样所有健康检查请求都由 Vite dev server（端口 3000）统一转发，
      // 从根本上消除浏览器跨端口（localhost:3000 → localhost:8060）导致的 CORS 拦截。
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/${serviceName}/health`, {
        signal: controller.signal,
        method: 'GET',
        headers,
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('bi', (up) => setServiceStatuses((prev) => ({ ...prev, report: up })));
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
  const [, setShowCreateReportFromTemplateModal] = useState(false);
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
    { type: 'rs_project_progress', name: i18n.t('pages.index.k0'), module: 'RS' },
    { type: 'rs_experiment_record', name: i18n.t('pages.index.k1'), module: 'RS' },
    { type: 'lims_inspection_stats', name: i18n.t('pages.index.k2'), module: 'LIMS' },
    { type: 'lims_sample_summary', name: i18n.t('pages.index.k3'), module: 'LIMS' },
    { type: 'qms_quality_analysis', name: i18n.t('pages.index.k4'), module: 'QMS' },
    { type: 'qms_defect_stats', name: i18n.t('pages.index.k5'), module: 'QMS' },
    { type: 'ehs_safety_check', name: i18n.t('pages.index.k6'), module: 'EHS' },
    { type: 'ehs_risk_assessment', name: i18n.t('pages.index.k7'), module: 'EHS' },
    { type: 'srm_supplier_eval', name: i18n.t('pages.index.k8'), module: 'SRM' },
    { type: 'srm_purchase_stats', name: i18n.t('pages.index.k9'), module: 'SRM' },
    { type: 'pdm_production_stats', name: i18n.t('pages.index.k10'), module: 'PDM' },
    { type: 'pdm_process_summary', name: i18n.t('pages.index.k11'), module: 'PDM' },
  ];

  const reportsQuery = useQuery<ReportData[]>({
    queryKey: QUERY_KEYS.REPORT.REPORTS,
    queryFn: async () => {
      const response = await reportApi.listReports();
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.report_page.error_load', '报表加载失败'));
      }
      return response.data;
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
        apiLogger.error(i18n.t('pages.index.k0'), err);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 后端 /api/bi/reports 返回扁平行（无 config 包装），这里统一归一化，
  // 避免 filter / 列表渲染读 r.config.title 时 TypeError（2026-11-27 /report/report 错误边界）
  const reports = useMemo(() => normalizeReportRows(reportsQuery.data), [reportsQuery.data]);
  const templates = templatesQuery.data ?? [];
  const reportTypes = mockReportTypes;
  const loading = reportsQuery.isLoading || templatesQuery.isLoading;

  useEffect(() => {
    if (templatesQuery.isError) {
      apiLogger.error(i18n.t('pages.index.k1'), templatesQuery.error);
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
        showNotification('success', i18n.t('pages.index.k47'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REPORT.REPORTS,
          exact: false,
          refetchType: 'active',
        });
      } else {
        showNotification('error', response.message || i18n.t('pages.index.k48'));
      }
    },
    onError: (err: unknown) => {
      showNotification('error', i18n.t('pages.index.k49'));
      apiLogger.error(i18n.t('pages.index.k2'), err);
    },
  });

  const handleDeleteReport = (id: string) => {
    if (!confirm(i18n.t('pages.index.k50'))) return;
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
        showNotification('success', i18n.t('pages.index.k51'));
        setShowCreateTemplateModal(false);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REPORT.TEMPLATES,
          exact: false,
          refetchType: 'active',
        });
        resetTemplateForm();
      } else {
        showNotification('error', response.message || i18n.t('pages.index.k52'));
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || i18n.t('pages.index.k53'));
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateRequest }) =>
      reportApi.updateTemplate(id, data),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', i18n.t('pages.index.k54'));
        setShowEditTemplateModal(false);
        setSelectedTemplate(null);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REPORT.TEMPLATES,
          exact: false,
          refetchType: 'active',
        });
        resetTemplateForm();
      } else {
        showNotification('error', response.message || i18n.t('pages.index.k55'));
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || i18n.t('pages.index.k56'));
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteTemplate(id),
    onSuccess: (response) => {
      if (response.success) {
        showNotification('success', i18n.t('pages.index.k57'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REPORT.TEMPLATES,
          exact: false,
          refetchType: 'active',
        });
      } else {
        showNotification('error', response.message || i18n.t('pages.index.k58'));
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || i18n.t('pages.index.k59'));
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
        showNotification('success', i18n.t('pages.index.k60'));
        setShowCreateReportFromTemplateModal(false);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REPORT.REPORTS,
          exact: false,
          refetchType: 'active',
        });
      } else {
        showNotification('error', response.message || i18n.t('pages.index.k61'));
      }
    },
    onError: (err: unknown) => {
      showNotification('error', (err as { message?: string }).message || i18n.t('pages.index.k62'));
    },
  });

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate(templateFormData);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: templateFormData });
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm(i18n.t('pages.index.k63'))) return;
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
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      (r.config?.title ?? '').toLowerCase().includes(keyword) ||
      (r.config?.report_type ?? '').toLowerCase().includes(keyword);
    const matchesModule =
      filterModule === 'all' ||
      getModuleFromReportType(r.config?.report_type ?? '', reportTypes) === filterModule;
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

  const serviceDown = !isServiceUp('report');
  const errorMsg = serviceDown ? i18n.t('pages.index.k54') : null;

  return (
    <ReportViewerTemplate
      mode='center'
      title={undefined}
      subtitle={undefined}
      loading={loading}
      loadingText={undefined}
      error={errorMsg}
      errorAction={
        serviceDown ? (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant='contained'
              onClick={() => window.location.reload()}
            >
              {i18n.t('pages.index.k56')}
            </Button>
            <Button
              variant='outlined'
              onClick={() => navigate(DASHBOARD_PATHS.root)}
            >
              {i18n.t('pages.index.k58')}
            </Button>
          </Box>
        ) : undefined
      }
      pageContainerProps={{
        maxWidth: false,
        padding: false,
        sx: {
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, border.default 100%)`,
        },
      }}
      filterBar={
        !loading && !serviceDown ? (
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeTab={activeTab}
            filterModule={filterModule}
            onFilterModuleChange={setFilterModule}
            uniqueModules={uniqueModules}
          />
        ) : undefined
      }
      tabs={
        !loading && !serviceDown ? (
          <TabSwitcher
            activeTab={activeTab}
            onTabChange={setActiveTab}
            templatesCount={templates.length}
          />
        ) : undefined
      }
      content={
        !loading && !serviceDown ? (
          <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 0 }}>
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

            {showBuilder && (
              <ReportBuilder
                onClose={() => setShowBuilder(false)}
                reportTypes={reportTypes}
                onSuccess={() => {
                  queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.REPORT.REPORTS,
                    exact: false,
                    refetchType: 'active',
                  });
                  setShowBuilder(false);
                  showNotification('success', i18n.t('pages.index.k64'));
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
          </Box>
        ) : undefined
      }
    >
      {!loading && !serviceDown && (
        <>
          <ReportHeader onShowBuilder={() => setShowBuilder(true)} />

          {notification && (
            <NotificationToast
              type={notification.type}
              message={notification.message}
            />
          )}
        </>
      )}
    </ReportViewerTemplate>
  );
};

export default ReportPage;
