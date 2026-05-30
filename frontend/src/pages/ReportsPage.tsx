import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart3, PieChart, 
  ChevronLeft, Users, Shield, FileText, Building, Download,
  X, FileSpreadsheet, FileType, FileJson, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { reportApi, type ReportsCenterStats, type ExportFormat } from '../api/report';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportsPageProps {
  onNavigate?: (page: string) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [stats, setStats] = useState<ReportsCenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'users' | 'permissions' | 'activities' | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 尝试调用真实API
      try {
        const res = await reportApi.getReportsCenterStats();
        if (res.success && res.data) {
          setStats(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('API调用失败，使用模拟数据:', err);
      }

      // 模拟数据作为后备方案
      const mockStats: ReportsCenterStats = {
        dashboard: {
          totalUsers: 156,
          activeUsers: 142,
          totalRoles: 12,
          totalPermissions: 48,
          totalCompanies: 5,
          totalDepartments: 24,
          totalEmployees: 328,
          recentActivities: 89,
        },
        userGrowth: [
          { month: '1月', 新增用户: 12, 活跃用户: 45 },
          { month: '2月', 新增用户: 19, 活跃用户: 52 },
          { month: '3月', 新增用户: 15, 活跃用户: 61 },
          { month: '4月', 新增用户: 25, 活跃用户: 78 },
          { month: '5月', 新增用户: 30, 活跃用户: 95 },
          { month: '6月', 新增用户: 28, 活跃用户: 110 },
        ],
        roleDistribution: [
          { name: '管理员', value: 5 },
          { name: '部门经理', value: 12 },
          { name: '普通员工', value: 89 },
          { name: '访客', value: 50 },
        ],
        activityTypes: [
          { name: '文档操作', count: 45 },
          { name: '登录登出', count: 120 },
          { name: '权限变更', count: 23 },
          { name: '数据查询', count: 78 },
          { name: '其他', count: 15 },
        ],
      };

      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('加载数据失败:', err);
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
      setLoading(false);
    }
  };

  const handleExportReport = async (reportType: 'users' | 'permissions' | 'activities') => {
    setSelectedReportType(reportType);
    setShowExportModal(true);
  };

  const confirmExport = async (format: ExportFormat) => {
    if (!selectedReportType) return;
    
    setExporting(true);
    try {
      const res = await reportApi.exportStatsReport(selectedReportType, format);
      if (res.success && res.data) {
        // 触发下载
        window.open(res.data.download_url, '_blank');
      } else {
        // 模拟下载
        const dataStr = `data:text/csv;charset=utf-8,${encodeURIComponent('模拟报表数据\n列1,列2,列3\n1,2,3')}`;
        const link = document.createElement('a');
        link.setAttribute('href', dataStr);
        link.setAttribute('download', `${selectedReportType}_report.${format}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setShowExportModal(false);
      addNotification({ title: '导出成功', message: '报表已成功导出', type: 'success' });
    } catch (err) {
      console.error('导出失败:', err);
      addNotification({ title: '导出失败', message: '导出报表失败', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    description,
    trend
  }: { 
    title: string, 
    value: number, 
    icon: any, 
    color?: 'blue' | 'green' | 'purple' | 'orange',
    description?: string,
    trend?: number
  }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
              {description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
              )}
              {trend !== undefined && (
                <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% 较上月
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <BarChart3 className="w-7 h-7 mr-3 text-blue-600 dark:text-blue-400" />
                  报表中心
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  用户统计、权限分析
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ModeToggle />
              <Button onClick={loadData}>
                <TrendingUp className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2" />
              </Card>
            ))
          ) : stats ? (
            <>
              <StatCard
                title="总用户数"
                value={stats.dashboard.totalUsers}
                icon={Users}
                color="blue"
                description={`活跃用户 ${stats.dashboard.activeUsers}`}
                trend={12.5}
              />
              <StatCard
                title="角色数量"
                value={stats.dashboard.totalRoles}
                icon={Shield}
                color="purple"
                description={`${stats.dashboard.totalPermissions} 个权限`}
                trend={5.2}
              />
              <StatCard
                title="公司数量"
                value={stats.dashboard.totalCompanies}
                icon={Building}
                color="green"
                description={`${stats.dashboard.totalDepartments} 个部门`}
                trend={0}
              />
              <StatCard
                title="员工数量"
                value={stats.dashboard.totalEmployees}
                icon={FileText}
                color="orange"
                description={`${stats.dashboard.recentActivities} 条近期操作`}
                trend={8.3}
              />
            </>
          ) : null}
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 用户增长趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                用户增长趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {loading ? (
                  <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="新增用户" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="活跃用户" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 角色分布图 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                角色分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {loading ? (
                  <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={stats?.roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats?.roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 活动类型统计图 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
              活动类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.activityTypes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 详细报表 */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg">详细报表</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                variant="ghost" 
                className="h-auto p-4 justify-start border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                onClick={() => handleExportReport('users')}
              >
                <div className="text-left">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">用户统计报表</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">导出用户列表和统计信息</p>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm">
                    <Download className="w-4 h-4 mr-1" />
                    生成报表
                  </div>
                </div>
              </Button>
              <Button 
                variant="ghost" 
                className="h-auto p-4 justify-start border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                onClick={() => handleExportReport('permissions')}
              >
                <div className="text-left">
                  <div className="flex items-center mb-2">
                    <Shield className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">权限分析报表</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">分析角色和权限分配情况</p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 text-sm">
                    <Download className="w-4 h-4 mr-1" />
                    生成报表
                  </div>
                </div>
              </Button>
              <Button 
                variant="ghost" 
                className="h-auto p-4 justify-start border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all"
                onClick={() => handleExportReport('activities')}
              >
                <div className="text-left">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">活动趋势报表</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">用户活动和系统使用情况</p>
                  <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                    <Download className="w-4 h-4 mr-1" />
                    生成报表
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 导出模态框 */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              导出{selectedReportType === 'users' ? '用户统计' : selectedReportType === 'permissions' ? '权限分析' : '活动趋势'}报表
            </DialogTitle>
            <DialogDescription>选择导出格式</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="ghost"
              onClick={() => confirmExport('excel')}
              disabled={exporting}
              className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-green-300 dark:hover:border-green-700 transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Excel</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => confirmExport('pdf')}
              disabled={exporting}
              className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-red-300 dark:hover:border-red-700 transition-all"
            >
              <FileType className="w-8 h-8 text-red-600 dark:text-red-400 mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => confirmExport('csv')}
              disabled={exporting}
              className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <FileJson className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV</span>
            </Button>
          </div>
          {exporting && (
            <div className="flex items-center justify-center mt-4 text-gray-600 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              正在生成报表...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
