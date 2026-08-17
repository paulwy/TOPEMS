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
import i18n from '@/i18n';
import { reportApi } from '@/api/report';
import ReportBuilder from '../ReportBuilder';
import ReportViewer from '../ReportViewer';
import { ExportModal } from '@/components/export';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

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

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

const ReportPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
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

  const checkServiceStatus = async (
    _serviceName: string,
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

  const mockReports: ReportData[] = [
    {
      id: 'report-001',
      config: {
        report_type: 'rs_project_progress',
        format: 'excel',
        title: i18n.t('pages.index.k12'),
        description: i18n.t('pages.index.k13'),
        columns: [i18n.t('pages.index.k19'), i18n.t('pages.index.k18'), i18n.t('pages.index.k17'), i18n.t('pages.index.k16'), i18n.t('pages.index.k15'), i18n.t('pages.index.k14')],
      },
      data: [
        {
          [i18n.t('pages.index.k0')]: i18n.t('pages.index.k20'),
          [i18n.t('pages.index.k1')]: i18n.t('pages.index.k21'),
          [i18n.t('pages.index.k2')]: '2026-01-01',
          [i18n.t('pages.index.k3')]: '2026-12-31',
          [i18n.t('pages.index.k4')]: '45%',
          [i18n.t('pages.index.k5')]: i18n.t('pages.index.k22'),
        },
        {
          [i18n.t('pages.index.k6')]: i18n.t('pages.index.k23'),
          [i18n.t('pages.index.k7')]: i18n.t('pages.index.k24'),
          [i18n.t('pages.index.k8')]: '2026-03-01',
          [i18n.t('pages.index.k9')]: '2026-09-30',
          [i18n.t('pages.index.k10')]: '30%',
          [i18n.t('pages.index.k11')]: i18n.t('pages.index.k25'),
        },
        {
          [i18n.t('pages.index.k12')]: i18n.t('pages.index.k26'),
          [i18n.t('pages.index.k13')]: i18n.t('pages.index.k27'),
          [i18n.t('pages.index.k14')]: '2026-02-15',
          [i18n.t('pages.index.k15')]: '2026-11-30',
          [i18n.t('pages.index.k16')]: '65%',
          [i18n.t('pages.index.k17')]: i18n.t('pages.index.k28'),
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
        title: i18n.t('pages.index.k29'),
        description: i18n.t('pages.index.k30'),
        columns: [i18n.t('pages.index.k34'), i18n.t('pages.index.k33'), i18n.t('pages.index.k32'), i18n.t('pages.index.k31')],
      },
      data: [
        {
          [i18n.t('pages.index.k18')]: i18n.t('pages.index.a001_35'),
          [i18n.t('pages.index.k19')]: '2026-05-20',
          [i18n.t('pages.index.k20')]: i18n.t('pages.index.k36'),
          [i18n.t('pages.index.k21')]: i18n.t('pages.index.k37'),
        },
        {
          [i18n.t('pages.index.k22')]: i18n.t('pages.index.b002_38'),
          [i18n.t('pages.index.k23')]: '2026-05-21',
          [i18n.t('pages.index.k24')]: i18n.t('pages.index.k39'),
          [i18n.t('pages.index.k25')]: i18n.t('pages.index.k40'),
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
        title: i18n.t('pages.index.k41'),
        description: i18n.t('pages.index.k42'),
        columns: [i18n.t('pages.index.k46'), i18n.t('pages.index.k45'), i18n.t('pages.index.k44'), i18n.t('pages.index.k43')],
      },
      data: [
        {
          [i18n.t('pages.index.k26')]: 'P-001',
          [i18n.t('pages.index.k27')]: '20260501',
          [i18n.t('pages.index.k28')]: '98.5%',
          [i18n.t('pages.index.k29')]: '1.5%',
        },
        {
          [i18n.t('pages.index.k30')]: 'P-002',
          [i18n.t('pages.index.k31')]: '20260502',
          [i18n.t('pages.index.k32')]: '99.2%',
          [i18n.t('pages.index.k33')]: '0.8%',
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
        apiLogger.error(i18n.t('pages.index.k0'), err);
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS ,
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES ,
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES ,
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES ,
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS ,
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
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.REPORTS ,
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
    </PageContainer>
  );
};

export default ReportPage;
