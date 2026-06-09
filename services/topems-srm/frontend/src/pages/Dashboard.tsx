import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { statisticsApi, supplierApi } from '../api/client';
import type { SrmStatistics, Supplier } from '../types';

export function Dashboard() {
  const [stats, setStats] = useState<SrmStatistics | null>(null);
  const [recentSuppliers, setRecentSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, suppliersData] = await Promise.all([
        statisticsApi.get(),
        supplierApi.list(),
      ]);
      setStats(statsData);
      setRecentSuppliers(suppliersData.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: '供应商总数',
      value: stats?.total_suppliers || 0,
      icon: '🏢',
      color: 'blue',
      link: '/suppliers',
    },
    {
      label: '活跃供应商',
      value: stats?.active_suppliers || 0,
      icon: '✅',
      color: 'green',
      link: '/suppliers',
    },
    {
      label: '平均评分',
      value: stats?.avg_score ? stats.avg_score.toFixed(1) : '0.0',
      icon: '⭐',
      color: 'yellow',
      link: '/evaluations',
    },
    {
      label: '订单总数',
      value: stats?.total_orders || 0,
      icon: '📦',
      color: 'purple',
      link: '/contracts',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎使用 TOPEMS-SRM 供应商管理系统</p>
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
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]} flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">订单统计</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">待处理订单</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{stats?.pending_orders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">已完成订单</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{stats?.completed_orders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">活跃合同</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{stats?.active_contracts || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近添加的供应商</h2>
            <Link to="/suppliers" className="text-sm text-blue-600 hover:text-blue-800">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {recentSuppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  <p className="text-sm text-gray-500">{supplier.supplier_no}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    supplier.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {supplier.status}
                </span>
              </div>
            ))}
            {recentSuppliers.length === 0 && (
              <p className="text-gray-500 text-center py-8">暂无供应商数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
