import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../api/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const QmsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [inspectionRes, issueRes, actionRes] = await Promise.all([
        apiClient.get('/api/v1/inspections'),
        apiClient.get('/api/v1/issues'),
        apiClient.get('/api/v1/corrective-actions'),
      ]);

      const inspections = inspectionRes.data?.data?.inspections || [];
      const issues = issueRes.data?.data?.issues || [];
      const actions = actionRes.data?.data?.actions || [];

      // Process inspection stats
      const inspectionStats = {
        total: inspections.length,
        pending: inspections.filter((i: any) => i.status === 'pending').length,
        in_progress: inspections.filter((i: any) => i.status === 'in_progress').length,
        completed: inspections.filter((i: any) => i.status === 'completed').length,
      };

      // Process issue stats
      const issueStats = {
        total: issues.length,
        open: issues.filter((i: any) => i.status === 'open').length,
        in_progress: issues.filter((i: any) => i.status === 'in_progress').length,
        resolved: issues.filter((i: any) => i.status === 'resolved').length,
        critical: issues.filter((i: any) => i.severity === 'critical').length,
      };

      // Process action stats
      const actionStats = {
        total: actions.length,
        pending: actions.filter((a: any) => a.status === 'pending').length,
        in_progress: actions.filter((a: any) => a.status === 'in_progress').length,
        completed: actions.filter((a: any) => a.status === 'completed').length,
        verified: actions.filter((a: any) => a.status === 'verified').length,
      };

      setStats({ inspectionStats, issueStats, actionStats });
    } catch (err) {
      console.error('获取统计数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  const inspectionPieData = [
    { name: '待检查', value: stats?.inspectionStats?.pending || 0 },
    { name: '检查中', value: stats?.inspectionStats?.in_progress || 0 },
    { name: '已完成', value: stats?.inspectionStats?.completed || 0 },
  ];

  const issueBarData = [
    { name: '开放', value: stats?.issueStats?.open || 0 },
    { name: '处理中', value: stats?.issueStats?.in_progress || 0 },
    { name: '已解决', value: stats?.issueStats?.resolved || 0 },
  ];

  const actionBarData = [
    { name: '待执行', value: stats?.actionStats?.pending || 0 },
    { name: '执行中', value: stats?.actionStats?.in_progress || 0 },
    { name: '已完成', value: stats?.actionStats?.completed || 0 },
    { name: '已验证', value: stats?.actionStats?.verified || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">QMS 统计看板</h1>
          <p className="mt-2 text-sm text-gray-700">质量管理系统数据概览</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">质量检查总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.inspectionStats?.total || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">质量问题总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.issueStats?.total || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">纠正措施总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.actionStats?.total || 0}</dd>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Inspection Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">质量检查状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={inspectionPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                {inspectionPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Issue Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">质量问题状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={issueBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">纠正措施状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={actionBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default QmsDashboard;
