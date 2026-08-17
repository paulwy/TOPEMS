import React, { useEffect } from 'react';
import { Box, Typography, Paper, Switch, Chip, Divider, useTheme } from '@mui/material';
import { Bell } from 'lucide-react';
import { MobileLayout, MobileSkeleton } from '@/components/mobile';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { mobileApi, type PushConfig, type PushTemplate, type ListResponse } from '@/api/mobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const defaultPushConfig: PushConfig = {
  enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};
const PushNotificationPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const configQuery = useQuery<PushConfig>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_PUSH_CONFIG_BASE,
    queryFn: async () => {
      const res = await mobileApi.getPushConfig();
      if (res.success && res.data) return res.data;
      return defaultPushConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
  const config = configQuery.data ?? defaultPushConfig;
  const templatesQuery = useQuery<PushTemplate[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_PUSH_TEMPLATES_BASE,
    queryFn: async () => {
      const res = await mobileApi.listPushTemplates();
      if (res.success && res.data) return res.data.items || [];
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const templates = templatesQuery.data ?? [];
  const loading = configQuery.isLoading || templatesQuery.isLoading;
  useEffect(() => {
    if (configQuery.isError) {
      logger.error(i18n.t('pages.push_notification_page.k0'), configQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('mobile.push_notification_page.k1'),
        message: i18n.t('mobile.push_notification_page.k0'),
      });
    }
  }, [configQuery.isError, configQuery.error, addNotification]);
  useEffect(() => {
    if (templatesQuery.isError) {
      logger.error(i18n.t('pages.push_notification_page.k1'), templatesQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('mobile.push_notification_page.k3'),
        message: i18n.t('mobile.push_notification_page.k2'),
      });
    }
  }, [templatesQuery.isError, templatesQuery.error, addNotification]);
  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<PushConfig>) => mobileApi.updatePushConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_PUSH_CONFIG_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      logger.error(i18n.t('pages.push_notification_page.k2'), err);
      addNotification({
        type: 'error',
        title: i18n.t('mobile.push_notification_page.k5'),
        message: i18n.t('mobile.push_notification_page.k4'),
      });
    },
  });
  const handleToggleConfig = (key: keyof PushConfig) => {
    updateConfigMutation.mutate({ [key]: !config[key] } as Partial<PushConfig>);
  };
  const updateTemplateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<PushTemplate> }) =>
      mobileApi.updatePushTemplate(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_PUSH_TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      logger.error(i18n.t('pages.push_notification_page.k3'), err);
      addNotification({
        type: 'error',
        title: i18n.t('mobile.push_notification_page.k7'),
        message: i18n.t('mobile.push_notification_page.k6'),
      });
    },
  });
  const handleToggleTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    updateTemplateMutation.mutate({ id, data: { enabled: !template.enabled } });
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval':
        return 'warning';
      case 'task':
        return 'primary';
      case 'system':
        return 'info';
      case 'reminder':
        return 'error';
      default:
        return 'default';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return i18n.t('mobile.push_notification_page.k8');
      case 'draft':
        return i18n.t('mobile.push_notification_page.k9');
      case 'disabled':
        return i18n.t('mobile.push_notification_page.k10');
      default:
        return status;
    }
  };
  if (loading) {
    return (
      <MobileLayout
        title={i18n.t('mobile.push_notification_page.k11')}
        showBack
        onBackClick={() => navigate(-1)}
      >
        <PageContainer
          autoTitle={false}
          autoBreadcrumbs={false}
          padding={false}
          maxWidth={false}
        >
          <Box sx={{ p: 2 }}>
            <MobileSkeleton
              type='list'
              count={4}
            />
          </Box>
        </PageContainer>
      </MobileLayout>
    );
  }
  return (
    <MobileLayout
      title={i18n.t('mobile.push_notification_page.k12')}
      showBack
      onBackClick={() => navigate(-1)}
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
      >
        <Box sx={{ p: 2, pb: 3 }}>
          {/* 推送开关 */}
          <Paper
            elevation={0}
            sx={{ p: 2, borderRadius: 3, mb: 3, border: 1, borderColor: 'divider' }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Bell style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('pages.push_notification_page.k0')}
                </Typography>
              </Box>
              <Switch
                checked={config.enabled}
                onChange={() => handleToggleConfig('enabled')}
              />
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>
                  {i18n.t('mobile.push_notification_page.k13')}
                </Typography>
                <Switch
                  checked={config.sound_enabled}
                  onChange={() => handleToggleConfig('sound_enabled')}
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>
                  {i18n.t('mobile.push_notification_page.k14')}
                </Typography>
                <Switch
                  checked={config.vibration_enabled}
                  onChange={() => handleToggleConfig('vibration_enabled')}
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>
                  {i18n.t('pages.push_notification_page.k0')} {config.quiet_hours_start} -{' '}
                  {config.quiet_hours_end}
                </Typography>
              </Box>
            </Box>
          </Paper>
          {/* 推送模板列表 */}
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.push_notification_page.k1')}
              </Typography>
              <Chip
                label={`${templates.filter((t) => t.enabled).length}/${templates.length}`}
                size='small'
              />
            </Box>
            {templates.map((template, index) => (
              <Box key={template.id}>
                {index > 0 && <Divider />}
                <Box sx={{ px: 2, py: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {template.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(template.status)}
                        size='small'
                        color={template.status === 'active' ? 'success' : 'default'}
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Switch
                      checked={template.enabled}
                      onChange={() => handleToggleTemplate(template.id)}
                      size='small'
                    />
                  </Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    [i18n.t('pages.push_notification_page.k2')]: {template.title}
                  </Typography>
                  <br />
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    [i18n.t('pages.push_notification_page.k3')]: {template.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      </PageContainer>
    </MobileLayout>
  );
};
export default PushNotificationPage;
