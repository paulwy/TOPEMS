import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Bell,
  CheckCircle,
  Archive,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotificationStats,
  notificationServiceApi,
  NotificationStats,
} from '../api/notification';
import { MetricCard } from '../components/MetricCard';
import { StatsChart } from '../components/StatsChart';
import { NotificationContainer } from '../components/NotificationContainer';
import { useNotification } from '../hooks/useNotification';

const NotificationStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState<{
    status: string;
    uptime: string;
    dependencies: Array<{ name: string; status: string }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        getMyNotificationStats(),
        notificationServiceApi.health(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setServiceStatus({
          status: healthRes.data.status,
          uptime: healthRes.data.uptime,
          dependencies: healthRes.data.dependencies || [],
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStats = () => {
    if (!stats) return [];
    const byType = stats.notifications_by_type;
    return [
      { name: '系统通知', value: byType?.system || 0, color: '#3B82F6' },
      { name: '审批通知', value: byType?.workflow || 0, color: '#8B5CF6' },
      { name: '提醒通知', value: byType?.reminder || 0, color: '#F59E0B' },
      { name: '告警通知', value: byType?.alert || 0, color: '#EF4444' },
      { name: '消息通知', value: byType?.message || 0, color: '#10B981' },
    ];
  };

  const getDailyStats = () => {
    if (!stats) return [];
    const byDay = stats.notifications_by_day;
    if (!byDay || typeof byDay !== 'object') return [];

    return Object.entries(byDay)
      .map(([date, count]) => ({
        date,
        count: typeof count === 'number' ? count : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-blue-600 mx-auto animate-spin' />
          <p className='mt-2 text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <NotificationContainer notifications={notifications} onClose={hideNotification} />

      {/* Header */}
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/notifications')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <BarChart3 className='w-7 h-7 mr-3 text-blue-600' />
                  通知统计
                </h1>
                <p className='mt-1 text-sm text-gray-500'>查看通知数据的统计分析</p>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <button
                onClick={loadData}
                className='flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
              >
                <RefreshCw className='w-5 h-5 mr-2' />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>
        {/* Service Status */}
        {serviceStatus && (
          <div className='bg-white rounded-lg shadow-sm p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <div
                  className={`w-3 h-3 rounded-full mr-3 ${
                    serviceStatus.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className='text-sm font-medium text-gray-900'>
                  通知服务状态：{serviceStatus.status === 'healthy' ? '健康' : '异常'}
                </span>
              </div>
              <div className='flex items-center space-x-6 text-sm text-gray-500'>
                <span>运行时长：{serviceStatus.uptime}</span>
                {serviceStatus.dependencies.map((dep, idx) => (
                  <span key={idx}>
                    {dep.name}：{dep.status === 'healthy' ? '正常' : '异常'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        {stats && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            <MetricCard
              title='总通知数'
              value={stats.total_notifications}
              icon={<Bell className='w-6 h-6' />}
              color='blue'
            />
            <MetricCard
              title='未读通知'
              value={stats.unread_notifications}
              icon={<Bell className='w-6 h-6' />}
              color='red'
            />
            <MetricCard
              title='已读通知'
              value={stats.read_notifications}
              icon={<CheckCircle className='w-6 h-6' />}
              color='green'
            />
            <MetricCard
              title='归档通知'
              value={stats.archived_notifications}
              icon={<Archive className='w-6 h-6' />}
              color='orange'
            />
          </div>
        )}

        {/* Charts */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Notification by Type */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <div className='flex items-center mb-4'>
              <TrendingUp className='w-5 h-5 text-blue-600 mr-2' />
              <h3 className='text-lg font-semibold text-gray-900'>通知类型分布</h3>
            </div>
            <div className='h-64'>
              <StatsChart
                type='bar'
                title='通知类型分布'
                data={getTypeStats()}
                xKey='name'
                yKey='value'
                colors={getTypeStats().map((d) => d.color)}
              />
            </div>
          </div>

          {/* Daily Trend */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <div className='flex items-center mb-4'>
              <Calendar className='w-5 h-5 text-blue-600 mr-2' />
              <h3 className='text-lg font-semibold text-gray-900'>近7天趋势</h3>
            </div>
            <div className='h-64'>
              <StatsChart
                type='line'
                title='近7天趋势'
                data={getDailyStats()}
                xKey='date'
                yKey='count'
                colors={['#3B82F6']}
              />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>详细数据</h3>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    指标
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    数量
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    占比
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                <tr>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>系统通知</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats?.notifications_by_type?.system || 0}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats && stats.total_notifications > 0
                      ? ((stats.notifications_by_type?.system || 0) / stats.total_notifications * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
                <tr>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>审批通知</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats?.notifications_by_type?.workflow || 0}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats && stats.total_notifications > 0
                      ? ((stats.notifications_by_type?.workflow || 0) / stats.total_notifications * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
                <tr>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>提醒通知</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats?.notifications_by_type?.reminder || 0}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats && stats.total_notifications > 0
                      ? ((stats.notifications_by_type?.reminder || 0) / stats.total_notifications * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
                <tr>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>告警通知</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats?.notifications_by_type?.alert || 0}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats && stats.total_notifications > 0
                      ? ((stats.notifications_by_type?.alert || 0) / stats.total_notifications * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
                <tr>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>消息通知</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats?.notifications_by_type?.message || 0}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                    {stats && stats.total_notifications > 0
                      ? ((stats.notifications_by_type?.message || 0) / stats.total_notifications * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className='mt-4 text-xs text-gray-500 text-right'>
            数据更新时间：{stats?.generated_at ? new Date(stats.generated_at).toLocaleString('zh-CN') : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationStatsPage;
