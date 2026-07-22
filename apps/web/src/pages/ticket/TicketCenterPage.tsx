import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
  TablePagination,
} from '@mui/material';
import {
  Ticket,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Send,
} from 'lucide-react';

import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { ticketApi, type Ticket as TicketType, type TicketComment, type TicketSlaInfo } from '@/api/ticket';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

type TabType = 'all' | 'open' | 'in_progress' | 'resolved';

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

const TYPE_LABELS: Record<string, string> = {
  reconciliation_diff: '对账差异',
  approval_timeout: '审批超时',
  system_alert: '系统告警',
  data_issue: '数据问题',
  integration_error: '集成异常',
  user_request: '用户请求',
  other: '其他',
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

export default function TicketCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [commentText, setCommentText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const res = await ticketApi.getStats();
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', 'list', page, pageSize, activeTab, searchKeyword],
    queryFn: async () => {
      const res = await ticketApi.listTickets({
        page,
        page_size: pageSize,
        status: activeTab === 'all' ? undefined : activeTab,
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const tickets = ticketsData?.items ?? [];
  const total = ticketsData?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: ticketApi.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ticketApi.updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => ticketApi.addComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', selectedTicket?.id] });
      setCommentText('');
    },
  });

  const { data: commentsData } = useQuery({
    queryKey: ['ticket-comments', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const res = await ticketApi.getComments(selectedTicket.id);
      return res.data.data;
    },
    enabled: !!selectedTicket,
    staleTime: 30 * 1000,
  });

  const comments = (commentsData || []) as TicketComment[];

  const { data: slaInfo } = useQuery({
    queryKey: ['ticket-sla', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const res = await ticketApi.getTicketSla(selectedTicket.id);
      return res.data.data;
    },
    enabled: !!selectedTicket,
    staleTime: 60 * 1000,
  });

  const formatDuration = (minutes?: number): string => {
    if (minutes === undefined || minutes === null) return '-';
    if (minutes < 0) return `已超时 ${Math.abs(Math.floor(minutes / 60))}小时${Math.abs(minutes % 60)}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}小时${mins}分`;
    return `${mins}分钟`;
  };

  const columns: ColumnDef<TicketType>[] = useMemo(
    () => [
      {
        id: 'ticket_no',
        label: '工单号',
        width: 140,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Ticket size={16} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.ticket_no}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'title',
        label: '标题',
        flex: 2,
        render: (row) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.title}
            </Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.description}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'ticket_type',
        label: '类型',
        width: 120,
        render: (row) => (
          <Chip
            label={TYPE_LABELS[row.ticket_type] || row.ticket_type}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        id: 'severity',
        label: '级别',
        width: 100,
        render: (row) => (
          <Chip
            label={SEVERITY_LABELS[row.severity] || row.severity}
            size="small"
            color={SEVERITY_COLORS[row.severity] || 'default'}
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            label={STATUS_LABELS[row.status] || row.status}
            size="small"
            color={STATUS_COLORS[row.status] || 'default'}
          />
        ),
      },
      {
        id: 'sla',
        label: 'SLA',
        width: 120,
        render: (row) => {
          if (!row.sla_due_at || ['resolved', 'closed', 'cancelled'].includes(row.status)) {
            return <Typography variant="caption" color="text.disabled">-</Typography>;
          }
          const dueDate = new Date(row.sla_due_at);
          const now = new Date();
          const diffMs = dueDate.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const isBreached = diffMs < 0;

          return (
            <Chip
              label={formatDuration(diffMins)}
              size="small"
              color={isBreached ? 'error' : diffMins < 60 ? 'warning' : 'default'}
              variant={isBreached ? 'filled' : 'outlined'}
            />
          );
        },
      },
      {
        id: 'source_service',
        label: '来源',
        width: 100,
        render: (row) => (
          <Typography variant="caption" color="text.secondary">
            {row.source_service}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 160,
        render: (row) => (
          <Typography variant="caption" color="text.secondary">
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        width: 120,
        align: 'center',
        render: (row) => (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
            <IconButton size="small" onClick={() => { setSelectedTicket(row); setDetailOpen(true); }}>
              <Eye size={16} />
            </IconButton>
            {row.status === 'open' && (
              <IconButton
                size="small"
                onClick={() => updateMutation.mutate({ id: row.id, data: { status: 'in_progress' } })}
              >
                <Clock size={16} />
              </IconButton>
            )}
            {row.status === 'in_progress' && (
              <IconButton
                size="small"
                onClick={() => updateMutation.mutate({ id: row.id, data: { status: 'resolved' } })}
              >
                <CheckCircle size={16} />
              </IconButton>
            )}
          </Stack>
        ),
      },
    ],
    [updateMutation]
  );

  const stats = statsData || { total: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0, sla_breached: 0 };

  const statCards = [
    { label: '全部工单', value: stats.total, icon: Ticket, color: ct.primary[500] },
    { label: '待处理', value: stats.open, icon: AlertCircle, color: ct.error[500] },
    { label: '处理中', value: stats.in_progress, icon: Clock, color: ct.warning[500] },
    { label: '已解决', value: stats.resolved, icon: CheckCircle, color: ct.success[500] },
    { label: 'SLA 超时', value: stats.sla_breached, icon: AlertTriangle, color: ct.error[700] },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
  };

  return (
    <PageContainer title="工单中心" description="统一管理对账差异、审批超时、系统告警等工单">
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {statCards.map((card) => (
          <Card key={card.label} sx={{ flex: '1 1 160px', minWidth: 140 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Avatar sx={{ bgcolor: card.color, width: 36, height: 36 }}>
                <card.icon size={18} color="white" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* 标签页 */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPage(1); }}>
          <Tab value="all" label={`全部 (${stats.total})`} />
          <Tab value="open" label={`待处理 (${stats.open})`} />
          <Tab value="in_progress" label={`处理中 (${stats.in_progress})`} />
          <Tab value="resolved" label={`已解决 (${stats.resolved})`} />
        </Tabs>
      </Box>

      {/* 列表 */}
      <ListPageTemplate
        title="工单列表"
        columns={columns}
        data={tickets}
        loading={isLoading}
        pagination={{
          page: page - 1, // MUI TablePagination is 0-based
          pageSize,
          total,
          onPageChange: (newPage: number) => setPage(newPage + 1),
          onPageSizeChange: (newSize: number) => { setPageSize(newSize); setPage(1); },
        }}
        searchable
        searchPlaceholder="搜索工单..."
        searchValue={searchKeyword}
        onSearch={(value) => { setSearchKeyword(value); setPage(1); }}
        onRefresh={handleRefresh}
        actions={[
          {
            label: '新建工单',
            icon: <Plus size={18} />,
            onClick: () => setCreateOpen(true),
            variant: 'contained',
          },
        ]}
      />

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Ticket size={20} />
            {selectedTicket?.title}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTicket && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={STATUS_LABELS[selectedTicket.status]} color={STATUS_COLORS[selectedTicket.status]} size="small" />
                <Chip label={SEVERITY_LABELS[selectedTicket.severity]} color={SEVERITY_COLORS[selectedTicket.severity]} size="small" />
                <Chip label={TYPE_LABELS[selectedTicket.ticket_type] || selectedTicket.ticket_type} size="small" variant="outlined" />
                <Chip label={`来源: ${selectedTicket.source_service}`} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {selectedTicket.description || '无描述'}
              </Typography>
              <Divider />
              {/* SLA 信息 */}
              {slaInfo && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Clock size={16} />
                      SLA 信息
                      {slaInfo.is_breached && (
                        <Chip label="已超时" size="small" color="error" />
                      )}
                    </Box>
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          响应时限
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {slaInfo.response_hours} 小时
                        </Typography>
                        <Typography
                          variant="caption"
                          color={slaInfo.response_breached ? 'error' : 'text.secondary'}
                        >
                          {slaInfo.response_due_at
                            ? `截止: ${new Date(slaInfo.response_due_at).toLocaleString('zh-CN')}`
                            : '-'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          解决时限
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {slaInfo.resolution_hours} 小时
                        </Typography>
                        <Typography
                          variant="caption"
                          color={slaInfo.is_breached ? 'error' : 'text.secondary'}
                        >
                          {slaInfo.sla_due_at
                            ? `截止: ${new Date(slaInfo.sla_due_at).toLocaleString('zh-CN')}`
                            : '-'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          剩余解决时间
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: slaInfo.is_breached
                              ? 'error.main'
                              : (slaInfo.time_remaining_minutes ?? 0) < 60
                                ? 'warning.main'
                                : 'text.primary',
                          }}
                        >
                          {formatDuration(slaInfo.time_remaining_minutes)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          当前升级级别
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            L{slaInfo.current_escalation_level}
                          </Typography>
                          {slaInfo.current_escalation_level > 0 && (
                            <AlertTriangle size={14} style={{ color: ct.error.main }} />
                          )}
                        </Box>
                        {slaInfo.policy_name && (
                          <Typography variant="caption" color="text.secondary">
                            策略: {slaInfo.policy_name}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                  {slaInfo.escalation_history.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        升级历史
                      </Typography>
                      <Stack spacing={0.5}>
                        {slaInfo.escalation_history.map((e) => (
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
                            <Chip label={`L${e.level}`} size="small" color="warning" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(e.escalation_time).toLocaleString('zh-CN')}
                            </Typography>
                            {e.reason && (
                              <Typography variant="caption">{e.reason}</Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}
              <Divider />
              <Typography variant="subtitle2">评论 ({comments.length})</Typography>
              <Stack spacing={1}>
                {comments.map((c) => (
                  <Box key={c.id} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {c.user_name?.[0] || '?'}
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {c.user_name || '未知用户'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.created_at).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{c.content}</Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="输入评论..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      commentMutation.mutate({ id: selectedTicket.id, content: commentText.trim() });
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate({ id: selectedTicket.id, content: commentText.trim() })}
                >
                  <Send size={16} />
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 创建弹窗 */}
      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(data) => createMutation.mutate(data as any)}
        isSubmitting={createMutation.isPending}
      />
    </PageContainer>
  );
}

function CreateTicketDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState('user_request');
  const [severity, setSeverity] = useState('medium');
  const [sourceService, setSourceService] = useState('erp');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      ticket_type: ticketType,
      severity,
      source_service: sourceService,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>新建工单</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="标题"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="描述"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>类型</InputLabel>
            <Select value={ticketType} label="类型" onChange={(e) => setTicketType(e.target.value)}>
              <MenuItem value="reconciliation_diff">对账差异</MenuItem>
              <MenuItem value="approval_timeout">审批超时</MenuItem>
              <MenuItem value="system_alert">系统告警</MenuItem>
              <MenuItem value="data_issue">数据问题</MenuItem>
              <MenuItem value="integration_error">集成异常</MenuItem>
              <MenuItem value="user_request">用户请求</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>严重级别</InputLabel>
            <Select value={severity} label="严重级别" onChange={(e) => setSeverity(e.target.value)}>
              <MenuItem value="critical">严重</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="low">低</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>来源服务</InputLabel>
            <Select value={sourceService} label="来源服务" onChange={(e) => setSourceService(e.target.value)}>
              <MenuItem value="finance">财务</MenuItem>
              <MenuItem value="erp">ERP</MenuItem>
              <MenuItem value="hrm">HR</MenuItem>
              <MenuItem value="mes">MES</MenuItem>
              <MenuItem value="monitor">监控</MenuItem>
              <MenuItem value="workflow">流程</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}
