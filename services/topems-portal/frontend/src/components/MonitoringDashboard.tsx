import React, { useState, useEffect } from 'react';
import { MonitoringService, MonitoringMetrics, Alert, LogEntry, portalApi } from '../api/portal';

type ActiveTab = 'overview' | 'services' | 'alerts' | 'logs';

const MonitoringDashboard: React.FC = () => {
  const [services, setServices] = useState<MonitoringService[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchMonitoringData = async () => {
    try {
      const [servicesRes, metricsRes, alertsRes, logsRes] = await Promise.all([
        portalApi.getMonitoringServices(),
        portalApi.getMonitoringMetrics(),
        portalApi.getMonitoringAlerts(),
        portalApi.getMonitoringLogs(),
      ]);
      
      setServices(servicesRes);
      setMetrics(metricsRes);
      setAlerts(alertsRes);
      setLogs(logsRes);
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      await portalApi.acknowledgeAlert(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 font-medium';
      case 'WARN': return 'text-yellow-600';
      case 'INFO': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getErrorRate = () => {
    if (!metrics || metrics.requests_total === 0) return '0%';
    const rate = (metrics.requests_failed / metrics.requests_total * 100).toFixed(2);
    return `${rate}%`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统监控中心</h1>
            <p className="text-sm text-gray-500 mt-1">实时监控各服务运行状态和系统指标</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">自动刷新: 每 {refreshInterval} 秒</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">总请求数</p>
                <p className="text-2xl font-bold text-blue-900">
                  {metrics?.requests_total?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">平均响应时间</p>
                <p className="text-2xl font-bold text-green-900">
                  {metrics?.avg_response_time_ms || 0}ms
                </p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">错误率</p>
                <p className={`text-2xl font-bold ${parseFloat(getErrorRate()) > 5 ? 'text-red-600' : 'text-red-900'}`}>
                  {getErrorRate()}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">活跃告警</p>
                <p className="text-2xl font-bold text-purple-900">{alerts.filter(a => !a.acknowledged).length}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${alerts.filter(a => !a.acknowledged).length > 0 ? 'bg-yellow-200' : 'bg-purple-200'}`}>
                <svg className={`w-6 h-6 ${alerts.filter(a => !a.acknowledged).length > 0 ? 'text-yellow-600' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview' as ActiveTab, label: '总览' },
              { key: 'services' as ActiveTab, label: '服务状态' },
              { key: 'alerts' as ActiveTab, label: '告警管理' },
              { key: 'logs' as ActiveTab, label: '日志分析' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {label}
                {key === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    {alerts.filter(a => !a.acknowledged).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">服务健康状态</h3>
                <div className="space-y-3">
                  {services.slice(0, 6).map((service) => (
                    <div key={service.service_name} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                        <span className="text-sm font-medium text-gray-900">{service.service_name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{service.response_time_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">活跃告警</h3>
                <div className="space-y-3">
                  {alerts.filter(a => !a.acknowledged).slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                            {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                          </span>
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                        >
                          确认
                        </button>
                      </div>
                      <p className="text-xs mt-1 opacity-75">
                        触发时间: {formatTime(alert.triggered_at)}
                      </p>
                    </div>
                  ))}
                  {alerts.filter(a => !a.acknowledged).length === 0 && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">消息</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map((service) => (
                    <tr key={service.service_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.service_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          service.status === 'healthy' ? 'bg-green-100 text-green-800' :
                          service.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(service.status)} mr-1.5`}></span>
                          {service.status === 'healthy' ? '健康' : service.status === 'degraded' ? '降级' : '异常'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.response_time_ms}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(service.last_check).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.message || '-'}
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
                <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{alert.rule_name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                          {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs mt-2 opacity-75">
                        触发时间: {formatTime(alert.triggered_at)}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                      >
                        确认告警
                      </button>
                    )}
                    {alert.acknowledged && (
                      <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded">
                        已确认
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无告警</p>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-300">系统日志</h3>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className={`text-xs font-mono ${getLevelColor(log.level)} min-w-[60px]`}>
                      [{log.level}]
                    </span>
                    <span className="text-xs text-blue-400 min-w-[80px]">
                      {log.service}
                    </span>
                    <span className="text-sm text-gray-300 flex-1">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;