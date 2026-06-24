import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  X,
  FileSpreadsheet,
  File,
  Columns,
  Calendar,
  LayoutTemplate,
  Edit,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Switch,
} from '@mui/material';
import { Button } from '@mui/material';
import type {
  ReportData,
  ReportTypeInfo,
  ReportTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateReportFromTemplateRequest,
} from '@/api/report';
import { reportApi } from '@/api/report';
import ReportBuilder from './ReportBuilder';
import ReportViewer from './ReportViewer';
import ExportModal from '../../components/ExportModal';
import { apiLogger } from '@/utils/logger';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
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
      checkServiceStatus('report', 8053, (up) =>
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
    is_active: true,
    data_source: {
      source_type: 'sql',
      query: '',
      params: {},
    },
    layout_config: {
      layout_type: 'table',
      orientation: 'portrait',
      paper_size: 'A4',
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
    output_format: 'pdf',
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

  const loadReports = () => {
    setReports(mockReports);
    setReportTypes(mockReportTypes);
    setLoading(false);
  };

  const loadTemplates = async () => {
    try {
      const response = await reportApi.listTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载模板失败:', err);
    }
  };

  useEffect(() => {
    loadReports();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('确定要删除这个报表吗？')) return;

    try {
      const response = await reportApi.deleteReport(id);
      if (response.success) {
        showNotification('success', '报表删除成功');
        loadReports();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err: unknown) {
      showNotification('error', '删除报表失败');
      apiLogger.error('删除报表失败:', err);
    }
  };

  const handleExport = (report: ReportData) => {
    setSelectedReport(report);
    setShowExportModal(true);
  };

  const handleView = (report: ReportData) => {
    setSelectedReport(report);
    setShowViewer(true);
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await reportApi.createTemplate(templateFormData);
      if (response.success) {
        showNotification('success', '模板创建成功');
        setShowCreateTemplateModal(false);
        loadTemplates();
        resetTemplateForm();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err: unknown) {
      showNotification('error', (err as { message?: string }).message || '创建失败');
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const response = await reportApi.updateTemplate(selectedTemplate.id, templateFormData);
      if (response.success) {
        showNotification('success', '模板更新成功');
        setShowEditTemplateModal(false);
        setSelectedTemplate(null);
        loadTemplates();
        resetTemplateForm();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    } catch (err: unknown) {
      showNotification('error', (err as { message?: string }).message || '更新失败');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await reportApi.deleteTemplate(id);
      if (response.success) {
        showNotification('success', '模板删除成功');
        loadTemplates();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err: unknown) {
      showNotification('error', (err as { message?: string }).message || '删除失败');
    }
  };

  const handleCreateReportFromTemplate = async (templateId: string) => {
    try {
      const request: CreateReportFromTemplateRequest = {
        template_id: templateId,
        created_by: 'current-user',
      };
      const response = await reportApi.createReportFromTemplate(request);
      if (response.success) {
        showNotification('success', '报表创建成功');
        setShowCreateReportFromTemplateModal(false);
        loadReports();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err: unknown) {
      showNotification('error', (err as { message?: string }).message || '创建失败');
    }
  };

  const handleEditTemplateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      code: template.code,
      description: template.description || '',
      category: template.category,
      report_type: template.report_type,
      is_active: template.is_active,
      data_source: template.data_source,
      layout_config: template.layout_config,
      filter_config: template.filter_config,
      style_config: template.style_config,
      columns: template.columns,
      output_format: template.output_format,
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
      is_active: true,
      data_source: {
        source_type: 'sql',
        query: '',
        params: {},
      },
      layout_config: {
        layout_type: 'table',
        orientation: 'portrait',
        paper_size: 'A4',
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
      output_format: 'pdf',
    });
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'secondary'> = {
      RS: 'warning',
      LIMS: 'info',
      QMS: 'success',
      EHS: 'error',
      SRM: 'secondary',
      PDM: 'info',
    };
    return colors[module] || 'default';
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet sx={{ width: 16, height: 16 }} />;
      case 'pdf':
        return <File sx={{ width: 16, height: 16 }} />;
      case 'csv':
        return <FileText sx={{ width: 16, height: 16 }} />;
      default:
        return <FileText sx={{ width: 16, height: 16 }} />;
    }
  };

  const getModuleFromReportType = (reportType: string): string => {
    const type = reportTypes.find((t) => t.type === reportType);
    return type?.module || 'RS';
  };

  const getReportTypeName = (reportType: string): string => {
    const type = reportTypes.find((t) => t.type === reportType);
    return type?.name || reportType;
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.config.report_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule =
      filterModule === 'all' || getModuleFromReportType(r.config.report_type) === filterModule;
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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, border.default 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Loader2
            sx={{
              width: 48,
              height: 48,
              color: 'primary.main',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'grey.700' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!isServiceUp('report')) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, border.default 100%)',
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: 448,
            mx: 'auto',
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 2,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.light',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <FileText sx={{ width: 32, height: 32, color: 'primary.main' }} />
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, mb: 2, color: 'grey.900' }}
          >
            报表服务未启动
          </Typography>
          <Typography sx={{ mb: 3, color: 'grey.700' }}>
            Report服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
          </Typography>
          <Button
            onClick={() => navigate('/dashboard')}
            variant='contained'
            sx={{ px: 3, py: 1, borderRadius: 2 }}
          >
            返回首页
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, border.default 100%)',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'grey.200',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Button
                onClick={() => navigate('/dashboard')}
                sx={{
                  p: 1,
                  color: 'grey.600',
                  '&:hover': { bgcolor: 'grey.100' },
                  borderRadius: 2,
                }}
              >
                <X sx={{ width: 20, height: 20 }} />
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
                  }}
                >
                  <FileText sx={{ width: 24, height: 24, color: 'white' }} />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'grey.900' }}
                  >
                    报表中心
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    Report Center
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Button
                onClick={() => setShowBuilder(true)}
                variant='contained'
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                生成报表
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {notification && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 16,
            zIndex: 50,
            p: 2,
            borderRadius: 2,
            boxShadow: 2,
            bgcolor: notification.type === 'success' ? 'success.main' : 'error.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {notification.type === 'success' && <CheckCircle sx={{ width: 20, height: 20 }} />}
          <span>{notification.message}</span>
        </Box>
      )}

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                color: 'grey.400',
              }}
            />
            <TextField
              fullWidth
              size='small'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='搜索...'
              sx={{
                pl: 5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                },
              }}
            />
          </Box>
          {activeTab === 'reports' && (
            <Select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              size='small'
              sx={{ minWidth: 120, bgcolor: 'background.paper', borderRadius: 2 }}
            >
              <MenuItem value='all'>全部模块</MenuItem>
              {uniqueModules.map((module) => (
                <MenuItem
                  key={module}
                  value={module}
                >
                  {module}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 1,
            }}
          >
            <Button
              variant={activeTab === 'reports' ? 'contained' : 'text'}
              onClick={() => setActiveTab('reports')}
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              <FileText sx={{ width: 16, height: 16, mr: 1 }} />
              报表列表
            </Button>
            <Button
              variant={activeTab === 'templates' ? 'contained' : 'text'}
              onClick={() => {
                setActiveTab('templates');
                loadTemplates();
              }}
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              <LayoutTemplate sx={{ width: 16, height: 16, mr: 1 }} />
              模板管理 ({templates.length})
            </Button>
          </Box>
        </Box>

        {activeTab === 'reports' ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 3,
                mb: 4,
              }}
            >
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  p: 3,
                  boxShadow: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.600', mb: 0.5 }}
                    >
                      报表总数
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'grey.900' }}
                    >
                      {reports.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText sx={{ width: 24, height: 24, color: 'primary.main' }} />
                  </Box>
                </Box>
              </Box>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  p: 3,
                  boxShadow: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.600', mb: 0.5 }}
                    >
                      RS 模块
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'warning.main' }}
                    >
                      {
                        reports.filter(
                          (r) => getModuleFromReportType(r.config.report_type) === 'RS'
                        ).length
                      }
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'warning.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText sx={{ width: 24, height: 24, color: 'warning.main' }} />
                  </Box>
                </Box>
              </Box>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  p: 3,
                  boxShadow: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.600', mb: 0.5 }}
                    >
                      LIMS 模块
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'info.main' }}
                    >
                      {
                        reports.filter(
                          (r) => getModuleFromReportType(r.config.report_type) === 'LIMS'
                        ).length
                      }
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'info.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText sx={{ width: 24, height: 24, color: 'info.main' }} />
                  </Box>
                </Box>
              </Box>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  p: 3,
                  boxShadow: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.600', mb: 0.5 }}
                    >
                      QMS 模块
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'success.main' }}
                    >
                      {
                        reports.filter(
                          (r) => getModuleFromReportType(r.config.report_type) === 'QMS'
                        ).length
                      }
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'success.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText sx={{ width: 24, height: 24, color: 'success.main' }} />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'grey.200' }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'grey.900' }}
                >
                  报表列表
                </Typography>
              </Box>
              <Box
                sx={{
                  '& > div:not(:last-child)': {
                    borderBottom: 1,
                    borderColor: 'grey.200',
                  },
                }}
              >
                {filteredReports.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: 'center' }}>
                    <FileText
                      sx={{
                        width: 64,
                        height: 64,
                        color: 'grey.300',
                        mx: 'auto',
                        mb: 2,
                      }}
                    />
                    <Typography sx={{ color: 'grey.600' }}>暂无报表</Typography>
                    <Button
                      onClick={() => setShowBuilder(true)}
                      variant='contained'
                      sx={{ mt: 2, borderRadius: 2 }}
                    >
                      生成第一个报表
                    </Button>
                  </Box>
                ) : (
                  filteredReports.map((report) => (
                    <Box
                      key={report.id}
                      sx={{ p: 3, '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant='h6'
                              sx={{ fontWeight: 600, color: 'grey.900' }}
                            >
                              {report.config.title}
                            </Typography>
                            <Chip
                              label={getModuleFromReportType(report.config.report_type)}
                              color={getModuleColor(
                                getModuleFromReportType(report.config.report_type)
                              )}
                              size='small'
                              sx={{ borderRadius: '50%' }}
                            />
                            <Chip
                              label={`${report.row_count} 条数据`}
                              size='small'
                              sx={{
                                bgcolor: 'grey.100',
                                color: 'grey.700',
                                borderRadius: '50%',
                              }}
                            />
                          </Box>
                          {report.config.description && (
                            <Typography sx={{ color: 'grey.600', mb: 2 }}>
                              {report.config.description}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 14,
                              color: 'grey.600',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Calendar sx={{ width: 16, height: 16 }} />
                              创建时间: {new Date(report.created_at).toLocaleDateString('zh-CN')}
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {getFormatIcon(report.config.format)}
                              <span style={{ marginLeft: 4 }}>
                                {report.config.format.toUpperCase()}
                              </span>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Columns sx={{ width: 16, height: 16 }} />
                              {report.config.columns.length} 列
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            onClick={() => handleView(report)}
                            size='small'
                            startIcon={<Eye sx={{ width: 16, height: 16 }} />}
                            sx={{
                              color: 'info.main',
                              '&:hover': { bgcolor: 'info.light' },
                              borderRadius: 2,
                            }}
                          >
                            查看
                          </Button>
                          <Button
                            onClick={() => handleExport(report)}
                            size='small'
                            startIcon={<Download sx={{ width: 16, height: 16 }} />}
                            sx={{
                              color: 'success.main',
                              '&:hover': { bgcolor: 'success.light' },
                              borderRadius: 2,
                            }}
                          >
                            导出
                          </Button>
                          <Button
                            onClick={() => handleDeleteReport(report.id)}
                            size='small'
                            sx={{
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.light' },
                              borderRadius: 2,
                              p: 1,
                              minWidth: 'auto',
                            }}
                          >
                            <Trash2 sx={{ width: 20, height: 20 }} />
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'grey.900' }}
              >
                报表模板列表
              </Typography>
              <Button
                onClick={() => setShowCreateTemplateModal(true)}
                variant='contained'
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                新增模板
              </Button>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
              {filteredTemplates.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <LayoutTemplate
                    sx={{
                      width: 64,
                      height: 64,
                      color: 'grey.300',
                      mx: 'auto',
                      mb: 2,
                    }}
                  />
                  <Typography sx={{ color: 'grey.600' }}>暂无模板</Typography>
                  <Button
                    onClick={() => setShowCreateTemplateModal(true)}
                    variant='contained'
                    sx={{ mt: 2, borderRadius: 2 }}
                  >
                    创建第一个模板
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    '& > div:not(:last-child)': {
                      borderBottom: 1,
                      borderColor: 'grey.200',
                    },
                  }}
                >
                  {filteredTemplates.map((template) => (
                    <Box
                      key={template.id}
                      sx={{ p: 3, '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant='h6'
                              sx={{ fontWeight: 600, color: 'grey.900' }}
                            >
                              {template.name}
                            </Typography>
                            <Chip
                              label={template.category}
                              size='small'
                              sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                                borderRadius: '50%',
                              }}
                            />
                            <Chip
                              label={template.is_active ? '启用' : '禁用'}
                              size='small'
                              sx={{
                                bgcolor: template.is_active ? 'success.light' : 'grey.100',
                                color: template.is_active ? 'success.main' : 'grey.600',
                                borderRadius: '50%',
                              }}
                            />
                          </Box>
                          <Typography sx={{ color: 'grey.600', mb: 2 }}>
                            {template.description || '暂无描述'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 14,
                              color: 'grey.600',
                            }}
                          >
                            <span>编码: {template.code}</span>
                            <span>类型: {getReportTypeName(template.report_type)}</span>
                            <span>列数: {template.columns.length}</span>
                            <span>输出格式: {template.output_format.toUpperCase()}</span>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            onClick={() => handleCreateReportFromTemplate(template.id)}
                            size='small'
                            startIcon={<Play sx={{ width: 16, height: 16 }} />}
                            sx={{
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.light' },
                              borderRadius: 2,
                            }}
                          >
                            创建报表
                          </Button>
                          <Button
                            onClick={() => handleEditTemplateClick(template)}
                            size='small'
                            startIcon={<Edit sx={{ width: 16, height: 16 }} />}
                            sx={{
                              color: 'info.main',
                              '&:hover': { bgcolor: 'info.light' },
                              borderRadius: 2,
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            onClick={() => handleDeleteTemplate(template.id)}
                            size='small'
                            sx={{
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.light' },
                              borderRadius: 2,
                              p: 1,
                              minWidth: 'auto',
                            }}
                          >
                            <Trash2 sx={{ width: 20, height: 20 }} />
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {showBuilder && (
        <ReportBuilder
          onClose={() => setShowBuilder(false)}
          reportTypes={reportTypes}
          onSuccess={() => {
            loadReports();
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

      <Dialog
        open={showCreateTemplateModal || showEditTemplateModal}
        onClose={() => {
          setShowCreateTemplateModal(false);
          setShowEditTemplateModal(false);
          setSelectedTemplate(null);
          resetTemplateForm();
        }}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{selectedTemplate ? '编辑模板' : '新增模板'}</DialogTitle>
        <DialogContent sx={{ overflowY: 'auto', maxHeight: '80vh' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <TextField
                label='模板名称 *'
                required
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                fullWidth
              />
              <TextField
                label='模板编码 *'
                required
                value={templateFormData.code}
                onChange={(e) => setTemplateFormData({ ...templateFormData, code: e.target.value })}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>报表类型 *</InputLabel>
                <Select
                  required
                  value={templateFormData.report_type}
                  label='报表类型 *'
                  onChange={(e) =>
                    setTemplateFormData({ ...templateFormData, report_type: e.target.value as any })
                  }
                  fullWidth
                >
                  {mockReportTypes.map((type) => (
                    <MenuItem
                      key={type.type}
                      value={type.type}
                    >
                      {type.name} ({type.module})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label='分类'
                value={templateFormData.category}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, category: e.target.value })
                }
                fullWidth
              />
            </Box>

            <TextField
              label='描述'
              value={templateFormData.description || ''}
              onChange={(e) =>
                setTemplateFormData({ ...templateFormData, description: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>输出格式</InputLabel>
                <Select
                  value={templateFormData.output_format}
                  label='输出格式'
                  onChange={(e) =>
                    setTemplateFormData({ ...templateFormData, output_format: e.target.value })
                  }
                  fullWidth
                >
                  <MenuItem value='pdf'>PDF</MenuItem>
                  <MenuItem value='excel'>Excel</MenuItem>
                  <MenuItem value='csv'>CSV</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Typography>启用状态</Typography>
                <Switch
                  checked={selectedTemplate?.is_active ?? true}
                  disabled={!!selectedTemplate}
                />
              </Box>
            </Box>

            <TextField
              label='数据源查询'
              value={templateFormData.data_source.query}
              onChange={(e) =>
                setTemplateFormData({
                  ...templateFormData,
                  data_source: { ...templateFormData.data_source, query: e.target.value },
                })
              }
              multiline
              rows={4}
              fullWidth
              placeholder='输入SQL查询语句'
              sx={{ fontFamily: 'monospace' }}
            />

            <TextField
              label='列配置 (JSON)'
              value={JSON.stringify(templateFormData.columns, null, 2)}
              onChange={(e) => {
                try {
                  const columns = JSON.parse(e.target.value);
                  setTemplateFormData({ ...templateFormData, columns });
                } catch {}
              }}
              multiline
              rows={4}
              fullWidth
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowCreateTemplateModal(false);
              setShowEditTemplateModal(false);
              setSelectedTemplate(null);
              resetTemplateForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={selectedTemplate ? handleEditTemplate : handleCreateTemplate}
          >
            {selectedTemplate ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportPage;
