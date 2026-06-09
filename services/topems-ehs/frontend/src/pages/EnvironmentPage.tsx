import { useEffect, useState } from 'react';
import { monitoringPointApi } from '../api/client';
import type { MonitoringPoint } from '../types';

export function EnvironmentPage() {
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await monitoringPointApi.list();
      setPoints(data);
    } catch (error) {
      console.error('Failed to load environment data:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">环境管理</h1>
          <p className="text-gray-500 mt-1">环境监测点和数据管理</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <span>➕</span>
          <span>新增监测点</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {points.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-4xl mb-4">🌍</div>
            <p className="text-gray-500">暂无环境监测点</p>
          </div>
        ) : (
          points.map((point) => (
            <div key={point.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{point.name}</h3>
                  <p className="text-sm text-gray-500">{point.point_no}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  point.status === 'normal' ? 'bg-green-100 text-green-700' :
                  point.status === 'alert' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {point.status}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">类型：</span>
                  <span className="text-sm text-gray-900">{point.point_type}</span>
                </div>
                {point.location && (
                  <div>
                    <span className="text-sm text-gray-500">位置：</span>
                    <span className="text-sm text-gray-900">{point.location}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">监测参数：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {point.parameters?.map((param, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                {point.last_data_time ? (
                  <p className="text-sm text-gray-500">
                    最后更新：{new Date(point.last_data_time).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">暂无数据</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
