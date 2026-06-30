/**
 * AI 智能助手仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/ai
 * @path /ai/dashboard
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Code,
  BarChart3,
  Clock,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useAppStore } from '../../store';

export const AiDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'chat-count',
        title: '对话次数',
        value: '1,256',
        icon: <MessageSquare size={20} />,
        change: 23,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'doc-analysis',
        title: '文档分析',
        value: '89',
        icon: <FileText size={20} />,
        change: 15,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'code-gen',
        title: '代码生成',
        value: '456',
        icon: <Code size={20} />,
        change: 45,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'token-usage',
        title: 'Token消耗',
        value: '12.5M',
        icon: <Zap size={20} />,
        change: 8,
        changeLabel: '较上月',
        color: 'warning',
      },
      {
        id: 'avg-response',
        title: '平均响应',
        value: '1.2s',
        icon: <Clock size={20} />,
        change: -0.3,
        changeLabel: '秒下降',
        color: 'secondary',
      },
      {
        id: 'satisfaction',
        title: '用户满意度',
        value: '96.5%',
        icon: <Sparkles size={20} />,
        change: 2.1,
        changeLabel: '%提升',
        color: 'success',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      { id: 'usage-trend', title: '使用趋势', chart: null, type: 'line' },
      { id: 'feature-dist', title: '功能分布', chart: null, type: 'pie' },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'start-chat',
        label: '开始对话',
        icon: <MessageSquare size={20} />,
        color: 'primary',
        onClick: () => navigate('/ai/chat'),
      },
      {
        id: 'doc-analysis',
        label: '文档分析',
        icon: <FileText size={20} />,
        color: 'info',
        onClick: () => navigate('/ai/document'),
      },
      {
        id: 'code-assistant',
        label: '代码助手',
        icon: <Code size={20} />,
        color: 'success',
        onClick: () => navigate('/ai/code'),
      },
      {
        id: 'knowledge-base',
        label: '知识库',
        icon: <BookOpen size={20} />,
        color: 'warning',
        onClick: () => navigate('/ai/knowledge'),
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: '1',
        title: '智能问答 - 系统架构',
        description: '10分钟前 · 对话',
        status: 'success',
        onClick: () => navigate('/ai/chat'),
      },
      {
        id: '2',
        title: '代码生成 - React组件',
        description: '30分钟前 · 代码',
        status: 'success',
        onClick: () => navigate('/ai/code'),
      },
      {
        id: '3',
        title: '文档分析 - API文档',
        description: '1小时前 · 分析',
        status: 'success',
        onClick: () => navigate('/ai/document'),
      },
      {
        id: '4',
        title: '数据解读 - 销售报表',
        description: '2小时前 · 对话',
        status: 'success',
        onClick: () => navigate('/ai/chat'),
      },
      {
        id: '5',
        title: '代码审查 - 建议优化',
        description: '3小时前 · 代码',
        status: 'success',
        onClick: () => navigate('/ai/code'),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer headerProps={{ pageIcon: <Sparkles size={20} /> }}>
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle='最近使用'
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            addNotification({ title: '刷新成功', message: '数据已更新', type: 'success' });
          }, 500);
        }}
      />
    </PageContainer>
  );
};

const PieChart = (props: { size?: number }) => <BarChart3 {...props} />;

export default AiDashboardPage;
