import { useEffect, useState } from 'react';
import { trainingProgramApi, trainingRecordApi } from '../api/client';
import type { TrainingProgram, TrainingRecord } from '../types';

type TabType = 'programs' | 'records';

export function TrainingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('programs');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [programsData, recordsData] = await Promise.all([
        trainingProgramApi.list(),
        trainingRecordApi.list(),
      ]);
      setPrograms(programsData);
      setRecords(recordsData);
    } catch (error) {
      console.error('Failed to load training data:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">培训管理</h1>
          <p className="text-gray-500 mt-1">培训计划和培训记录管理</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <span>➕</span>
          <span>新增计划</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('programs')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'programs'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              培训计划
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {programs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              培训记录
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {records.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'programs' && (
            <div className="space-y-4">
              {programs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无培训计划</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((program) => (
                    <div key={program.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{program.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          program.status === 'active' ? 'bg-green-100 text-green-700' :
                          program.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {program.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{program.training_type}</p>
                      <p className="text-sm text-gray-500 mb-2">{program.program_no}</p>
                      <div className="text-sm text-gray-500">
                        {program.start_date && program.end_date ? (
                          <span>
                            {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>日期未安排</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-4">
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无培训记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">员工</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">报名日期</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">完成日期</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">成绩</th>
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
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(record.enrollment_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {record.score !== undefined ? `${record.score} 分` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.status === 'completed' ? 'bg-green-100 text-green-700' :
                              record.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
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
        </div>
      </div>
    </div>
  );
}
