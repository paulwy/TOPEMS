import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, FlaskConical, CheckCircle, Rocket } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import { rsApi } from '@/api/rs';
import { logger } from '@/utils/logger';
import type { RsStatistics } from '@/api/rs';
import { RS_PATHS } from '@/modules/rs/config';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FlaskConical: <FlaskConical size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  Rocket: <Rocket size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RsStatistics | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await rsApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401) {
        logger.warn('RS 服务需要认证，请先登录');
      } else if (status === 503) {
        logger.warn('RS 服务暂不可用，显示示例数据');
      } else {
        logger.error('加载仪表盘数据失败:', error);
      }
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const statsCards: StatCard[] = useMemo(
    () => [
      {
        id: 'research-projects',
        title: '研发项目',
        value: (stats?.total_projects || 8).toString(),
        icon: iconMap.FlaskConical,
        change: 1,
        changeLabel: 'vs 上周期',
        color: 'primary',
      },
      {
        id: 'document-count',
        title: '文档数量',
        value: (stats?.total_formulas || 256).toString(),
        icon: iconMap.FileText,
        change: 24,
        changeLabel: 'vs 上周期',
        color: 'info',
      },
      {
        id: 'test-cases',
        title: '测试用例',
        value: (stats?.total_tasks || 1234).toString(),
        icon: iconMap.CheckCircle,
        change: 156,
        changeLabel: 'vs 上周期',
        color: 'success',
      },
      {
        id: 'version-releases',
        title: '版本发布',
        value: (stats?.total_experiments || 5).toString(),
        icon: iconMap.Rocket,
        change: 2,
        changeLabel: 'vs 上周期',
        color: 'warning',
      },
    ],
    [stats]
  );

  const barData = [
    { name: 'API', value: 95 },
    { name: 'Web', value: 88 },
    { name: 'Mobile', value: 72 },
    { name: 'Desktop', value: 80 },
    { name: 'IoT', value: 65 },
  ];

  const lineData = [
    { name: 'Jan', value: 10 },
    { name: 'Feb', value: 15 },
    { name: 'Mar', value: 12 },
    { name: 'Apr', value: 18 },
    { name: 'May', value: 20 },
    { name: 'Jun', value: 16 },
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
      onClick: () => navigate(RS_PATHS.projectCreate),
    },
    {
      id: 'write-test-case',
      label: '编写测试用例',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RS_PATHS.test),
    },
    {
      id: 'release-new-version',
      label: '发布新版本',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RS_PATHS.deploy),
    },
  ];

  return (
    <PageContainer
      title='研发管理'
      subtitle={`${getGreeting()}，研发项目与文档管理`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={statsCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
