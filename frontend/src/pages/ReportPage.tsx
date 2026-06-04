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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reportApi, ReportData, ReportTypeInfo } from '../api/report';
import ReportBuilder from './ReportBuilder';
import ReportViewer from './ReportViewer';
import ExportModal from './ExportModal';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<{ [key: string]: boolean }>({
    report: false,
  });

  // Check if a specific service is up
  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  // Check service status
  const checkServiceStatus = async (serviceName: string, port: number, setStatus: (up: boolean) => void) => {
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

  // Check all services on mount and periodically
  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('report', 8024, (up) => setServiceStatuses((prev) => ({ ...prev, report: up })));
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterModule, setFilterModule] = useState<string>('all');

  useEffect(() => {
    if (isServiceUp('report')) {
      loadReports();
      loadReportTypes();
    } else {
      setLoading(false);
    }
  }, [serviceStatuses.report]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await reportApi.listReports();
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err) {
      showNotification('error', '加载报表列表失败');
      console.error('加载报表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportTypes = async () => {
    try {
      const response = await reportApi.listReportTypes();
      if (response.success && response.data) {
        setReportTypes(response.data);
      }
    } catch (err) {
      console.error('加载报表类型失败:', err);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个报表吗？')) return;

    try {
      const response = await reportApi.deleteReport(id);
      if (response.success) {
        showNotification('success', '报表删除成功');
        loadReports();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err) {
      showNotification('error', '删除报表失败');
      console.error('删除报表失败:', err);
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

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: 'bg-orange-100 text-orange-700',
      LIMS: 'bg-blue-100 text-blue-700',
      QMS: 'bg-green-100 text-green-700',
      EHS: 'bg-red-100 text-red-700',
      SRM: 'bg-purple-100 text-purple-700',
      PDM: 'bg-indigo-100 text-indigo-700',
    };
    return colors[module] || 'bg-gray-100 text-gray-700';
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className='w-4 h-4' />;
      case 'pdf':
        return <File className='w-4 h-4' />;
      case 'csv':
        return <FileText className='w-4 h-4' />;
      default:
        return <FileText className='w-4 h-4' />;
    }
  };

  const getModuleFromReportType = (reportType: string): string => {
    const type = reportTypes.find((t) => t.type === reportType);
    return type?.module || 'RS';
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.config.report_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || getModuleFromReportType(r.config.report_type) === filterModule;
    return matchesSearch && matchesModule;
  });

  const uniqueModules = Array.from(new Set(reportTypes.map((t) => t.module)));

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
          <p className='text-slate-600'>加载中...</p>
        </div>
      </div>
    );
  }

  if (!isServiceUp('report')) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100'>
        <div className='text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg'>
          <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6'>
            <FileText className='w-8 h-8 text-blue-600' />
          </div>
          <h2 className='text-2xl font-bold text-slate-900 mb-4'>报表服务未启动</h2>
          <p className='text-slate-600 mb-6'>Report服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。</p>
          <button
            onClick={() => navigate('/dashboard')}
            className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center'>
                  <FileText className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-slate-900'>报表中心</h1>
                  <p className='text-xs text-slate-500'>Report Center</p>
                </div>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => setShowBuilder(true)}
                className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Plus className='w-4 h-4' />
                <span>生成报表</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          <div className='flex items-center space-x-2'>
            {notification.type === 'success' && <CheckCircle className='w-5 h-5' />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Search and Filter */}
        <div className='mb-6 flex space-x-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400' />
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='搜索报表...'
              className='w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className='px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>全部模块</option>
            {uniqueModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>报表总数</p>
                <p className='text-3xl font-bold text-slate-900'>{reports.length}</p>
              </div>
              <div className='w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center'>
                <FileText className='w-6 h-6 text-blue-600' />
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>RS 模块</p>
                <p className='text-3xl font-bold text-orange-600'>
                  {reports.filter((r) => getModuleFromReportType(r.config.report_type) === 'RS').length}
                </p>
              </div>
              <div className='w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center'>
                <FileText className='w-6 h-6 text-orange-600' />
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>LIMS 模块</p>
                <p className='text-3xl font-bold text-blue-600'>
                  {reports.filter((r) => getModuleFromReportType(r.config.report_type) === 'LIMS').length}
                </p>
              </div>
              <div className='w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center'>
                <FileText className='w-6 h-6 text-blue-600' />
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>QMS 模块</p>
                <p className='text-3xl font-bold text-green-600'>
                  {reports.filter((r) => getModuleFromReportType(r.config.report_type) === 'QMS').length}
                </p>
              </div>
              <div className='w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center'>
                <FileText className='w-6 h-6 text-green-600' />
              </div>
            </div>
          </div>
        </div>

        {/* Report List */}
        <div className='bg-white rounded-xl shadow-sm'>
          <div className='p-6 border-b border-slate-200'>
            <h2 className='text-lg font-semibold text-slate-900'>报表列表</h2>
          </div>
          <div className='divide-y divide-slate-200'>
            {filteredReports.length === 0 ? (
              <div className='p-12 text-center'>
                <FileText className='w-16 h-16 text-slate-300 mx-auto mb-4' />
                <p className='text-slate-500'>暂无报表</p>
                <button
                  onClick={() => setShowBuilder(true)}
                  className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                >
                  生成第一个报表
                </button>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className='p-6 hover:bg-slate-50 transition-colors'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-3 mb-2'>
                        <h3 className='text-lg font-semibold text-slate-900'>{report.config.title}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getModuleColor(getModuleFromReportType(report.config.report_type))}`}
                        >
                          {getModuleFromReportType(report.config.report_type)}
                        </span>
                        <span className='px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700'>
                          {report.row_count} 条数据
                        </span>
                      </div>
                      {report.config.description && <p className='text-slate-600 mb-3'>{report.config.description}</p>}
                      <div className='flex items-center space-x-4 text-sm text-slate-500'>
                        <span className='flex items-center'>
                          <Calendar className='w-4 h-4 mr-1' />
                          创建时间: {new Date(report.created_at).toLocaleDateString('zh-CN')}
                        </span>
                        <span className='flex items-center'>
                          {getFormatIcon(report.config.format)}
                          <span className='ml-1'>{report.config.format.toUpperCase()}</span>
                        </span>
                        <span className='flex items-center'>
                          <Columns className='w-4 h-4 mr-1' />
                          {report.config.columns.length} 列
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <button
                        onClick={() => handleView(report)}
                        className='px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
                        title='查看'
                      >
                        <span className='flex items-center'>
                          <Eye className='w-4 h-4 mr-1' />
                          查看
                        </span>
                      </button>
                      <button
                        onClick={() => handleExport(report)}
                        className='px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg'
                        title='导出'
                      >
                        <span className='flex items-center'>
                          <Download className='w-4 h-4 mr-1' />
                          导出
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
                        title='删除'
                      >
                        <Trash2 className='w-5 h-5' />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Report Builder Modal */}
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

      {/* Report Viewer Modal */}
      {showViewer && selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => {
            setShowViewer(false);
            setSelectedReport(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && selectedReport && (
        <ExportModal
          report={selectedReport}
          onClose={() => {
            setShowExportModal(false);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};

export default ReportPage;
