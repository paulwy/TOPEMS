import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Stack, useTheme } from '@mui/material';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  FileText,
  Play,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import i18n from '@/i18n';
import { useParams } from 'react-router-dom';
import type { WorkflowInstance, Approval, ApprovalRecord } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';
import type { TabConfig } from '@/components/templates/DetailPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { getChipStatusColor as getStatusColor } from '@/utils/status';

const ct = designTokens.colors;
interface InstanceDetails {
  instance: WorkflowInstance;
  approvals: Approval[];
  records: ApprovalRecord[];
}
const FlowInstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const theme = useTheme();
  const detailsQuery = useQuery<InstanceDetails | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_INSTANCE_DETAILS_BASE, id],
    queryFn: async (): Promise<InstanceDetails | null> => {
      if (!id) return null;
      const response = await workflowApi.getInstanceDetails(id);
      if (response.success && response.data) {
        return response.data as unknown as InstanceDetails;
      }
      return null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  const details = detailsQuery.data ?? null;
  const loading = detailsQuery.isLoading;
  const error = detailsQuery.isError
    ? i18n.t('workflow.workflow_instance_detail_page.k0')
    : undefined;
  useEffect(() => {
    if (detailsQuery.isError) {
      apiLogger.error(i18n.t('pages.workflow_instance_detail_page.k0'), detailsQuery.error);
      addNotification({
        title: i18n.t('workflow.workflow_instance_detail_page.k1'),
        message: i18n.t('workflow.workflow_instance_detail_page.k2'),
        type: 'error',
      });
    }
  }, [detailsQuery.isError, detailsQuery.error, addNotification]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return (
          <CheckCircle
            size={20}
            style={{ color: ct.success[600] }}
          />
        );
      case 'rejected':
        return (
          <XCircle
            size={20}
            style={{ color: ct.error[600] }}
          />
        );
      case 'running':
        return (
          <Play
            size={20}
            style={{ color: ct.primary[800] }}
          />
        );
      case 'pending':
        return (
          <Clock
            size={20}
            style={{ color: ct.warning[600] }}
          />
        );
      default:
        return (
          <AlertCircle
            size={20}
            style={{ color: ct.grey[500] }}
          />
        );
    }
  };
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: i18n.t('workflow.workflow_instance_detail_page.k3'),
      rejected: i18n.t('workflow.workflow_instance_detail_page.k4'),
      running: i18n.t('workflow.workflow_instance_detail_page.k5'),
      pending: i18n.t('workflow.workflow_instance_detail_page.k6'),
      approved: i18n.t('workflow.workflow_instance_detail_page.k7'),
    };
    return statusMap[status] || status;
  };
  const tabs = useMemo<TabConfig[]>(() => {
    if (!details) return [];
    const { instance, approvals, records } = details;
    return [
      {
        id: 'info',
        label: i18n.t('workflow.workflow_instance_detail_page.k8'),
        content: (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.id_0')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {instance.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.id_1')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {instance.workflow_id || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.k2')}
                </Typography>
                <Typography variant='body2'>{instance.currentnode || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.k3')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <User size={14} />
                  <Typography variant='body2'>
                    {instance.initiator_id || i18n.t('workflow.workflow_instance_detail_page.k9')}
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.k4')}
                </Typography>
                <Typography variant='body2'>
                  {new Date(instance.created_at).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.k5')}
                </Typography>
                <Typography variant='body2'>
                  {instance.started_at ? new Date(instance.started_at).toLocaleString() : 'N/A'}
                </Typography>
              </Box>
              {instance.completed_at && (
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500', mb: 0.5 }}
                  >
                    {i18n.t('pages.workflow_instance_detail_page.k6')}
                  </Typography>
                  <Typography variant='body2'>
                    {new Date(instance.completed_at).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
            {instance.data && Object.keys(instance.data).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 1 }}
                >
                  {i18n.t('pages.workflow_instance_detail_page.k7')}
                </Typography>
                <Box
                  component='pre'
                  sx={{
                    bgcolor: 'grey.50',
                    p: 1.5,
                    borderRadius: 1,
                    fontSize: 12,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(instance.data, null, 2)}
                </Box>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'steps',
        label: i18n.t('workflow.workflow_instance_detail_page.k10'),
        badge: approvals.length,
        content: (
          <Box>
            {approvals.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Users
                  size={48}
                  style={{
                    color: theme.palette.grey[300],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>
                  {i18n.t('workflow.workflow_instance_detail_page.k11')}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {approvals.map((approval, index) => (
                  <Box
                    key={approval.id}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
                  >
                    <Stack
                      direction='row'
                      sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                      spacing={2}
                    >
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ alignItems: 'center' }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: 'primary.light',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography
                            variant='caption'
                            sx={{ fontWeight: 700, color: 'primary.main' }}
                          >
                            {index + 1}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 500 }}>{approval.task_name}</Typography>
                          {approval.node_id && (
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {i18n.t('pages.workflow_instance_detail_page.k8')}: {approval.node_id}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      <Chip
                        icon={getStatusIcon(approval.status)}
                        label={getStatusText(approval.status)}
                        color={getStatusColor(approval.status)}
                        size='small'
                      />
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={2}
                      sx={{ ml: 4, mt: 1 }}
                    >
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ alignItems: 'center' }}
                      >
                        <User size={12} />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('pages.workflow_instance_detail_page.k9')}:{' '}
                          {approval.assignee_id || 'N/A'}
                        </Typography>
                      </Stack>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ alignItems: 'center' }}
                      >
                        <Clock size={12} />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('pages.workflow_instance_detail_page.k10')}:{' '}
                          {new Date(approval.created_at).toLocaleString()}
                        </Typography>
                      </Stack>
                      {approval.approved_at && (
                        <Stack
                          direction='row'
                          spacing={0.5}
                          sx={{ alignItems: 'center' }}
                        >
                          <CheckCircle size={12} />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('pages.workflow_instance_detail_page.k11')}:{' '}
                            {new Date(approval.approved_at).toLocaleString()}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                    {approval.comment && (
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ ml: 4, mt: 1, alignItems: 'flex-start' }}
                      >
                        <MessageSquare
                          size={16}
                          style={{ color: theme.palette.text.secondary, marginTop: 2 }}
                        />
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {approval.comment}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ),
      },
      {
        id: 'records',
        label: i18n.t('workflow.workflow_instance_detail_page.k12'),
        badge: records.length,
        content: (
          <Box>
            {records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FileText
                  size={48}
                  style={{
                    color: theme.palette.grey[300],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>
                  {i18n.t('workflow.workflow_instance_detail_page.k13')}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {records.map((record) => (
                  <Box
                    key={record.id}
                    sx={{ borderLeft: 2, borderColor: 'grey.300', pl: 2 }}
                  >
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      {record.action === 'approve' ? (
                        <CheckCircle2
                          size={16}
                          style={{ color: ct.success[600] }}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          style={{ color: ct.error[600] }}
                        />
                      )}
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {record.action === 'approve'
                          ? i18n.t('workflow.workflow_instance_detail_page.k15')
                          : i18n.t('workflow.workflow_instance_detail_page.k14')}
                      </Typography>
                    </Stack>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ display: 'block' }}
                    >
                      {record.actor_name || record.actor_id}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ display: 'block' }}
                    >
                      {new Date(record.created_at).toLocaleString()}
                    </Typography>
                    {record.comment && (
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}
                      >
                        "{record.comment}"
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ),
      },
    ];
  }, [details, theme.palette.grey, theme.palette.text.secondary]);
  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <DetailPageTemplate
        title={i18n.t('workflow.workflow_instance_detail_page.k16')}
        subtitle={details?.instance.id}
        detailItemName={
          details?.instance?.name ||
          details?.instance?.id ||
          i18n.t('workflow.workflow_instance_detail_page.k17')
        }
        loading={loading}
        error={error}
        backHref={WORKFLOW_PATHS.instances}
        tabs={tabs}
        infoCard={
          details?.instance
            ? {
                title: `${i18n.t('pages.workflow_instance_detail_page.k1')}${details.instance.id.substring(0, 8)}...`,
                subtitle: getStatusText(details.instance.status),
                tags: [getStatusText(details.instance.status)],
              }
            : undefined
        }
      />
    </PageContainer>
  );
};
export default FlowInstanceDetailPage;
