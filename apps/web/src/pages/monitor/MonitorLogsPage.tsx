/**
 * 系统日志页面
 *
 * @module pages/monitor
 * @path /monitor/logs
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  FileText,
  Download,
  AlertTriangle,
  AlertCircle,
  Activity,
  Zap,
  Copy,
  Link as LinkIcon,
  List,
  Radio,
} from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '../../store';
import { extractErrorMessage } from '@/utils/errors';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { logSchema } from '@/schemas/monitor/logs';
import { useTranslation } from 'react-i18next';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogType = 'access' | 'error' | 'application' | 'slow_query';
type LogTab = 'all' | 'error' | 'access' | 'application' | 'slow_query';

interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  trace_id: string;
  duration_ms?: number;
  type: LogType;
  metadata?: Record<string, unknown>;
}

const MOCK_LOGS: SystemLog[] = [];

const MonitorLogsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<LogTab>('all');
  const [viewMode, setViewMode] = useState<'table' | 'stream'>('table');

  const logAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const filtered = MOCK_LOGS.filter((log) => {
          const tab = params?.activeTab as LogTab | undefined;
          if (tab && tab !== 'all') {
            if (tab === 'error' && log.level !== 'error') return false;
            if (tab === 'access' && log.type !== 'access') return false;
            if (tab === 'application' && log.type !== 'application') return false;
            if (tab === 'slow_query' && log.type !== 'slow_query') return false;
          }
          return true;
        });

        const level = params?.level as string | undefined;
        if (level && level !== 'all') {
          return {
            data: filtered.filter((l) => l.level === level) as unknown as Record<string, unknown>[],
            total: filtered.length,
          };
        }

        return { data: filtered as unknown as Record<string, unknown>[], total: filtered.length };
      },
      create: async () => {
        throw new Error(t('monitor.logs.message.readonly_create'));
      },
      update: async () => {
        throw new Error(t('monitor.logs.message.readonly_update'));
      },
      delete: async () => {
        addNotification({
          title: t('monitor.logs.message.delete_success_title'),
          message: t('monitor.logs.message.delete_success_body'),
          type: 'success',
        });
      },
    }),
    [addNotification, t]
  );

  const handleCopy = useCallback(
    (text: string, label: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          addNotification({
            title: t('monitor.logs.message.copy_success_title'),
            message: t('monitor.logs.message.copy_success_body', { label }),
            type: 'success',
          });
        })
        .catch(() => {
          addNotification({
            title: t('monitor.logs.message.copy_fail_title'),
            message: t('monitor.logs.message.copy_fail_body'),
            type: 'error',
          });
        });
    },
    [addNotification, t]
  );

  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(MOCK_LOGS, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: t('monitor.logs.message.export_success_title'),
        message: t('monitor.logs.message.export_success_body'),
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: t('monitor.logs.message.export_fail_title'),
        message: extractErrorMessage(_err, t('monitor.common.message.export_fail')),
        type: 'error',
      });
    }
  }, [addNotification, t]);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: t('monitor.logs.action.copy_log'),
        icon: <Copy size={16} />,
        onClick: (row: Record<string, unknown>) => {
          handleCopy(row.message as string, t('monitor.logs.action.copy_log'));
        },
      },
      {
        label: t('monitor.logs.action.link_log'),
        icon: <LinkIcon size={16} />,
        onClick: (_row: Record<string, unknown>) => {
          addNotification({
            type: 'info',
            message: t('monitor.logs.message.link_filtered'),
          });
        },
      },
    ],
    [handleCopy, addNotification, t]
  );

  const statsContent = useCallback(
    (_rows: Record<string, unknown>[], _total: number) => {
      const todayLogs = MOCK_LOGS.filter((l) => {
        const logDate = new Date(l.timestamp).toDateString();
        const today = new Date().toDateString();
        return logDate === today;
      });
      const errorCount = MOCK_LOGS.filter((l) => l.level === 'error').length;
      const warnCount = MOCK_LOGS.filter((l) => l.level === 'warn').length;
      const slowQueryCount = MOCK_LOGS.filter((l) => l.type === 'slow_query').length;

      const stats = [
        {
          id: 'today',
          title: t('monitor.logs.stat.today'),
          value: todayLogs.length,
          icon: <FileText size={20} />,
          color: 'primary' as const,
        },
        {
          id: 'error',
          title: t('monitor.logs.stat.error'),
          value: errorCount,
          icon: <AlertCircle size={20} />,
          color: 'error' as const,
        },
        {
          id: 'warn',
          title: t('monitor.logs.stat.warn'),
          value: warnCount,
          icon: <AlertTriangle size={20} />,
          color: 'warning' as const,
        },
        {
          id: 'slow',
          title: t('monitor.logs.stat.slow_query'),
          value: slowQueryCount,
          icon: <Zap size={20} />,
          color: 'secondary' as const,
        },
      ];

      return (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue: LogTab) => setActiveTab(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    minHeight: 40,
                  },
                }}
              >
                <Tab
                  label={t('monitor.logs.tab.all')}
                  value='all'
                />
                <Tab
                  label={t('monitor.logs.tab.error')}
                  value='error'
                  icon={<AlertCircle size={14} />}
                  iconPosition='start'
                />
                <Tab
                  label={t('monitor.logs.tab.access')}
                  value='access'
                  icon={<Activity size={14} />}
                  iconPosition='start'
                />
                <Tab
                  label={t('monitor.logs.tab.application')}
                  value='application'
                  icon={<FileText size={14} />}
                  iconPosition='start'
                />
                <Tab
                  label={t('monitor.logs.tab.slow_query')}
                  value='slow_query'
                  icon={<Zap size={14} />}
                  iconPosition='start'
                />
              </Tabs>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size='small'
              >
                <ToggleButton
                  value='table'
                  title={t('monitor.logs.view.table')}
                >
                  <List size={16} />
                </ToggleButton>
                <ToggleButton
                  value='stream'
                  title={t('monitor.logs.view.stream')}
                >
                  <Radio size={16} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
              }}
            >
              {stats.map((stat) => (
                <Card
                  key={stat.id}
                  sx={{ bgcolor: `${stat.color}.light` }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: `${stat.color}.lighter`,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {React.cloneElement(
                          stat.icon as React.ReactElement,
                          {
                            style: { color: 'currentColor' },
                          } as Record<string, unknown>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ fontSize: '0.875rem' }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography
                          variant='h5'
                          sx={{ fontWeight: 700 }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </>
      );
    },
    [activeTab, viewMode, t]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
        children: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={t('monitor.logs.tooltip.export')}>
              <IconButton
                size='small'
                onClick={handleExport}
                aria-label='下载'
              >
                <Download size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }}
    >
      <CrudPage
        schema={logSchema}
        apiAdapter={logAdapter}
        extraQueryParams={{ activeTab }}
        customRowActions={customRowActions}
        headerContent={statsContent}
        detailMaxWidth='lg'
      />
    </PageContainer>
  );
};

export default MonitorLogsPage;
