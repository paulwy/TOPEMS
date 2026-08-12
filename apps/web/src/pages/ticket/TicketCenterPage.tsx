import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Divider,
  Stack,
  TextField,
  Button,
  Paper,
} from '@mui/material';
import {
  Ticket as TicketIcon,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
import { ticketApi } from '@/api/ticket';
import type {
  Ticket,
  TicketComment,
  TicketSlaInfo,
  CreateTicketRequest,
  UpdateTicketRequest,
} from '@/api/ticket';
import { ticketSchema } from '@/schemas/ticket';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const STATUS_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  open: 'error',
  in_progress: 'warning',
  pending: 'info',
  resolved: 'success',
  closed: 'default',
  cancelled: 'default',
};

const SEVERITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

const ticketApiAdapter: CrudApiAdapter<Ticket> = {
  list: async (params) => {
    const res = await ticketApi.listTickets({
      page: params?.page,
      page_size: params?.pageSize,
      status: (params?.status as string) || undefined,
      ticket_type: (params?.ticket_type as string) || undefined,
      severity: (params?.severity as string) || undefined,
    });
    const data = res.data.data;
    return {
      data: data.items ?? [],
      total: data.total ?? 0,
    };
  },
  create: async (data) => {
    const res = await ticketApi.createTicket(data as unknown as CreateTicketRequest);
    return res.data.data;
  },
  update: async (id, data) => {
    const res = await ticketApi.updateTicket(id, data as unknown as UpdateTicketRequest);
    return res.data.data;
  },
  delete: async () => {
    throw new Error(i18n.t('ticket:errors.deleteNotSupported'));
  },
};

function formatDuration(minutes: number | undefined, t: TFunction): string {
  if (minutes === undefined || minutes === null) return '-';
  if (minutes < 0) {
    const h = Math.abs(Math.floor(minutes / 60));
    const m = Math.abs(minutes % 60);
    return `${t('ticket:duration.overtime')} ${h}${t('ticket:duration.hours')}${m}${t('ticket:duration.minutes')}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0)
    return `${hours}${t('ticket:duration.hours')}${mins}${t('ticket:duration.minutes')}`;
  return `${mins}${t('ticket:duration.minutesOnly')}`;
}

const TicketDetailContent: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const statusLabels: Record<string, string> = {
    open: t('ticket:status.open'),
    in_progress: t('ticket:status.in_progress'),
    pending: t('ticket:status.pending'),
    resolved: t('ticket:status.resolved'),
    closed: t('ticket:status.closed'),
    cancelled: t('ticket:status.cancelled'),
  };

  const severityLabels: Record<string, string> = {
    critical: t('ticket:severity.critical'),
    high: t('ticket:severity.high'),
    medium: t('ticket:severity.medium'),
    low: t('ticket:severity.low'),
  };

  const { data: commentsData } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.TICKET_COMMENTS_BASE, ticket.id],
    queryFn: async () => {
      const res = await ticketApi.getComments(ticket.id);
      return res.data.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: slaInfo } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.TICKET_SLA_BASE, ticket.id],
    queryFn: async () => {
      const res = await ticketApi.getTicketSla(ticket.id);
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      ticketApi.addComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.AD_HOC.TICKET_COMMENTS_BASE, ticket.id] ,
  exact: false,
  refetchType: 'active',
});
      setCommentText('');
    },
  });

  const comments = (commentsData || []) as TicketComment[];
  const sla = slaInfo as TicketSlaInfo | null;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={statusLabels[ticket.status] || ticket.status}
          color={STATUS_COLORS[ticket.status] || 'default'}
          size='small'
        />
        <Chip
          label={severityLabels[ticket.severity] || ticket.severity}
          color={SEVERITY_COLORS[ticket.severity] || 'default'}
          size='small'
        />
        <Chip
          label={`${t('ticket:source')}: ${ticket.source_service}`}
          size='small'
          variant='outlined'
        />
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {ticket.description || t('ticket:noDescription')}
      </Typography>
      <Divider />
      {sla && (
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Clock size={16} />
            {t('ticket:sla.info')}
            {sla.is_breached && (
              <Chip
                label={t('ticket:sla.breached')}
                size='small'
                color='error'
              />
            )}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('ticket:sla.responseLimit')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {sla.response_hours ?? '-'} {t('ticket:sla.hours')}
              </Typography>
              <Typography
                variant='caption'
                color={sla.response_breached ? 'error' : 'text.secondary'}
              >
                {sla.response_due_at
                  ? `${t('ticket:sla.deadline')}: ${new Date(sla.response_due_at).toLocaleString('zh-CN')}`
                  : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('ticket:sla.resolutionLimit')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {sla.resolution_hours ?? '-'} {t('ticket:sla.hours')}
              </Typography>
              <Typography
                variant='caption'
                color={sla.is_breached ? 'error' : 'text.secondary'}
              >
                {sla.sla_due_at
                  ? `${t('ticket:sla.deadline')}: ${new Date(sla.sla_due_at).toLocaleString('zh-CN')}`
                  : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('ticket:sla.remainingTime')}
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  color: sla.is_breached
                    ? 'error.main'
                    : (sla.time_remaining_minutes ?? 0) < 60
                      ? 'warning.main'
                      : 'text.primary',
                }}
              >
                {formatDuration(sla.time_remaining_minutes, t)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('ticket:sla.currentEscalationLevel')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  L{sla.current_escalation_level}
                </Typography>
                {sla.current_escalation_level > 0 && (
                  <AlertTriangle
                    size={14}
                    style={{ color: ct.error.main }}
                  />
                )}
              </Box>
              {sla.policy_name && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('ticket:sla.policy')}: {sla.policy_name}
                </Typography>
              )}
            </Paper>
          </Box>
          {sla.escalation_history.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 1, display: 'block' }}
              >
                {t('ticket:sla.escalationHistory')}
              </Typography>
              <Stack spacing={0.5}>
                {sla.escalation_history.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <Chip
                      label={`L${e.level}`}
                      size='small'
                      color='warning'
                    />
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {new Date(e.escalation_time).toLocaleString('zh-CN')}
                    </Typography>
                    {e.reason && <Typography variant='caption'>{e.reason}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}
      <Divider />
      <Typography variant='subtitle2'>
        {t('ticket:comments.title')} ({comments.length})
      </Typography>
      <Stack spacing={1}>
        {comments.map((c) => (
          <Box
            key={c.id}
            sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                {c.user_name?.[0] || '?'}
              </Avatar>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {c.user_name || t('ticket:comments.unknownUser')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {new Date(c.created_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Typography variant='body2'>{c.content}</Typography>
          </Box>
        ))}
      </Stack>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size='small'
          placeholder={t('ticket:comments.placeholder')}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && commentText.trim()) {
              commentMutation.mutate({ id: ticket.id, content: commentText.trim() });
            }
          }}
        />
        <Button
          variant='contained'
          size='small'
          disabled={!commentText.trim() || commentMutation.isPending}
          onClick={() => commentMutation.mutate({ id: ticket.id, content: commentText.trim() })}
        >
          <Send size={16} />
        </Button>
      </Box>
    </Stack>
  );
};

const TicketCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.TICKET_STATS_BASE,
    queryFn: async () => {
      const res = await ticketApi.getStats();
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ticketApi.updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TICKETS_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TICKET_STATS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
  });

  const stats = statsData || {
    total: 0,
    open: 0,
    in_progress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    sla_breached: 0,
  };

  const statCards = [
    { label: t('ticket:stats.all'), value: stats.total, icon: TicketIcon, color: ct.primary[500] },
    { label: t('ticket:status.open'), value: stats.open, icon: AlertCircle, color: ct.error[500] },
    {
      label: t('ticket:status.in_progress'),
      value: stats.in_progress,
      icon: Clock,
      color: ct.warning[500],
    },
    {
      label: t('ticket:status.resolved'),
      value: stats.resolved,
      icon: CheckCircle,
      color: ct.success[500],
    },
    {
      label: t('ticket:stats.slaTimeout'),
      value: stats.sla_breached,
      icon: AlertTriangle,
      color: ct.error[700],
    },
  ];

  const headerContent = React.useCallback(() => {
    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {statCards.map((card) => (
          <Paper
            key={card.label}
            sx={{ flex: '1 1 160px', minWidth: 140, p: 1.5, borderRadius: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: card.color, width: 36, height: 36 }}>
                <card.icon
                  size={18}
                  color='white'
                />
              </Avatar>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700 }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsData, t]);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'start-progress',
        label: t('ticket:actions.startProgress'),
        icon: <Clock size={16} />,
        show: (row) => row.status === 'open',
        onClick: (row) => {
          updateMutation.mutate({ id: String(row.id), data: { status: 'in_progress' } });
        },
      },
      {
        key: 'resolve',
        label: t('ticket:actions.markResolved'),
        icon: <CheckCircle size={16} />,
        show: (row) => row.status === 'in_progress',
        onClick: (row) => {
          updateMutation.mutate({ id: String(row.id), data: { status: 'resolved' } });
        },
      },
    ],
    [updateMutation, t]
  );

  const detailContent = React.useCallback((row: Record<string, unknown>) => {
    return <TicketDetailContent ticket={row as unknown as Ticket} />;
  }, []);

  return (
    <PageContainer
      title={t('ticket:page.title')}
      description={t('ticket:page.description')}
    >
      <CrudPage
        schema={ticketSchema}
        apiAdapter={ticketApiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='md'
        breadcrumbs={[
          { label: t('ticket:breadcrumb.home'), href: '/dashboard' },
          { label: t('ticket:page.title') },
        ]}
      />
    </PageContainer>
  );
};

export default TicketCenterPage;
