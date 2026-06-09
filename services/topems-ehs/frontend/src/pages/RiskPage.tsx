import { useEffect, useState } from 'react';
import { riskAssessmentApi, safetyIncidentApi } from '../api/client';
import type { RiskAssessment, SafetyIncident } from '../types';

type TabType = 'assessments' | 'incidents';

export function RiskPage() {
  const [activeTab, setActiveTab] = useState<TabType>('assessments');
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assessmentsData, incidentsData] = await Promise.all([
        riskAssessmentApi.list(),
        safetyIncidentApi.list(),
      ]);
      setAssessments(assessmentsData);
      setIncidents(incidentsData);
    } catch (error) {
      console.error('Failed to load risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">风险评估</h1>
          <p className="text-gray-500 mt-1">风险评估和安全事故管理</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <span>➕</span>
          <span>新增评估</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'assessments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              风险评估
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {assessments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'incidents'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              安全事故
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {incidents.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'assessments' && (
            <div className="space-y-4">
              {assessments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无风险评估记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编号</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">标题</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">风险源</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">风险等级</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">评分</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {assessments.map((assessment) => (
                        <tr key={assessment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{assessment.assessment_no}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{assessment.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{assessment.risk_source}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(assessment.risk_level)}`}>
                              {assessment.risk_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{assessment.risk_score}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              assessment.status === 'open' ? 'bg-red-100 text-red-700' :
                              assessment.status === 'mitigated' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {assessment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无安全事故记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编号</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">标题</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类型</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">等级</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">伤亡</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {incidents.map((incident) => (
                        <tr key={incident.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{incident.incident_no}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{incident.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{incident.incident_type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(incident.incident_level)}`}>
                              {incident.incident_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {incident.casualties || 0} 死 / {incident.injuries || 0} 伤
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              incident.status === 'reported' ? 'bg-yellow-100 text-yellow-700' :
                              incident.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                              incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {incident.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
