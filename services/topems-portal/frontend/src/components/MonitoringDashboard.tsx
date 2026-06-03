import React, { useState, useEffect } from 'react';

interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms: number;
  last_check: string;
  message?: string;
}

interface MonitoringMetrics {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  avg_response_time_ms: number;
  active_connections: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

interface Alert {
  id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggered_at: string;
  acknowledged: boolean;
}

const MonitoringDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'alerts' | 'logs'>('overview');

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchMonitoringData = async () => {
    try {
      const [servicesRes, metricsRes, alertsRes] = await Promise.all([
        fetch('/api/v1/monitoring/services'),
        fetch('/api/v1/monitoring/metrics'),
        fetch('/api/v1/monitoring/alerts'),
      ]);
      
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.data || []);
      }
      
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.data);
      }
      
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getErrorRate = () => {
    if (!metrics || metrics.requests_total === 0) return '0%';
    const rate = (metrics.requests_failed / metrics.requests_total * 100).toFixed(2);
    return `${rate}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总请求数</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.requests_total?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均响应时间</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.avg_response_time_ms || 0}ms
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">错误率</p>
              <p className={`text-2xl font-bold ${parseFloat(getErrorRate()) > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                {getErrorRate()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">活跃告警</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${alerts.length > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <svg className={`w-6 h-6 ${alerts.length > 0 ? 'text-yellow-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: '总览' },
              { key: 'services', label: '服务状态' },
              { key: 'alerts', label: '告警管理' },
              { key: 'logs', label: '日志分析' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {label}
                {key === 'alerts' && alerts.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">服务健康状态</h3>
                <div className="space-y-3">
                  {services.slice(0, 5).map((service) => (
                    <div key={service.service_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                        <span className="text-sm font-medium text-gray-900">{service.service_name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{service.response_time_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">活跃告警</h3>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                          {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                        </span>
                        <span className="text-sm text-gray-900">{alert.message}</span>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">暂无活跃告警</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">服务</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">响应时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后检查</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map((service) => (
                    <tr key={service.service_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.service_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)} text-white`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.response_time_ms}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(service.last_check).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{alert.rule_name}</h4>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs mt-2 opacity-75">
                        触发时间: {new Date(alert.triggered_at).toLocaleString()}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100">
                        确认
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无活跃告警</p>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="text-center text-gray-500 py-8">
              日志分析功能开发中...
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          自动刷新: 每 {refreshInterval} 秒
        </p>
        <div className="flex items-center space-x-2">
          {[10, 30, 60].map((interval) => (
            <button
              key={interval}
              onClick={() => setRefreshInterval(interval)}
              className={`px-3 py-1 text-sm rounded ${refreshInterval === interval ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'}`}
            >
              {interval}s
            </button>
          ))}
          <button
            onClick={fetchMonitoringData}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            刷新
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
