import React, { useState, useEffect, useCallback } from 'react';
import { Service, HealthCheckResult, portalApi } from '../api/portal';

interface HealthDashboardProps {
  services: Service[];
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ services }) => {
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const results = await portalApi.getAllServicesHealth(services);
      setHealthResults(results);
      setLastChecked(new Date().toLocaleString('zh-CN'));
    } catch (error) {
      console.error('Failed to check health:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [services]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50';
      case 'degraded':
        return 'bg-yellow-50';
      case 'unhealthy':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200';
      case 'degraded':
        return 'border-yellow-200';
      case 'unhealthy':
        return 'border-red-200';
      default:
        return 'border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '健康';
      case 'degraded':
        return '降级';
      case 'unhealthy':
        return '异常';
      default:
        return status;
    }
  };

  const healthyCount = healthResults.filter((r) => r.status === 'healthy').length;
  const degradedCount = healthResults.filter((r) => r.status === 'degraded').length;
  const unhealthyCount = healthResults.filter((r) => r.status === 'unhealthy').length;
  const overallStatus = unhealthyCount > 0 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy';

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💚</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">服务健康监控</h2>
              <p className="text-sm text-gray-500">实时监控各服务运行状态</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">最后检查: {lastChecked}</span>
            <button
              onClick={checkHealth}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  刷新中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-lg ${getStatusBgColor('healthy')} border ${getStatusBorderColor('healthy')}`}>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${getStatusColor('healthy')} mr-2`}></span>
              <span className="text-sm text-gray-600">健康</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusTextColor('healthy')} mt-1`}>{healthyCount}</div>
          </div>
          <div className={`p-4 rounded-lg ${getStatusBgColor('degraded')} border ${getStatusBorderColor('degraded')}`}>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${getStatusColor('degraded')} mr-2`}></span>
              <span className="text-sm text-gray-600">降级</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusTextColor('degraded')} mt-1`}>{degradedCount}</div>
          </div>
          <div className={`p-4 rounded-lg ${getStatusBgColor('unhealthy')} border ${getStatusBorderColor('unhealthy')}`}>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${getStatusColor('unhealthy')} mr-2`}></span>
              <span className="text-sm text-gray-600">异常</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusTextColor('unhealthy')} mt-1`}>{unhealthyCount}</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-sm text-gray-600">总计</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{healthResults.length}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center mb-4">
          <span className={`w-3 h-3 rounded-full ${getStatusColor(overallStatus)} mr-2`}></span>
          <span className={`text-sm font-medium ${getStatusTextColor(overallStatus)}`}>
            系统整体状态: {getStatusText(overallStatus)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">服务名称</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">响应时间</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">消息</th>
              </tr>
            </thead>
            <tbody>
              {healthResults.map((result) => (
                <tr key={result.service_name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{result.service_name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBgColor(result.status)} ${getStatusTextColor(result.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(result.status)} mr-1.5`}></span>
                      {getStatusText(result.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {result.response_time !== undefined ? (
                      <span className={`text-sm font-mono ${result.response_time > 2000 ? 'text-red-600' : 'text-gray-600'}`}>
                        {result.response_time}ms
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 truncate max-w-md" title={result.message}>
                      {result.message}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
