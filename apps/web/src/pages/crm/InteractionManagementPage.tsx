import {
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import type { Interaction, CreateInteractionRequest, UpdateInteractionRequest } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import type { RowAction, FilterConfig } from '@/components';

const InteractionManagementPage: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [formData, setFormData] = useState<CreateInteractionRequest>({
    type: 'call',
    subject: '',
    content: '',
    scheduled_at: '',
    notes: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadInteractions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, typeFilter]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await crmApi.interactions.list(params);
      if (response.success && response.data) {
        setInteractions(response.data.items || []);
      }
    } catch (error: unknown) {
      logger.error('加载交互记录列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载交互记录列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedInteraction) {
        await crmApi.interactions.update(
          selectedInteraction.id,
          formData as UpdateInteractionRequest
        );
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '交互记录已更新',
        });
      } else {
        await crmApi.interactions.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新交互记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadInteractions();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedInteraction ? '更新交互记录失败' : '创建交互记录失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条交互记录吗?')) return;
    try {
      await crmApi.interactions.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '交互记录已删除',
      });
      loadInteractions();
    } catch (error: unknown) {
      logger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除交互记录',
      });
    }
  };

  const handleEdit = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      customer_id: interaction.customer_id,
      contact_id: interaction.contact_id,
      type: interaction.type,
      subject: interaction.subject || '',
      content: interaction.content || '',
      scheduled_at: interaction.scheduled_at || '',
      notes: '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedInteraction(null);
    setFormData({
      type: 'call',
      subject: '',
      content: '',
      scheduled_at: '',
      notes: '',
    });
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      call: { label: '电话', color: 'default' },
      email: { label: '邮件', color: 'secondary' },
      meeting: { label: '会议', color: 'primary' },
      visit: { label: '拜访', color: 'info' },
      other: { label: '其他', color: 'default' },
    };
    const t = typeMap[type] || { label: type, color: 'default' };
    return (
      <Chip
        size='small'
        color={t.color}
        label={t.label}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      scheduled: { label: '已计划', color: 'info' },
      completed: { label: '已完成', color: 'success' },
      cancelled: { label: '已取消', color: 'error' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={s.color}
        label={s.label}
      />
    );
  };

  const columns = useMemo<ColumnDef<Interaction>[]>(
    () => [
      {
        id: 'subject',
        label: '主题',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.subject || '-'}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: '类型',
        render: (row) => getTypeBadge(row.type),
      },
      {
        id: 'scheduled_at',
        label: '计划时间',
        render: (row) =>
          row.scheduled_at ? new Date(row.scheduled_at).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'completed_at',
        label: '完成时间',
        render: (row) =>
          row.completed_at ? new Date(row.completed_at).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Interaction>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条交互记录吗?',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'call', label: '电话' },
          { value: 'email', label: '邮件' },
          { value: 'meeting', label: '会议' },
          { value: 'visit', label: '拜访' },
          { value: 'other', label: '其他' },
        ],
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as string);
        },
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'scheduled', label: '已计划' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
        },
      },
    ],
    [typeFilter, statusFilter]
  );

  return (
    <PageContainer
      title='交互记录管理'
      subtitle='管理客户交互记录，包括电话、邮件、会议、拜访等'
    >
      <>
        <ListPageTemplate<Interaction>
          title=''
          subtitle=''
          backButton={{
            href: '/dashboard',
          }}
          columns={columns}
          data={interactions}
          loading={loading}
          searchable
          searchPlaceholder='搜索交互主题...'
          searchValue={searchTerm}
          onSearch={(value) => {
            setSearchTerm(value);
          }}
          filters={filters}
          rowActions={rowActions}
          actions={[
            {
              label: '新增交互',
              icon: <Plus size={18} />,
              onClick: () => {
                resetForm();
                setShowDialog(true);
              },
              variant: 'contained',
            },
          ]}
        />

        <Dialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>{selectedInteraction ? '编辑交互记录' : '新增交互记录'}</DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <TextField
                  label='主题'
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='内容'
                  multiline
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='计划时间'
                  type='datetime-local'
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='备注'
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDialog(false)}>取消</Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>交互记录详情</DialogTitle>
          {selectedInteraction && (
            <DialogContent>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    主题
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {selectedInteraction.subject || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    类型
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getTypeBadge(selectedInteraction.type)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    内容
                  </Typography>
                  <Typography>{selectedInteraction.content || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    计划时间
                  </Typography>
                  <Typography>
                    {selectedInteraction.scheduled_at
                      ? new Date(selectedInteraction.scheduled_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    完成时间
                  </Typography>
                  <Typography>
                    {selectedInteraction.completed_at
                      ? new Date(selectedInteraction.completed_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedInteraction.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    创建时间
                  </Typography>
                  <Typography>
                    {new Date(selectedInteraction.created_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
          )}
        </Dialog>
      </>
    </PageContainer>
  );
};

export default InteractionManagementPage;
