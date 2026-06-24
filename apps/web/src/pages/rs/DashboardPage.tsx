import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, FlaskConical, CheckCircle, Rocket } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FlaskConical: <FlaskConical size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  Rocket: <Rocket size={24} />,
};

const barData = [
  { name: 'API', value: 95 },
  { name: 'Web', value: 88 },
  { name: 'Mobile', value: 72 },
  { name: 'Desktop', value: 80 },
  { name: 'IoT', value: 65 },
];
const pieData = [
  { name: '需求文档', value: 30 },
  { name: '设计文档', value: 25 },
  { name: '开发文档', value: 35 },
  { name: '测试文档', value: 10 },
];
const lineData = [
  { name: 'Jan', value: 10 },
  { name: 'Feb', value: 15 },
  { name: 'Mar', value: 12 },
  { name: 'Apr', value: 18 },
  { name: 'May', value: 20 },
  { name: 'Jun', value: 16 },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = [
    {
      id: 'research-projects',
      title: '研发项目',
      value: '8',
      icon: iconMap.FlaskConical,
      change: 1,
      changeLabel: 'vs 上周期',
      color: 'primary',
    },
    {
      id: 'document-count',
      title: '文档数量',
      value: '256',
      icon: iconMap.FileText,
      change: 24,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'test-cases',
      title: '测试用例',
      value: '1,234',
      icon: iconMap.CheckCircle,
      change: 156,
      changeLabel: 'vs 上周期',
      color: 'success',
    },
    {
      id: 'version-releases',
      title: '版本发布',
      value: '5',
      icon: iconMap.Rocket,
      change: 2,
      changeLabel: 'vs 上周期',
      color: 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'project-type-distribution',
      title: '项目类型分布',
      chart: (
        <BarChartComponent
          data={barData}
          xKey='name'
          yKey='value'
        />
      ),
      height: 300,
    },
    {
      id: 'monthly-release-trend',
      title: '月度发布趋势',
      chart: (
        <LineChartComponent
          data={lineData}
          xKey='name'
          yKey='value'
        />
      ),
      height: 300,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'create-research-project',
      label: '创建研发项目',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/rs/projects/create'),
    },
    {
      id: 'upload-document',
      label: '上传文档',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/rs/documents/upload'),
    },
    {
      id: 'write-test-case',
      label: '编写测试用例',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/rs/tests/create'),
    },
    {
      id: 'release-new-version',
      label: '发布新版本',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/rs/releases/new'),
    },
  ];

  return (
    <DashboardTemplate
      title='研发管理'
      subtitle={`${getGreeting()}，研发项目与文档管理`}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
    />
  );
};

export default DashboardPage;
