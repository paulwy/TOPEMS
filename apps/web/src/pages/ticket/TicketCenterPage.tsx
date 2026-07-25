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
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { ticketApi } from '@/api/ticket';
import type {
  Ticket,
  TicketComment,
  TicketSlaInfo,
  CreateTicketRequest,
  UpdateTicketRequest,
} from '@/api/ticket';
import { ticketSchema } from '@/schemas/ticket';

const ct = designTokens.colors;

const STATUS_LABELS: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  pending: '等待中',
  resolved: '已解决',
  closed: '已关闭',
  cancelled: '已取消',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

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
    throw new Error('工单暂不支持删除');
  },
};

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '-';
  if (minutes < 0)
    return `已超时 ${Math.abs(Math.floor(minutes / 60))}小时${Math.abs(minutes % 60)}分`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分钟`;
}

const TicketDetailContent: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: commentsData } = useQuery({
    queryKey: ['ticket-comments', ticket.id],
    queryFn: async () => {
      const res = await ticketApi.getComments(ticket.id);
      return res.data.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: slaInfo } = useQuery({
    queryKey: ['ticket-sla', ticket.id],
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
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticket.id] });
      setCommentText('');
    },
  });

  const comments = (commentsData || []) as TicketComment[];
  const sla = slaInfo as TicketSlaInfo | null;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={STATUS_LABELS[ticket.status] || ticket.status}
          color={STATUS_COLORS[ticket.status] || 'default'}
          size='small'
        />
        <Chip
          label={SEVERITY_LABELS[ticket.severity] || ticket.severity}
          color={SEVERITY_COLORS[ticket.severity] || 'default'}
          size='small'
        />
        <Chip
          label={`来源: ${ticket.source_service}`}
          size='small'
          variant='outlined'
        />
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {ticket.description || '无描述'}
      </Typography>
      <Divider />
      {sla && (
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Clock size={16} />
            SLA 信息
            {sla.is_breached && (
              <Chip
                label='已超时'
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
                响应时限
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {sla.response_hours ?? '-'} 小时
              </Typography>
              <Typography
                variant='caption'
                color={sla.response_breached ? 'error' : 'text.secondary'}
              >
                {sla.response_due_at
                  ? `截止: ${new Date(sla.response_due_at).toLocaleString('zh-CN')}`
                  : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                解决时限
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {sla.resolution_hours ?? '-'} 小时
              </Typography>
              <Typography
                variant='caption'
                color={sla.is_breached ? 'error' : 'text.secondary'}
              >
                {sla.sla_due_at ? `截止: ${new Date(sla.sla_due_at).toLocaleString('zh-CN')}` : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                剩余解决时间
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
                {formatDuration(sla.time_remaining_minutes)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                当前升级级别
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
                  策略: {sla.policy_name}
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
                升级历史
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
      <Typography variant='subtitle2'>评论 ({comments.length})</Typography>
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
                {c.user_name || '未知用户'}
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
          placeholder='输入评论...'
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
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const res = await ticketApi.getStats();
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ticketApi.updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
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
    { label: '全部工单', value: stats.total, icon: TicketIcon, color: ct.primary[500] },
    { label: '待处理', value: stats.open, icon: AlertCircle, color: ct.error[500] },
    { label: '处理中', value: stats.in_progress, icon: Clock, color: ct.warning[500] },
    { label: '已解决', value: stats.resolved, icon: CheckCircle, color: ct.success[500] },
    { label: 'SLA 超时', value: stats.sla_breached, icon: AlertTriangle, color: ct.error[700] },
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
  }, [statsData]);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'start-progress',
        label: '开始处理',
        icon: <Clock size={16} />,
        show: (row) => row.status === 'open',
        onClick: (row) => {
          updateMutation.mutate({ id: String(row.id), data: { status: 'in_progress' } });
        },
      },
      {
        key: 'resolve',
        label: '标记已解决',
        icon: <CheckCircle size={16} />,
        show: (row) => row.status === 'in_progress',
        onClick: (row) => {
          updateMutation.mutate({ id: String(row.id), data: { status: 'resolved' } });
        },
      },
    ],
    [updateMutation]
  );

  const detailContent = React.useCallback((row: Record<string, unknown>) => {
    return <TicketDetailContent ticket={row as unknown as Ticket} />;
  }, []);

  return (
    <PageContainer
      title='工单中心'
      description='统一管理对账差异、审批超时、系统告警等工单'
    >
      <CrudPage
        schema={ticketSchema}
        apiAdapter={ticketApiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='md'
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '工单中心' }]}
      />
    </PageContainer>
  );
};

export default TicketCenterPage;
