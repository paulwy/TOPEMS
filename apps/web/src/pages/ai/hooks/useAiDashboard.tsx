import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  MessageSquare,
  FileText,
  Code,
  Zap,
  Clock,
  Sparkles,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';

export interface StatCardData {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick?: () => void;
}

export interface QuickActionData {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick: () => void;
  description?: string;
}

export interface RecentItemData {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  type: 'chat' | 'code' | 'document' | 'summary';
  onClick: () => void;
}

export interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats?: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}

export const useAiDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const stats: StatCardData[] = useMemo(
    () => [
      {
        id: 'chat-count',
        title: t('ai.dashboard.stat.chat_count'),
        value: '1,256',
        icon: <MessageSquare size={22} />,
        change: 23,
        changeLabel: t('ai.dashboard.stat.vs_last_month'),
        color: 'primary',
        onClick: () => navigate(AI_PATHS.chat),
      },
      {
        id: 'doc-analysis',
        title: t('ai.dashboard.stat.doc_analysis'),
        value: '89',
        icon: <FileText size={22} />,
        change: 15,
        changeLabel: t('ai.dashboard.stat.vs_last_month'),
        color: 'info',
        onClick: () => navigate(AI_PATHS.document),
      },
      {
        id: 'code-gen',
        title: t('ai.dashboard.stat.code_gen'),
        value: '456',
        icon: <Code size={22} />,
        change: 45,
        changeLabel: t('ai.dashboard.stat.vs_last_month'),
        color: 'success',
        onClick: () => navigate(AI_PATHS.code),
      },
      {
        id: 'token-usage',
        title: t('ai.dashboard.stat.token_usage'),
        value: '12.5M',
        icon: <Zap size={22} />,
        change: 8,
        changeLabel: t('ai.dashboard.stat.vs_last_month'),
        color: 'warning',
      },
      {
        id: 'avg-response',
        title: t('ai.dashboard.stat.avg_response'),
        value: '1.2s',
        icon: <Clock size={22} />,
        change: -0.3,
        changeLabel: t('ai.dashboard.stat.seconds_down'),
        color: 'secondary',
      },
      {
        id: 'satisfaction',
        title: t('ai.dashboard.stat.satisfaction'),
        value: '96.5%',
        icon: <Sparkles size={22} />,
        change: 2.1,
        changeLabel: t('ai.dashboard.stat.improvement'),
        color: 'success',
      },
    ],
    [navigate, t]
  );

  const quickActions: QuickActionData[] = useMemo(
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

  const recentItems: RecentItemData[] = useMemo(
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

  const features: FeatureCardData[] = useMemo(
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

  const usageData = [120, 150, 130, 180, 160, 200, 190];

  return {
    loading,
    isMobile,
    stats,
    quickActions,
    recentItems,
    features,
    usageData,
    handleRefresh,
  };
};
