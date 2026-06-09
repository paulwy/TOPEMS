import { useEffect, useState } from 'react';
import { safetyHazardApi, safetyCheckApi, emergencyPlanApi, drillRecordApi } from '../api/client';
import type { SafetyHazard, SafetyCheck, EmergencyPlan, DrillRecord } from '../types';

type TabType = 'hazards' | 'checks' | 'plans' | 'drills';

export function SafetyPage() {
  const [activeTab, setActiveTab] = useState<TabType>('hazards');
  const [hazards, setHazards] = useState<SafetyHazard[]>([]);
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hazardsData, checksData, plansData, drillsData] = await Promise.all([
        safetyHazardApi.list(),
        safetyCheckApi.list(),
        emergencyPlanApi.list(),
        drillRecordApi.list(),
      ]);
      setHazards(hazardsData);
      setChecks(checksData);
      setPlans(plansData);
      setDrills(drillsData);
    } catch (error) {
      console.error('Failed to load safety data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'hazards' as TabType, label: '安全隐患', count: hazards.length },
    { id: 'checks' as TabType, label: '安全检查', count: checks.length },
    { id: 'plans' as TabType, label: '应急预案', count: plans.length },
    { id: 'drills' as TabType, label: '演练记录', count: drills.length },
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
          <h1 className="text-2xl font-bold text-gray-900">安全管理</h1>
          <p className="text-gray-500 mt-1">管理安全隐患、检查和应急预案</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <span>➕</span>
          <span>新增记录</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'hazards' && (
            <div className="space-y-4">
              {hazards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无安全隐患记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编号</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">名称</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类别</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">等级</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {hazards.map((hazard) => (
                        <tr key={hazard.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{hazard.hazard_no}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{hazard.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{hazard.category}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              hazard.level === 'high' ? 'bg-red-100 text-red-700' :
                              hazard.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {hazard.level}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              hazard.status === 'open' ? 'bg-red-100 text-red-700' :
                              hazard.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {hazard.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(hazard.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'checks' && (
            <div className="space-y-4">
              {checks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无安全检查记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编号</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类型</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">检查人</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">结果</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {checks.map((check) => (
                        <tr key={check.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{check.check_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.check_type}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{check.inspector}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              check.result === 'pass' ? 'bg-green-100 text-green-700' :
                              check.result === 'fail' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {check.result}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              check.status === 'completed' ? 'bg-green-100 text-green-700' :
                              check.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {check.status}
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

          {activeTab === 'plans' && (
            <div className="space-y-4">
              {plans.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无应急预案</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{plan.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          plan.status === 'active' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{plan.plan_type}</p>
                      <p className="text-sm text-gray-500">{plan.plan_no}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'drills' && (
            <div className="space-y-4">
              {drills.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无演练记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">编号</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">名称</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">时长(小时)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">参与人员</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {drills.map((drill) => (
                        <tr key={drill.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{drill.drill_no}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{drill.drill_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{drill.duration_hours}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {drill.participants?.length || 0} 人
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
