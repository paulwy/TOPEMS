import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  safetyHazardApi,
  safetyCheckApi,
  trainingProgramApi,
  monitoringPointApi,
} from '../api/client';
import type { SafetyHazard, SafetyCheck, TrainingProgram, MonitoringPoint } from '../types';

export function Dashboard() {
  const [hazards, setHazards] = useState<SafetyHazard[]>([]);
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hazardsData, checksData, trainingsData, pointsData] = await Promise.all([
        safetyHazardApi.list(),
        safetyCheckApi.list(),
        trainingProgramApi.list(),
        monitoringPointApi.list(),
      ]);
      setHazards(hazardsData);
      setChecks(checksData);
      setTrainings(trainingsData);
      setPoints(pointsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalHazards = hazards.filter(h => h.level === 'high').length;
  const pendingChecks = checks.filter(c => c.status === 'pending').length;
  const activeTrainings = trainings.filter(t => t.status === 'active').length;
  const alertPoints = points.filter(p => p.status === 'alert').length;

  const stats = [
    {
      label: '安全隐患',
      value: hazards.length,
      critical: criticalHazards,
      icon: '⚠️',
      color: 'orange',
      link: '/safety',
    },
    {
      label: '安全检查',
      value: checks.length,
      pending: pendingChecks,
      icon: '✅',
      color: 'green',
      link: '/safety',
    },
    {
      label: '培训课程',
      value: trainings.length,
      active: activeTrainings,
      icon: '📚',
      color: 'blue',
      link: '/training',
    },
    {
      label: '监测点',
      value: points.length,
      alert: alertPoints,
      icon: '🌡️',
      color: 'purple',
      link: '/environment',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EHS 仪表盘</h1>
          <p className="text-gray-500 mt-1">环境健康安全管理概览</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <span>🔄</span>
          <span>刷新</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                {(stat.critical !== undefined || stat.pending !== undefined || stat.active !== undefined || stat.alert !== undefined) && (
                  <p className="text-sm mt-2">
                    <span className="text-red-600 font-medium">
                      {stat.critical || stat.pending || stat.active || stat.alert}
                    </span>
                    <span className="text-gray-500 ml-1">
                      {stat.critical !== undefined ? '个高危' : 
                       stat.pending !== undefined ? '个待处理' :
                       stat.active !== undefined ? '个进行中' : '个告警'}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近安全隐患</h2>
          {hazards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无安全隐患记录</p>
          ) : (
            <div className="space-y-3">
              {hazards.slice(0, 5).map((hazard) => (
                <div key={hazard.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${
                      hazard.level === 'high' ? 'bg-red-500' :
                      hazard.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></span>
                    <div>
                      <p className="font-medium text-gray-900">{hazard.name}</p>
                      <p className="text-sm text-gray-500">{hazard.hazard_no}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    hazard.status === 'open' ? 'bg-red-100 text-red-700' :
                    hazard.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {hazard.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">即将到期的培训</h2>
          {trainings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无培训课程</p>
          ) : (
            <div className="space-y-3">
              {trainings.slice(0, 5).map((training) => (
                <div key={training.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{training.title}</p>
                    <p className="text-sm text-gray-500">
                      {training.start_date ? new Date(training.start_date).toLocaleDateString() : '未安排'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    training.status === 'active' ? 'bg-green-100 text-green-700' :
                    training.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {training.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
