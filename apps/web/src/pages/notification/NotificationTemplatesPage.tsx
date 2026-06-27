import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  Search,
  Archive,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Button } from '@mui/material';
import type {
  NotificationTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateStatusEnum,
  NotificationTypeEnum,
} from '@/api/notification';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/api/notification';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';

const NotificationTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatusEnum | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedStatus, debouncedSearch]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus || undefined;
      const searchParam = debouncedSearch || undefined;
      const response = await getTemplates(page, 20, statusParam, searchParam);
      if (response.success && response.data) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    try {
      const res = await createTemplate(data);
      if (res.success) {
        success('模板创建成功');
        setShowCreateModal(false);
        loadTemplates();
      } else {
        error(res.message || '创建失败');
      }
    } catch (err: unknown) {
      error((err as { message?: string }).message || '创建失败');
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    data: CreateTemplateRequest | UpdateTemplateRequest
  ) => {
    try {
      const updateData: UpdateTemplateRequest = { ...data, id };
      const res = await updateTemplate(id, updateData);
      if (res.success) {
        success('模板更新成功');
        setShowEditModal(false);
        setSelectedTemplate(null);
        loadTemplates();
      } else {
        error(res.message || '更新失败');
      }
    } catch (err: unknown) {
      error((err as { message?: string }).message || '更新失败');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const res = await deleteTemplate(id);
      if (res.success) {
        success('模板删除成功');
        loadTemplates();
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: unknown) {
      error((err as { message?: string }).message || '删除失败');
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const template = templates.find((t) => t.id === id);
      if (!template) return;

      const res = await updateTemplate(id, {
        id,
        status:
          template.status === 'active'
            ? ('inactive' as TemplateStatusEnum)
            : ('active' as TemplateStatusEnum),
      });
      if (res.success) {
        success('模板状态更新成功');
        loadTemplates();
      } else {
        error(res.message || '更新失败');
      }
    } catch (err: unknown) {
      error((err as { message?: string }).message || '更新失败');
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!debouncedSearch) return templates;
    const query = debouncedSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.title_template.toLowerCase().includes(query)
    );
  }, [templates, debouncedSearch]);

  const getStatusBadge = (status: TemplateStatusEnum) => {
    switch (status) {
      case 'active':
        return (
          <Box
            component='span'
            sx={{
              px: 1,
              py: 0.5,
              fontSize: '0.75rem',
              borderRadius: 4,
              bgcolor: 'success.100',
              color: 'success.700',
            }}
          >
            启用
          </Box>
        );
      case 'inactive':
        return (
          <Box
            component='span'
            sx={{
              px: 1,
              py: 0.5,
              fontSize: '0.75rem',
              borderRadius: 4,
              bgcolor: 'grey.100',
              color: 'grey.700',
            }}
          >
            禁用
          </Box>
        );
      case 'deprecated':
        return (
          <Box
            component='span'
            sx={{
              px: 1,
              py: 0.5,
              fontSize: '0.75rem',
              borderRadius: 4,
              bgcolor: 'error.100',
              color: 'error.700',
            }}
          >
            废弃
          </Box>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: '系统通知',
      workflow: '审批通知',
      reminder: '提醒通知',
      alert: '告警通知',
      message: '消息通知',
      info: '信息通知',
      success: '成功通知',
      warning: '警告通知',
      error: '错误通知',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    const colors: Record<NotificationTypeEnum, { bg: string; text: string }> = {
      system: { bg: 'primary.100', text: 'primary.700' },
      workflow: { bg: 'purple.100', text: 'purple.700' },
      reminder: { bg: 'warning.100', text: 'warning.700' },
      alert: { bg: 'error.100', text: 'error.700' },
      message: { bg: 'success.100', text: 'success.700' },
      info: { bg: 'info.100', text: 'info.700' },
      success: { bg: 'success.100', text: 'success.700' },
      warning: { bg: 'warning.100', text: 'warning.700' },
      error: { bg: 'error.100', text: 'error.700' },
    };
    return colors[type] || { bg: 'grey.100', text: 'grey.700' };
  };

  const columns: ColumnDef<NotificationTemplate>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '模板名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}
            >
              <Bell
                size={20}
                color='#1976d2'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {row.name}
              </Typography>
              {row.description && (
                <Typography
                  variant='body2'
                  sx={{
                    fontSize: '0.75rem',
                    color: 'grey.500',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'notification_type',
        label: '类型',
        render: (row) => {
          const typeColor = getTypeColor(row.notification_type);
          return (
            <Box
              component='span'
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.75rem',
                borderRadius: 4,
                ...typeColor,
              }}
            >
              {getTypeLabel(row.notification_type)}
            </Box>
          );
        },
      },
      {
        id: 'title_template',
        label: '标题模板',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              color: 'grey.900',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.title_template}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'default_priority',
        label: '优先级',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {(row.default_priority ?? 0) >= 4
              ? '紧急'
              : (row.default_priority ?? 0) >= 3
                ? '高'
                : (row.default_priority ?? 0) >= 2
                  ? '中'
                  : '低'}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleDateString('zh-CN')}
          </Typography>
        ),
      },
    ],

    []
  );

  const rowActions: RowAction<NotificationTemplate>[] = useMemo(
    () => [
      {
        label: '预览',
        icon: <Eye size={16} />,
        onClick: (row) => {
          setSelectedTemplate(row);
          setShowPreviewModal(true);
        },
      },
      {
        label: '启用/禁用',
        icon: <Archive size={16} />,
        onClick: (row) => handleToggleArchive(row.id),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => {
          setSelectedTemplate(row);
          setShowEditModal(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteTemplate(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个模板吗？',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部状态' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
          { value: 'deprecated', label: '废弃' },
        ],
      },
    ],

    []
  );

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (filters.status !== undefined) {
      setSelectedStatus(filters.status);
      setPage(1);
    }
  }, []);

  return (
    <PageContainer
      title='通知模板管理'
      subtitle='管理系统通知模板'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          onClick: () => navigate('/notifications'),
        }}
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索模板名称、描述...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: selectedStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: page - 1,
          pageSize: 20,
          total,
          onPageChange: (p) => setPage(p + 1),
        }}
        rowActions={rowActions}
        onRefresh={loadTemplates}
        actions={[
          {
            label: '新增模板',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        emptyIcon={<FileText style={{ width: 48, height: 48, color: '#9e9e9e' }} />}
        emptyMessage='暂无模板数据'
      />

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={
            handleCreateTemplate as (data: CreateTemplateRequest | UpdateTemplateRequest) => void
          }
        />
      )}

      {showEditModal && selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={(data) => handleUpdateTemplate(selectedTemplate.id, data)}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </PageContainer>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  template?: NotificationTemplate;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({ template, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    description: template?.description || '',
    notification_type: template?.notification_type || 'system',
    title_template: template?.title_template || '',
    content_template: template?.content_template || '',
    data_schema: template?.data_schema || undefined,
    default_priority: template?.default_priority || 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: 'grey.900' }}
          >
            {template ? '编辑模板' : '新增模板'}
          </Typography>
        </Box>

        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ flex: 1, overflowY: 'auto', p: 3 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
                >
                  模板名称 *
                </Typography>
                <Box
                  component='input'
                  type='text'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  sx={{
                    width: '100%',
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:focus': {
                      outline: 'none',
                      borderColor: 'primary.main',
                      boxShadow: 2,
                    },
                  }}
                  placeholder='请输入模板名称'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
                >
                  通知类型 *
                </Typography>
                <Box
                  component='select'
                  required
                  value={formData.notification_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notification_type: e.target.value as NotificationTypeEnum,
                    })
                  }
                  sx={{
                    width: '100%',
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:focus': {
                      outline: 'none',
                      borderColor: 'primary.main',
                      boxShadow: 2,
                    },
                  }}
                >
                  <option value='system'>系统通知</option>
                  <option value='workflow'>审批通知</option>
                  <option value='reminder'>提醒通知</option>
                  <option value='alert'>告警通知</option>
                  <option value='message'>消息通知</option>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
              >
                描述
              </Typography>
              <Box
                component='textarea'
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{
                  width: '100%',
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  '&:focus': {
                    outline: 'none',
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                }}
                rows={2}
                placeholder='请输入模板描述'
              />
            </Box>

            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
              >
                标题模板 *
              </Typography>
              <Box
                component='input'
                type='text'
                required
                value={formData.title_template}
                onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                sx={{
                  width: '100%',
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  '&:focus': {
                    outline: 'none',
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                }}
                placeholder='请输入标题模板，使用 {{variable}} 格式定义变量'
              />
            </Box>

            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
              >
                内容模板 *
              </Typography>
              <Box
                component='textarea'
                required
                value={formData.content_template}
                onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                sx={{
                  width: '100%',
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  '&:focus': {
                    outline: 'none',
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                  fontFamily: 'monospace',
                }}
                rows={6}
                placeholder='请输入内容模板，使用 {{variable}} 格式定义变量'
              />
              <Typography
                variant='body2'
                sx={{ fontSize: '0.75rem', color: 'grey.500', mt: 0.5 }}
              >
                使用 {'{{variable}}'} 格式定义变量
              </Typography>
            </Box>

            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
              >
                默认优先级
              </Typography>
              <Box
                component='select'
                value={formData.default_priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_priority: parseInt(e.target.value),
                  })
                }
                sx={{
                  width: '100%',
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  '&:focus': {
                    outline: 'none',
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                }}
              >
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
                <option value={4}>紧急</option>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Box
            component='button'
            type='button'
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              color: 'grey.700',
              bgcolor: 'grey.100',
              borderRadius: 2,
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            取消
          </Box>
          <Box
            component='button'
            onClick={handleSubmit}
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 2,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {template ? '保存' : '创建'}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: NotificationTemplate;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: '系统通知',
      workflow: '审批通知',
      reminder: '提醒通知',
      alert: '告警通知',
      message: '消息通知',
      info: '信息通知',
      success: '成功通知',
      warning: '警告通知',
      error: '错误通知',
    };
    return labels[type] || type;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: 'grey.900' }}
          >
            模板预览
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
            >
              {template.name}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontSize: '0.875rem',
                color: 'grey.500',
              }}
            >
              <span>类型：{getTypeLabel(template.notification_type)}</span>
              <span>状态：{template.status}</span>
              <span>优先级：{template.default_priority}</span>
            </Box>
            {template.description && (
              <Typography
                variant='body2'
                sx={{ mt: 1, color: 'grey.600' }}
              >
                {template.description}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: 'grey.200',
              mb: 2,
            }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 600, color: 'grey.900', mb: 1 }}
            >
              标题模板：
            </Typography>
            <Box
              component='pre'
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                color: 'grey.700',
                fontFamily: 'monospace',
              }}
            >
              {template.title_template}
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 600, color: 'grey.900', mb: 1 }}
            >
              内容模板：
            </Typography>
            <Box
              component='pre'
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                color: 'grey.700',
                fontFamily: 'monospace',
              }}
            >
              {template.content_template}
            </Box>
          </Box>

          {template.data_schema && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, color: 'grey.900', mb: 1 }}
              >
                数据模式：
              </Typography>
              <Box
                component='pre'
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.75rem',
                  color: 'grey.700',
                  fontFamily: 'monospace',
                  bgcolor: 'grey.50',
                  p: 2,
                  borderRadius: 2,
                }}
              >
                {JSON.stringify(template.data_schema, null, 2)}
              </Box>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Box
            component='button'
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'grey.100',
              color: 'grey.700',
              borderRadius: 2,
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            关闭
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const getTypeLabel = (type: NotificationTypeEnum) => {
  const labels: Record<NotificationTypeEnum, string> = {
    system: '系统通知',
    workflow: '审批通知',
    reminder: '提醒通知',
    alert: '告警通知',
    message: '消息通知',
    info: '信息通知',
    success: '成功通知',
    warning: '警告通知',
    error: '错误通知',
  };
  return labels[type] || type;
};

export default NotificationTemplatesPage;
