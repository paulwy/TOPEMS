import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileCheck, Plus, Edit, Trash2, Eye, FileText } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { useAppStore } from '@/store';
import * as z from 'zod';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityStandard } from '@/api/qms';

const QmsStandardListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QualityStandard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    version: '',
    status: 'active' as 'active' | 'draft' | 'expired' | 'archived',
    description: '',
    effective_date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const addNotification = useAppStore((state) => state.addNotification);

  const [standards, setStandards] = useState<QualityStandard[]>([]);

  const standardSchema = z.object({
    name: z.string().min(2, '标准名称至少需要2个字符').max(100, '标准名称不能超过100个字符'),
    code: z.string().min(2, '标准编号至少需要2个字符').max(50, '标准编号不能超过50个字符'),
    category: z.string().max(50, '分类不能超过50个字符').optional(),
    version: z.string().max(20, '版本号不能超过20个字符').optional(),
    status: z.enum(['active', 'draft', 'expired', 'archived']),
    description: z.string().max(500, '描述不能超过500个字符').optional(),
  });

  const validateForm = (data: typeof formData) => {
    const result = standardSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        newErrors[field] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const loadStandards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listStandards();
      if (response.success && response.data) {
        setStandards(response.data);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载质量标准数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      有效: { bg: 'success.lighter', color: 'success.dark' },
      draft: { bg: '#fef9c3', color: '#ca8a04' },
      草稿: { bg: '#fef9c3', color: '#ca8a04' },
      expired: { bg: 'error.lighter', color: 'error.dark' },
      已过期: { bg: 'error.lighter', color: 'error.dark' },
      archived: { bg: 'grey.100', color: 'text.secondary' },
      已归档: { bg: 'grey.100', color: 'text.secondary' },
    };
    const labels: Record<string, string> = {
      active: '有效',
      有效: '有效',
      draft: '草稿',
      草稿: '草稿',
      expired: '已过期',
      已过期: '已过期',
      archived: '已归档',
      已归档: '已归档',
    };
    const colorKey = status as keyof typeof colors;
    const labelKey = status as keyof typeof labels;
    return (
      <Chip
        label={labels[labelKey] || status}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const standardColumns: ColumnDef<QualityStandard>[] = [
    { id: 'code', label: '标准编号' },
    { id: 'name', label: '标准名称' },
    { id: 'category', label: '分类' },
    {
      id: 'version',
      label: '版本',
      render: (row) => `v${row.version || '1.0'}`,
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'effective_date',
      label: '生效日期',
      render: (row) =>
        row.effective_date ? new Date(row.effective_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'created_at',
      label: '创建日期',
      render: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const viewItem = (item: QualityStandard) => {
    navigate(`/qms/standard/${item.id}`);
  };

  const editItem = (item: QualityStandard) => {
    setSelectedItem(item);
    setIsEditing(true);
    setShowModal(true);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category,
      version: item.version,
      status: (item.status as 'active' | 'draft' | 'expired' | 'archived') || 'active',
      description: item.description,
      effective_date: item.effective_date
        ? new Date(item.effective_date).toISOString().split('T')[0]
        : '',
    });
  };

  const deleteItem = async (id: string) => {
    if (!confirm('确定要删除此质量标准吗？')) return;
    try {
      const response = await qmsApi.deleteStandard(id);
      if (response.success) {
        setStandards((prev) => prev.filter((item) => item.id !== id));
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
      } else {
        addNotification({ title: '失败', message: response.message || '删除失败', type: 'error' });
      }
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '删除时发生错误', type: 'error' });
    }
  };

  const standardRowActions: RowAction<QualityStandard>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editItem(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => deleteItem(row.id),
    },
  ];

  const handleSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }
    setSubmitting(true);
    try {
      if (isEditing && selectedItem) {
        const response = await qmsApi.updateStandard(selectedItem.id, {
          name: formData.name,
          code: formData.code,
          category: formData.category,
          version: formData.version,
          status: formData.status,
          description: formData.description,
          content: selectedItem.content || '',
          effective_date: formData.effective_date,
        });
        if (response.success) {
          setStandards((prev) =>
            prev.map((item) => (item.id === selectedItem.id ? { ...item, ...response.data } : item))
          );
          addNotification({ title: '成功', message: '更新成功', type: 'success' });
        } else {
          addNotification({
            title: '失败',
            message: response.message || '更新失败',
            type: 'error',
          });
        }
      } else {
        const response = await qmsApi.createStandard({
          name: formData.name,
          code: formData.code,
          category: formData.category,
          version: formData.version || '1.0',
          status: formData.status,
          description: formData.description,
          content: '',
          effective_date: formData.effective_date,
        });
        if (response.success && response.data) {
          setStandards((prev) => [response.data!, ...prev]);
          addNotification({ title: '成功', message: '创建成功', type: 'success' });
        } else {
          addNotification({
            title: '失败',
            message: response.message || '创建失败',
            type: 'error',
          });
        }
      }
      setShowModal(false);
      setIsEditing(false);
      setFormData({
        code: '',
        name: '',
        category: '',
        version: '',
        status: 'active',
        description: '',
        effective_date: '',
      });
      setErrors({});
    } catch (error: unknown) {
      addNotification({ title: '错误', message: '操作失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStandards = useMemo(() => {
    return standards.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [standards, searchTerm, statusFilter]);

  const stats = {
    totalStandards: standards.length,
    activeStandards: standards.filter((s) => s.status === 'active' || s.status === '有效').length,
    draftStandards: standards.filter((s) => s.status === 'draft' || s.status === '草稿').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: 2,
        mb: 4,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                标准总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalStandards}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileCheck sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                有效标准
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.activeStandards}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#fef9c3',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: '#ca8a04' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                草稿状态
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.draftStandards}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: '全部' },
        { value: 'active', label: '有效' },
        { value: 'draft', label: '草稿' },
        { value: 'expired', label: '已过期' },
        { value: 'archived', label: '已归档' },
      ],
    },
  ];

  const headerActions = [
    {
      label: '新增标准',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      variant: 'contained' as const,
      color: 'primary' as const,
      onClick: () => {
        setIsEditing(false);
        setSelectedItem(null);
        setFormData({
          code: '',
          name: '',
          category: '',
          version: '1.0',
          status: 'active',
          description: '',
          effective_date: '',
        });
        setErrors({});
        setShowModal(true);
      },
    },
  ];

  return (
    <PageContainer
      title='质量标准'
      subtitle='Quality Standards'
      headerProps={{
        pageIcon: <ClipboardCheck style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        search: {
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索标准编号或名称...',
        },
        actions: headerActions,
      }}
      maxWidth='xl'
    >
      {statsCards}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            columns={standardColumns}
            data={filteredStandards}
            loading={loading}
            getRowId={(row) => row.id}
            rowActions={standardRowActions}
            searchable={false}
            filters={filters}
            actions={[]}
            onRowClick={(row) => viewItem(row as QualityStandard)}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑质量标准' : '新增质量标准'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  标准编号 *
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.code}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, code: e.target.value }));
                    if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                  }}
                  placeholder='QS-XXXX-XXX'
                  error={!!errors.code}
                />
                {errors.code && (
                  <Typography
                    variant='caption'
                    sx={{ color: 'error.main', fontSize: '0.875rem' }}
                  >
                    {errors.code}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  版本号
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder='如 1.0'
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                标准名称 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder='请输入标准名称'
                error={!!errors.name}
              />
              {errors.name && (
                <Typography
                  variant='caption'
                  sx={{ color: 'error.main', fontSize: '0.875rem' }}
                >
                  {errors.name}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  分类
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder='请输入分类'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  状态
                </Box>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>请选择</InputLabel>
                  <Select
                    value={formData.status}
                    label='请选择'
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as 'active' | 'draft' | 'expired' | 'archived',
                      }))
                    }
                  >
                    <MenuItem value='active'>有效</MenuItem>
                    <MenuItem value='draft'>草稿</MenuItem>
                    <MenuItem value='expired'>已过期</MenuItem>
                    <MenuItem value='archived'>已归档</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                生效日期
              </Box>
              <TextField
                type='date'
                size='small'
                fullWidth
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                标准描述
              </Box>
              <TextField
                size='small'
                fullWidth
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                placeholder='请输入标准描述...'
                error={!!errors.description}
              />
              {errors.description && (
                <Typography
                  variant='caption'
                  sx={{ color: 'error.main', fontSize: '0.875rem' }}
                >
                  {errors.description}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '保存中...' : isEditing ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsStandardListPage;
