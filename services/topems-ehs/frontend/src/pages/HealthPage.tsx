import { useEffect, useState } from 'react';
import { healthRecordApi, healthCheckupApi } from '../api/client';
import type { HealthRecord, HealthCheckup } from '../types';

type TabType = 'records' | 'checkups';

export function HealthPage() {
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [checkups, setCheckups] = useState<HealthCheckup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsData, checkupsData] = await Promise.all([
        healthRecordApi.list(),
        healthCheckupApi.list(),
      ]);
      setRecords(recordsData);
      setCheckups(checkupsData);
    } catch (error) {
      console.error('Failed to load health data:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">健康管理</h1>
          <p className="text-gray-500 mt-1">员工健康档案和体检管理</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <span>➕</span>
          <span>新增记录</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              健康档案
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {records.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('checkups')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'checkups'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              体检记录
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {checkups.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'records' && (
            <div className="space-y-4">
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无健康档案</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">员工</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">血型</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">过敏史</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{record.employee_name}</div>
                            <div className="text-sm text-gray-500">{record.employee_id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.blood_type || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {record.allergies?.length ? `${record.allergies.length} 项` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {record.status}
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

          {activeTab === 'checkups' && (
            <div className="space-y-4">
              {checkups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无体检记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">员工</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">体检日期</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">类型</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">机构</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {checkups.map((checkup) => (
                        <tr key={checkup.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{checkup.employee_name}</div>
                            <div className="text-sm text-gray-500">{checkup.employee_id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(checkup.checkup_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{checkup.checkup_type}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{checkup.institution || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              checkup.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {checkup.status}
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
