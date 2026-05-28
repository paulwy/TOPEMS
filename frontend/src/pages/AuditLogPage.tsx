import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, ChevronLeft, AlertCircle, 
  Shield, User, Activity, FileText, FlaskConical, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditLimsApi, AuditLog as LimsAuditLog } from '../api/lims';
import { auditRsApi, AuditLog as RsAuditLog } from '../api/rs';

interface AuditLogPageProps {
  onNavigate?: (page: string) => void;
}

type AuditLogSource = 'lims' | 'rs';
type AuditLog = LimsAuditLog | RsAuditLog;

const AuditLogPage: React.FC<AuditLogPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [source, setSource] = useState<AuditLogSource>('lims');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const api = source === 'lims' ? auditLimsApi : auditRsApi;
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterAction !== 'all') {
        params.action = filterAction;
      }
      if (filterEntityType !== 'all') {
        params.entity_type = filterEntityType;
      }
      const response = await api.listAuditLogs(params);
      if (response.success && response.data) {
        setLogs(response.data.audit_logs);
        setTotal(response.data.total);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('加载审计日志失败:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [source, currentPage, filterStatus, filterAction, filterEntityType]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      success: '成功',
      partial: '部分成功',
      error: '失败',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      'batch_create': '批量创建',
      'batch_delete': '批量删除',
      'export': '导出',
      'import': '导入',
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'read': '读取',
    };
    return map[action] || action;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.user_name?.toLowerCase() || '').includes(query) ||
      (log.user_id?.toLowerCase() || '').includes(query) ||
      (log.action?.toLowerCase() || '').includes(query) ||
      (log.entity_type?.toLowerCase() || '').includes(query) ||
      (log.ip_address?.toLowerCase() || '').includes(query)
    );
  });

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();
  const uniqueEntityTypes = Array.from(new Set(logs.map(log => log.entity_type))).sort();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Shield className="w-7 h-7 mr-3 text-blue-600" />
                  安全审计
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  访问日志、操作审计
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setSource('lims')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    source === 'lims' ? 'bg-cyan-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  LIMS
                </button>
                <button
                  onClick={() => setSource('rs')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    source === 'rs' ? 'bg-orange-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FlaskConical className="w-4 h-4 mr-1.5" />
                  RS
                </button>
              </div>
              <button
                onClick={loadLogs}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Activity className="w-4 h-4 mr-2" />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索用户名、操作、实体类型、IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部状态</option>
                  <option value="success">成功</option>
                  <option value="partial">部分成功</option>
                  <option value="error">失败</option>
                </select>
              </div>

              <div>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部操作</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{formatAction(action)}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部实体</option>
                  {uniqueEntityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-slate-500">加载中...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">暂无审计日志</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      实体类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      IP地址
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-slate-900">
                              {log.user_name || log.user_id || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.error_message && (
                          <span className="text-red-600 text-xs">{log.error_message}</span>
                        )}
                        {!log.error_message && log.request_details && (
                          <span className="text-slate-600 text-xs truncate max-w-xs">
                            {JSON.stringify(log.request_details)}
                          </span>
                        )}
                        {!log.error_message && !log.request_details && '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {total > pageSize && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-700">
                    显示第 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, total)} 条，共 {total} 条
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage * pageSize >= total}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
