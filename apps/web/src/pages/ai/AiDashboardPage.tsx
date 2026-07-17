/**
 * AI 智能助手仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/ai
 * @path /ai/dashboard
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Code,
  BarChart3,
  Clock,
  Zap,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Target,
  Users,
  RefreshCw,
  ArrowRight,
  Activity,
  CircleDot,
} from 'lucide-react';
import { Box, Typography, Button, Paper, Chip, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';

interface StatCardProps {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick?: () => void;
}

interface QuickActionProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick: () => void;
  description?: string;
}

interface RecentItemProps {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  type: 'chat' | 'code' | 'document' | 'summary';
  onClick: () => void;
}

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats?: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  color,
  onClick,
}) => {
  const theme = useTheme();
  const isPositive = change >= 0;

  const colorMap = {
    primary: { bg: 'primary.light', text: 'primary.main', border: 'primary.main' },
    info: { bg: 'info.light', text: 'info.main', border: 'info.main' },
    success: { bg: 'success.light', text: 'success.main', border: 'success.main' },
    warning: { bg: 'warning.light', text: 'warning.main', border: 'warning.main' },
    secondary: { bg: 'secondary.light', text: 'secondary.main', border: 'secondary.main' },
  };

  const colors = colorMap[color];

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick ? { boxShadow: 2, borderColor: colors.border } : {},
        border: 1,
        borderColor: 'divider',
      }}
      onClick={onClick}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text,
          }}
        >
          {icon}
        </Box>
        <Chip
          label={`${isPositive ? '+' : ''}${change}%`}
          size='small'
          color={isPositive ? 'success' : 'error'}
          sx={{ fontSize: 11 }}
        />
      </Box>
      <Typography
        variant='h4'
        sx={{ fontWeight: 700, mb: 0.5 }}
      >
        {value}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {title}
      </Typography>
      <Typography
        variant='caption'
        color='text.disabled'
        sx={{ mt: 0.5, display: 'block' }}
      >
        {changeLabel}
      </Typography>
    </Paper>
  );
};

const QuickAction: React.FC<QuickActionProps> = ({ label, icon, color, onClick, description }) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    secondary: theme.palette.secondary.main,
  };

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: colorMap[color],
          backgroundColor: 'action.hover',
        },
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: `${color}.light`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          color: colorMap[color],
        }}
      >
        {icon}
      </Box>
      <Typography
        variant='body1'
        sx={{ fontWeight: 600 }}
      >
        {label}
      </Typography>
      {description && (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mt: 1, display: 'block' }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};

const RecentItem: React.FC<RecentItemProps> = ({ title, description, status, type, onClick }) => {
  const theme = useTheme();

  const typeIcons = {
    chat: <MessageSquare size={16} />,
    code: <Code size={16} />,
    document: <FileText size={16} />,
    summary: <Lightbulb size={16} />,
  };

  const statusColors = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.main',
        },
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          bgcolor: 'primary.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.main',
        }}
      >
        {typeIcons[type]}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          {title}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {description}
        </Typography>
      </Box>
      <CircleDot
        style={{ width: 12, height: 12, color: statusColors[status] }}
      />
    </Box>
  );
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  color,
  stats,
  action,
}) => {
  return (
    <Paper
      sx={{
        p: 4,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon as React.ReactElement<{ size?: number; style?: React.CSSProperties }>, {
            size: 28,
            style: { color },
          })}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {title}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {description}
          </Typography>
          {stats && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {stats.map((stat) => (
                <Chip
                  key={stat.label}
                  label={`${stat.label}: ${stat.value}`}
                  size='small'
                  variant='outlined'
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Box>
          )}
          {action && (
            <Button
              size='small'
              variant='outlined'
              endIcon={<ArrowRight size={16} />}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  });

  return (
    <svg
      width='100%'
      height='40'
      viewBox='0 0 100 40'
    >
      <defs>
        <linearGradient
          id={`gradient-${color}`}
          x1='0%'
          y1='0%'
          x2='0%'
          y2='100%'
        >
          <stop
            offset='0%'
            stopColor={color}
            stopOpacity='0.3'
          />
          <stop
            offset='100%'
            stopColor={color}
            stopOpacity='0'
          />
        </linearGradient>
      </defs>
      <path
        d={`M ${points.join(' L ')} L 100,40 L 0,40 Z`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points.join(' ')}
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {data.map((_, index) => {
        const point = points[index].split(',');
        return (
          <circle
            key={index}
            cx={point[0]}
            cy={point[1]}
            r='3'
            fill='white'
            stroke={color}
            strokeWidth='2'
          />
        );
      })}
    </svg>
  );
};

export const AiDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const stats: StatCardProps[] = useMemo(
    () => [
      {
        id: 'chat-count',
        title: '对话次数',
        value: '1,256',
        icon: <MessageSquare size={22} />,
        change: 23,
        changeLabel: '较上月',
        color: 'primary',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: 'doc-analysis',
        title: '文档分析',
        value: '89',
        icon: <FileText size={22} />,
        change: 15,
        changeLabel: '较上月',
        color: 'info',
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: 'code-gen',
        title: '代码生成',
        value: '456',
        icon: <Code size={22} />,
        change: 45,
        changeLabel: '较上月',
        color: 'success',
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: 'token-usage',
        title: 'Token消耗',
        value: '12.5M',
        icon: <Zap size={22} />,
        change: 8,
        changeLabel: '较上月',
        color: 'warning',
      },
      {
        id: 'avg-response',
        title: '平均响应',
        value: '1.2s',
        icon: <Clock size={22} />,
        change: -0.3,
        changeLabel: '秒下降',
        color: 'secondary',
      },
      {
        id: 'satisfaction',
        title: '用户满意度',
        value: '96.5%',
        icon: <Sparkles size={22} />,
        change: 2.1,
        changeLabel: '%提升',
        color: 'success',
      },
    ],
    [navigate]
  );

  const quickActions: QuickActionProps[] = useMemo(
    () => [
      {
        id: 'start-chat',
        label: '智能对话',
        icon: <MessageSquare size={28} />,
        color: 'primary',
        description: '与AI进行智能问答',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: 'doc-analysis',
        label: '文档分析',
        icon: <FileText size={28} />,
        color: 'info',
        description: '上传文档进行摘要分析',
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: 'code-assistant',
        label: '代码助手',
        icon: <Code size={28} />,
        color: 'success',
        description: '生成和优化代码',
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: 'knowledge-base',
        label: '知识库',
        icon: <BookOpen size={28} />,
        color: 'warning',
        description: '管理和查询知识库',
        onClick: () => navigate(AI_PATHS.knowledge),
      },
    ],
    [navigate]
  );

  const recentItems: RecentItemProps[] = useMemo(
    () => [
      {
        id: '1',
        title: '系统架构优化建议',
        description: '10分钟前 · 智能问答',
        status: 'success',
        type: 'chat',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: '2',
        title: 'React表单组件生成',
        description: '30分钟前 · 代码助手',
        status: 'success',
        type: 'code',
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: '3',
        title: 'API文档摘要分析',
        description: '1小时前 · 文档分析',
        status: 'success',
        type: 'document',
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: '4',
        title: '销售报表数据解读',
        description: '2小时前 · 智能问答',
        status: 'info',
        type: 'chat',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: '5',
        title: '代码审查建议',
        description: '3小时前 · 代码助手',
        status: 'success',
        type: 'code',
        onClick: () => navigate(AI_PATHS.code),
      },
    ],
    [navigate]
  );

  const features: FeatureCardProps[] = useMemo(
    () => [
      {
        id: 'qa-feature',
        title: '智能问答',
        description: '基于AI的智能问答系统，支持自然语言交互，提供专业、准确的问题解答。',
        icon: <Lightbulb />,
        color: theme.palette.primary.main,
        stats: [
          { label: '准确率', value: '92%' },
          { label: '响应时间', value: '<2s' },
        ],
        action: { label: '开始问答', onClick: () => navigate(AI_PATHS.chat) },
      },
      {
        id: 'summary-feature',
        title: '文档摘要',
        description: '自动分析文档内容，生成结构化摘要，提取关键信息，提高阅读效率。',
        icon: <FileText />,
        color: theme.palette.info.main,
        stats: [
          { label: '支持格式', value: '10+' },
          { label: '处理速度', value: '<30s' },
        ],
        action: { label: '上传文档', onClick: () => navigate(AI_PATHS.document) },
      },
      {
        id: 'code-feature',
        title: '代码生成',
        description: '根据需求描述自动生成高质量代码，支持多种编程语言，提高开发效率。',
        icon: <Code />,
        color: theme.palette.success.main,
        stats: [
          { label: '支持语言', value: '20+' },
          { label: '代码质量', value: '优秀' },
        ],
        action: { label: '生成代码', onClick: () => navigate(AI_PATHS.code) },
      },
    ],
    [navigate, theme.palette]
  );

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addNotification({ title: '刷新成功', message: '数据已更新', type: 'success' });
    }, 500);
  }, [addNotification]);

  const usageData = [120, 150, 130, 180, 160, 200, 190];

  return (
    <PageContainer
      title='AI智能助手'
      subtitle='一站式AI辅助功能平台'
      padding={false}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            size='small'
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </Button>
        </Box>
        {/* 欢迎区域 */}
        <Box
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Sparkles size={28} />
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              AI 智能助手
            </Typography>
          </Box>
          <Typography variant='body1'>
            欢迎使用 TOPEMS AI
            智能助手。在这里，您可以享受智能问答、文档分析、代码生成等全方位的AI服务。
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              size='small'
              variant='contained'
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              onClick={() => navigate(AI_PATHS.chat)}
            >
              开始对话
            </Button>
            <Button
              size='small'
              variant='outlined'
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
              onClick={() => navigate(AI_PATHS.prompts)}
            >
              查看提示词库
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 3 }}
          >
            使用统计
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            {stats.map((stat) => (
              <StatCard
                key={stat.id}
                {...stat}
              />
            ))}
          </Box>
        </Box>

        {/* 使用趋势 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 3 }}
          >
            使用趋势
          </Typography>
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                近7天对话次数
              </Typography>
              <Chip
                label='趋势良好'
                color='success'
                size='small'
              />
            </Box>
            <MiniChart
              data={usageData}
              color={theme.palette.primary.main}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day) => (
                <Typography
                  key={day}
                  variant='caption'
                  color='text.secondary'
                >
                  {day}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* 功能特性 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 3 }}
          >
            核心功能
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                {...feature}
              />
            ))}
          </Box>
        </Box>

        {/* 快捷操作和最近使用 */}
        <Box
          sx={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: 'column',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
          }}
        >
          <Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 3 }}
            >
              快捷入口
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '1fr',
                gap: 2,
              }}
            >
              {quickActions.map((action) => (
                <QuickAction
                  key={action.id}
                  {...action}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 3 }}
            >
              最近使用
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentItems.map((item) => (
                <RecentItem
                  key={item.id}
                  {...item}
                />
              ))}
            </Box>
            <Button
              size='small'
              sx={{ mt: 2, color: 'primary.main' }}
              onClick={() => navigate(AI_PATHS.chat)}
            >
              查看更多记录
            </Button>
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default AiDashboardPage;
