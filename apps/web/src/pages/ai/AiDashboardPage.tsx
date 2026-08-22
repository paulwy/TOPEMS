/**
 * AI 智能助手仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/ai
 * @path /ai/dashboard
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Code,
  Clock,
  Zap,
  BookOpen,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  CircleDot,
} from 'lucide-react';
import { Box, Typography, Button, Paper, Chip, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { AICopilotRecommendations } from '@/components/ai/copilot';
import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';
import { useAIContext } from '@/hooks';
import { writeAICopilotContext } from '@/lib/ai/copilotContext';
import type { AIRecommendation } from '@/lib/ai/recommendations';
import { aiApi } from '@/api/ai';

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
          sx={{
            fontWeight: 500,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
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
      <CircleDot style={{ width: 12, height: 12, color: statusColors[status] }} />
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
          {React.cloneElement(
            icon as React.ReactElement<{ size?: number; style?: React.CSSProperties }>,
            {
              size: 28,
              style: { color },
            }
          )}
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
            fill='var(--color-primary-foreground)'
            stroke={color}
            strokeWidth='2'
          />
        );
      })}
    </svg>
  );
};

export const AiDashboardPage: React.FC = () => {
  useQuery({
    queryKey: ['ai', 'dashboard'],
    queryFn: async () => {
      try {
        return await aiApi.getDashboardStats();
      } catch {
        return {};
      }
    },
  });
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const { topRecommendations } = useAIContext();

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'chat-count',
        title: t('ai.dashboard.stat.chat_count'),
        value: '1,256',
        icon: <MessageSquare size={22} />,
        color: 'primary',
        onClick: () => navigate(AI_PATHS.chat),
        trend: { value: 23, direction: 'up', label: t('ai.dashboard.stat.vs_last_month') },
      },
      {
        id: 'doc-analysis',
        title: t('ai.dashboard.stat.doc_analysis'),
        value: '89',
        icon: <FileText size={22} />,
        color: 'info',
        onClick: () => navigate(AI_PATHS.document),
        trend: { value: 15, direction: 'up', label: t('ai.dashboard.stat.vs_last_month') },
      },
      {
        id: 'code-gen',
        title: t('ai.dashboard.stat.code_gen'),
        value: '456',
        icon: <Code size={22} />,
        color: 'success',
        onClick: () => navigate(AI_PATHS.code),
        trend: { value: 45, direction: 'up', label: t('ai.dashboard.stat.vs_last_month') },
      },
      {
        id: 'token-usage',
        title: t('ai.dashboard.stat.token_usage'),
        value: '12.5M',
        icon: <Zap size={22} />,
        color: 'warning',
        trend: { value: 8, direction: 'up', label: t('ai.dashboard.stat.vs_last_month') },
      },
      {
        id: 'avg-response',
        title: t('ai.dashboard.stat.avg_response'),
        value: '1.2s',
        icon: <Clock size={22} />,
        color: 'secondary',
        trend: { value: -0.3, direction: 'down', label: t('ai.dashboard.stat.seconds_down') },
      },
      {
        id: 'satisfaction',
        title: t('ai.dashboard.stat.satisfaction'),
        value: '96.5%',
        icon: <Sparkles size={22} />,
        color: 'success',
        onClick: () => navigate(AI_PATHS.chat),
        trend: { value: 2.1, direction: 'up', label: t('ai.dashboard.stat.percent_improvement') },
      },
    ],
    [navigate, t]
  );

  const quickActions: QuickActionProps[] = useMemo(
    () => [
      {
        id: 'start-chat',
        label: t('ai.dashboard.quick_action.chat'),
        icon: <MessageSquare size={28} />,
        color: 'primary',
        description: t('ai.dashboard.quick_action.chat_desc'),
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: 'doc-analysis',
        label: t('ai.dashboard.quick_action.doc_analysis'),
        icon: <FileText size={28} />,
        color: 'info',
        description: t('ai.dashboard.quick_action.doc_analysis_desc'),
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: 'code-assistant',
        label: t('ai.dashboard.quick_action.code_assistant'),
        icon: <Code size={28} />,
        color: 'success',
        description: t('ai.dashboard.quick_action.code_assistant_desc'),
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: 'knowledge-base',
        label: t('ai.dashboard.quick_action.knowledge_base'),
        icon: <BookOpen size={28} />,
        color: 'warning',
        description: t('ai.dashboard.quick_action.knowledge_base_desc'),
        onClick: () => navigate(AI_PATHS.knowledge),
      },
    ],
    [navigate, t]
  );

  const recentItems: RecentItemProps[] = useMemo(
    () => [
      {
        id: '1',
        title: t('ai.dashboard.recent.item_1_title'),
        description: t('ai.dashboard.recent.item_1_desc'),
        status: 'success',
        type: 'chat',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: '2',
        title: t('ai.dashboard.recent.item_2_title'),
        description: t('ai.dashboard.recent.item_2_desc'),
        status: 'success',
        type: 'code',
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: '3',
        title: t('ai.dashboard.recent.item_3_title'),
        description: t('ai.dashboard.recent.item_3_desc'),
        status: 'success',
        type: 'document',
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: '4',
        title: t('ai.dashboard.recent.item_4_title'),
        description: t('ai.dashboard.recent.item_4_desc'),
        status: 'info',
        type: 'chat',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: '5',
        title: t('ai.dashboard.recent.item_5_title'),
        description: t('ai.dashboard.recent.item_5_desc'),
        status: 'success',
        type: 'code',
        onClick: () => navigate(AI_PATHS.code),
      },
    ],
    [navigate, t]
  );

  const features: FeatureCardProps[] = useMemo(
    () => [
      {
        id: 'qa-feature',
        title: t('ai.dashboard.feature.qa_title'),
        description: t('ai.dashboard.feature.qa_desc'),
        icon: <Lightbulb />,
        color: theme.palette.primary.main,
        stats: [
          { label: t('ai.dashboard.feature.stat_accuracy'), value: '92%' },
          { label: t('ai.dashboard.feature.stat_response_time'), value: '<2s' },
        ],
        action: {
          label: t('ai.dashboard.feature.qa_action'),
          onClick: () => navigate(AI_PATHS.chat),
        },
      },
      {
        id: 'summary-feature',
        title: t('ai.dashboard.feature.summary_title'),
        description: t('ai.dashboard.feature.summary_desc'),
        icon: <FileText />,
        color: theme.palette.info.main,
        stats: [
          { label: t('ai.dashboard.feature.stat_support_format'), value: '10+' },
          { label: t('ai.dashboard.feature.stat_process_speed'), value: '<30s' },
        ],
        action: {
          label: t('ai.dashboard.feature.summary_action'),
          onClick: () => navigate(AI_PATHS.document),
        },
      },
      {
        id: 'code-feature',
        title: t('ai.dashboard.feature.code_title'),
        description: t('ai.dashboard.feature.code_desc'),
        icon: <Code />,
        color: theme.palette.success.main,
        stats: [
          { label: t('ai.dashboard.feature.stat_support_language'), value: '20+' },
          {
            label: t('ai.dashboard.feature.stat_code_quality'),
            value: t('ai.dashboard.feature.code_quality_excellent'),
          },
        ],
        action: {
          label: t('ai.dashboard.feature.code_action'),
          onClick: () => navigate(AI_PATHS.code),
        },
      },
    ],
    [navigate, theme.palette, t]
  );

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addNotification({
        title: t('ai.dashboard.message.refresh_success_title'),
        message: t('ai.dashboard.message.refresh_success_body'),
        type: 'success',
      });
    }, 500);
  }, [addNotification, t]);

  const handleRecommendationSelect = useCallback(
    (recommendation: AIRecommendation) => {
      writeAICopilotContext({
        pathname: window.location.pathname,
        source: 'dashboard',
        intent: 'recommendation',
        recommendationId: recommendation.id,
      });
      navigate(recommendation.action);
    },
    [navigate]
  );

  const usageData = [120, 150, 130, 180, 160, 200, 190];

  const refreshToolbar = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <Button
        size='small'
        variant='outlined'
        startIcon={<RefreshCw size={16} />}
        onClick={handleRefresh}
        disabled={loading}
      >
        {loading ? t('ai.dashboard.refreshing') : t('ai.dashboard.refresh')}
      </Button>
    </Box>
  );

  return (
    <StatsPageTemplate
      title={t('ai.dashboard.title')}
      subtitle={t('ai.dashboard.subtitle')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      statColumns={3}
      loading={loading}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      customToolbar={refreshToolbar}
    >
      <Box>
        {/* 欢迎区域 */}
        <Box
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Sparkles size={28} />
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {t('ai.dashboard.hero_title')}
            </Typography>
          </Box>
          <Typography variant='body1'>
            {t('ai.dashboard.hero_welcome')} {t('ai.dashboard.hero_desc')}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              size='small'
              variant='contained'
              sx={{
                bgcolor: 'common.white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
              }}
              onClick={() => navigate(AI_PATHS.chat)}
            >
              {t('ai.dashboard.button.start_chat')}
            </Button>
            <Button
              size='small'
              variant='outlined'
              sx={{
                borderColor: 'common.white',
                color: 'common.white',
                '&:hover': { bgcolor: 'action.disabledBackground' },
              }}
              onClick={() => navigate(AI_PATHS.prompts)}
            >
              {t('ai.dashboard.button.view_prompts')}
            </Button>
          </Box>
        </Box>

        {/* AI 推荐入口 TopN */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {t('pages.ai_dashboard_page.aitopn_0')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('pages.ai_dashboard_page.k1')}
              </Typography>
            </Box>
            <Chip
              label={`Top ${topRecommendations.length}`}
              color='primary'
              size='small'
              variant='outlined'
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <AICopilotRecommendations
              recommendations={topRecommendations}
              onSelect={handleRecommendationSelect}
            />
          </Box>
        </Box>

        {/* 使用趋势 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 3 }}
          >
            {t('ai.dashboard.section.usage_trend')}
          </Typography>
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                {t('ai.dashboard.trend.7_days_chat_count')}
              </Typography>
              <Chip
                label={t('ai.dashboard.trend.good')}
                color='success'
                size='small'
              />
            </Box>
            <MiniChart
              data={usageData}
              color={theme.palette.primary.main}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              {[
                t('ai.dashboard.day.mon'),
                t('ai.dashboard.day.tue'),
                t('ai.dashboard.day.wed'),
                t('ai.dashboard.day.thu'),
                t('ai.dashboard.day.fri'),
                t('ai.dashboard.day.sat'),
                t('ai.dashboard.day.sun'),
              ].map((day) => (
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
            {t('ai.dashboard.section.core_features')}
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
              {t('ai.dashboard.section.quick_entry')}
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
              {t('ai.dashboard.section.recent_used')}
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
              {t('ai.dashboard.button.view_more')}
            </Button>
          </Box>
        </Box>
      </Box>
    </StatsPageTemplate>
  );
};

export default AiDashboardPage;
