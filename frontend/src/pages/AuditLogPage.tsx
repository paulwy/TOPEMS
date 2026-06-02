import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, ChevronLeft, AlertCircle, 
  Shield, User, Activity, FileText, FlaskConical, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditLimsApi, AuditLog as LimsAuditLog } from '../api/lims';
import { auditRsApi, AuditLog as RsAuditLog } from '../api/rs';
import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModeToggle } from '@/components/ModeToggle';

interface AuditLogPageProps {
  onNavigate?: (page: string) => void;
}

type AuditLogSource = 'lims' | 'rs';
type AuditLog = LimsAuditLog | RsAuditLog;

const AuditLogPage: React.FC<AuditLogPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
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
    } catch (error: any) {
      console.error('加载审计日志失败:', error);
      setLogs([]);
      addNotification({ title: '加载失败', message: error.message || '加载审计日志失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [source, currentPage, filterStatus, filterAction, filterEntityType]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      success: { variant: 'bg-green-100 text-green-700', label: '成功' },
      partial: { variant: 'bg-yellow-100 text-yellow-700', label: '部分成功' },
      error: { variant: 'bg-red-100 text-red-700', label: '失败' },
    };
    const config = badges[status] || { variant: 'bg-gray-100 text-gray-700', label: status };
    return (
      <Badge className={`${config.variant} ${status === 'success' ? '' : status === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>
        {config.label}
      </Badge>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Shield className="w-7 h-7 mr-3 text-blue-600" />
                  安全审计
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  访问日志、操作审计
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ModeToggle />
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setSource('lims')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    source === 'lims' ? 'bg-cyan-600 text-white' : 'text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  LIMS
                </button>
                <button
                  onClick={() => setSource('rs')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    source === 'rs' ? 'bg-orange-600 text-white' : 'text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FlaskConical className="w-4 h-4 mr-1.5" />
                  RS
                </button>
              </div>
              <Button onClick={loadLogs}>
                <Activity className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索用户名、操作、实体类型、IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="success">成功</SelectItem>
                      <SelectItem value="partial">部分成功</SelectItem>
                      <SelectItem value="error">失败</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="全部操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部操作</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{formatAction(action)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="全部实体" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部实体</SelectItem>
                    {uniqueEntityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">暂无审计日志</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          用户
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          操作
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          实体类型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          IP地址
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          详情
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(log.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {log.user_name || log.user_id || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatAction(log.action)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.entity_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.ip_address || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            {log.error_message && (
                              <span className="text-red-600 dark:text-red-400 text-xs">{log.error_message}</span>
                            )}
                            {!log.error_message && log.request_details && (
                              <span className="text-gray-600 dark:text-gray-300 text-xs truncate">
                                {JSON.stringify(log.request_details)}
                              </span>
                            )}
                            {!log.error_message && !log.request_details && '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {total > pageSize && (
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      显示第 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, total)} 条，共 {total} 条
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage * pageSize >= total}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditLogPage;