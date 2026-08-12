import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Search,
  Grid,
  List,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  templateApi,
  type Template,
  type TemplateCategory,
  type CreateTemplateRequest,
} from '@/api/template';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components';
import { useCrudMutations } from '@/hooks';


import { QUERY_KEYS } from '@/lib/reactQuery';

const TemplateManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templatesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.TEMPLATES_BASE, searchQuery, selectedCategory],
    queryFn: async () => {
      const response = await templateApi.list({ search: searchQuery, category: selectedCategory });
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载模板数据失败');
      }
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.TEMPLATE_CATEGORIES_BASE,
    queryFn: async () => {
      const response = await templateApi.listCategories();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载模板分类失败');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const templates = templatesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const loading = templatesQuery.isLoading || categoriesQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateTemplateRequest,
    Partial<CreateTemplateRequest>,
    string
  >({
    queryKeyToInvalidate: ['templates'],
    createFn: async (data) => {
      const response = await templateApi.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await templateApi.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await templateApi.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除失败');
      }
      return id;
    },
    entityName: '模板',
    onCreateSuccess: () => {
      setShowCreateModal(false);
    },
    onUpdateSuccess: () => {
      setShowEditModal(false);
      setSelectedTemplate(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.duplicate(id);
      if (!response.success) {
        throw new Error(response.message || '复制失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ type: 'success', title: '成功', message: '模板复制成功' });
    },
    onError: (err: unknown) => {
      apiLogger.error('复制模板失败:', err);
      addNotification({
        type: 'error',
        title: '失败',
        message: (err as Error).message || '复制失败',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.toggleStatus(id);
      if (!response.success) {
        throw new Error(response.message || '更新失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ type: 'success', title: '成功', message: '状态更新成功' });
    },
    onError: (err: unknown) => {
      apiLogger.error('切换模板状态失败:', err);
      addNotification({
        type: 'error',
        title: '失败',
        message: (err as Error).message || '更新失败',
      });
    },
  });

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdateTemplate = async (id: string, data: Partial<CreateTemplateRequest>) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleDuplicateTemplate = async (id: string) => {
    await duplicateMutation.mutateAsync(id);
  };

  const handleToggleStatus = async (id: string) => {
    await toggleStatusMutation.mutateAsync(id);
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer
      title='模板管理'
      subtitle='管理和配置系统中的各类模板'
      headerProps={{
        pageIcon: <FileText sx={{ width: 24, height: 24 }} />,
        pageColor: 'primary.main',
        actions: [
          {
            label: '新增模板',
            onClick: () => setShowCreateModal(true),
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            variant: 'contained',
          },
        ],
      }}
      maxWidth='xl'
    >
      {/* Filters */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative', flex: 1 }}>
            <Search
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                color: 'grey.400',
              }}
            />
            <TextField
              placeholder='搜索模板名称、编码...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ pl: 5, width: '100%' }}
              size='small'
            />
          </Box>

          <FormControl
            size='small'
            sx={{ minWidth: 150 }}
          >
            <InputLabel>全部分类</InputLabel>
            <Select
              value={selectedCategory}
              label='全部分类'
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value=''>全部分类</MenuItem>
              {categories.map((cat) => (
                <MenuItem
                  key={cat.id}
                  value={cat.code}
                >
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', border: 1, borderColor: 'divider' }}>
            <Button
              variant={viewMode === 'grid' ? 'contained' : 'text'}
              onClick={() => setViewMode('grid')}
              sx={{ borderRadius: 0 }}
            >
              <Grid sx={{ width: 20, height: 20 }} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'contained' : 'text'}
              onClick={() => setViewMode('list')}
              sx={{ borderRadius: 0 }}
            >
              <List sx={{ width: 20, height: 20 }} />
            </Button>
          </Box>

          <Button
            variant='outlined'
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATE_CATEGORIES_BASE ,
  exact: false,
  refetchType: 'active',
});
            }}
          >
            刷新
          </Button>
        </Box>
      </Card>

      {/* Content */}
      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Loader2
              sx={{
                width: 48,
                height: 48,
                color: 'primary.main',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
            <Typography
              color='text.secondary'
              sx={{ mt: 2 }}
            >
              加载中...
            </Typography>
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <FileText sx={{ width: 48, height: 48, color: 'grey.400', mb: 1.5 }} />
            <Typography color='text.secondary'>暂无模板数据</Typography>
          </Box>
        ) : viewMode === 'grid' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
              p: 3,
            }}
          >
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                sx={{
                  bgcolor: 'grey.50',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: 'primary.100',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText sx={{ width: 24, height: 24, color: 'primary.main' }} />
                    </Box>
                    <IconButton
                      onClick={() => handleToggleStatus(template.id)}
                      sx={{
                        color: template.isactive ? 'success.main' : 'grey.400',
                        '&:hover': {
                          bgcolor: template.isactive ? 'success.light' : 'grey.200',
                        },
                      }}
                      aria-label={template.isactive ? '已启用' : '已禁用'}
                      title={template.isactive ? '已启用' : '已禁用'}
                    >
                      {template.isactive ? (
                        <ToggleRight sx={{ width: 20, height: 20 }} />
                      ) : (
                        <ToggleLeft sx={{ width: 20, height: 20 }} />
                      )}
                    </IconButton>
                  </Box>

                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {template.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    {template.code}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      分类：
                      {categories.find((c) => c.id === template.category_id)?.name ||
                        template.category_name ||
                        '未分类'}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      模块：{template.module}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      变量数：{template.variables?.length || 0}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      pt: 2,
                      borderTop: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreviewModal(true);
                      }}
                      sx={{ color: 'primary.main' }}
                      aria-label='预览'
                      title='预览'
                    >
                      <Eye sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDuplicateTemplate(template.id)}
                      sx={{ color: 'success.main' }}
                      aria-label='复制'
                      title='复制'
                    >
                      <Copy sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowEditModal(true);
                      }}
                      sx={{ color: 'primary.main' }}
                      aria-label='编辑'
                      title='编辑'
                    >
                      <Edit sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteTemplate(template.id)}
                      sx={{ color: 'error.main' }}
                      aria-label='删除'
                      title='删除'
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box>
            {filteredTemplates.map((template, index) => (
              <Box
                key={template.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderBottom: index < filteredTemplates.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'primary.100',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText sx={{ width: 20, height: 20, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{template.name}</Typography>
                      <Chip
                        label={template.isactive ? '已启用' : '已禁用'}
                        size='small'
                        sx={{
                          bgcolor: template.isactive ? 'success.100' : 'grey.100',
                          color: template.isactive ? 'success.700' : 'grey.700',
                        }}
                      />
                    </Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {template.code} ·{' '}
                      {categories.find((c) => c.id === template.category_id)?.name ||
                        template.category_name ||
                        '未分类'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    onClick={() => handleToggleStatus(template.id)}
                    sx={{
                      color: template.isactive ? 'success.main' : 'grey.400',
                    }}
                    aria-label='切换'
                  >
                    {template.isactive ? (
                      <ToggleRight sx={{ width: 20, height: 20 }} />
                    ) : (
                      <ToggleLeft sx={{ width: 20, height: 20 }} />
                    )}
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreviewModal(true);
                    }}
                    sx={{ color: 'primary.main' }}
                    aria-label='查看'
                  >
                    <Eye sx={{ width: 16, height: 16 }} />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDuplicateTemplate(template.id)}
                    sx={{ color: 'success.main' }}
                    aria-label='复制'
                  >
                    <Copy sx={{ width: 16, height: 16 }} />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowEditModal(true);
                    }}
                    sx={{ color: 'primary.main' }}
                    aria-label='编辑'
                  >
                    <Edit sx={{ width: 16, height: 16 }} />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteTemplate(template.id)}
                    sx={{ color: 'error.main' }}
                    aria-label='删除'
                  >
                    <Trash2 sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
          categories={categories}
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
          categories={categories}
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
  template?: Template;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest) => void;
  categories: TemplateCategory[];
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit,
  categories,
}) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    code: template?.code || '',
    category_id: template?.category_id,
    module: template?.module || '',
    description: template?.description || '',
    content: template?.content || '',
    variables: template?.variables || [],
    isactive: template?.isactive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>{template ? '编辑模板' : '新增模板'}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label='模板名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder='请输入模板名称'
              size='small'
            />
            <TextField
              label='模板编码 *'
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder='请输入模板编码'
              size='small'
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl
              size='small'
              required
            >
              <InputLabel>分类 *</InputLabel>
              <Select
                value={formData.category_id || ''}
                label='分类 *'
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <MenuItem value=''>请选择分类</MenuItem>
                {categories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              required
            >
              <InputLabel>所属模块 *</InputLabel>
              <Select
                value={formData.module}
                label='所属模块 *'
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              >
                <MenuItem value=''>请选择模块</MenuItem>
                <MenuItem value='ERP'>ERP</MenuItem>
                <MenuItem value='HRM'>HRM</MenuItem>
                <MenuItem value='CRM'>CRM</MenuItem>
                <MenuItem value='QMS'>QMS</MenuItem>
                <MenuItem value='LIMS'>LIMS</MenuItem>
                <MenuItem value='其他'>其他</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label='描述'
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            placeholder='请输入模板描述'
            size='small'
          />

          <TextField
            label='模板内容 *'
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            multiline
            rows={10}
            placeholder='请输入模板内容，使用 {{variable_name}} 格式定义变量'
            size='small'
            sx={{ fontFamily: 'monospace' }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            使用 {'{{variable_name}}'} 格式定义变量
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          取消
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
        >
          {template ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>模板预览</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            {template.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            <Typography variant='body2'>编码：{template.code}</Typography>
            <Typography variant='body2'>分类：{template.category_name || '未分类'}</Typography>
            <Typography variant='body2'>模块：{template.module}</Typography>
          </Box>
          {template.description && (
            <Typography
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {template.description}
            </Typography>
          )}
        </Box>

        <Card sx={{ bgcolor: 'grey.50', p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>模板内容：</Typography>
          <Box
            component='pre'
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: 'text.secondary',
            }}
          >
            {template.content}
          </Box>
        </Card>

        {template.variables && template.variables.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>变量定义：</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {template.variables.map((variable, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      color: 'primary.main',
                    }}
                  >
                    {'{{'}
                    {variable.key}
                    {'}}'}
                  </Typography>
                  <Typography color='text.secondary'>{variable.label}</Typography>
                  <Chip
                    label={variable.type}
                    size='small'
                    sx={{ fontSize: '0.75rem' }}
                  />
                  {variable.required && (
                    <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>必填</Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateManagementPage;
