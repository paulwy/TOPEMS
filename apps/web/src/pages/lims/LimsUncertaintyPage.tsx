import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, Eye, Edit, Search } from 'lucide-react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type {
  UncertaintyProject,
  CreateUncertaintyProjectRequest,
  UpdateUncertaintyProjectRequest,
} from '@/api/lims';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
  projects?: T[];
}

interface UncertaintyProjectWithCount extends UncertaintyProject {
  sources_count?: number;
}

interface UncertaintyProjectForm extends CreateUncertaintyProjectRequest {
  project_no?: string;
  status?: string;
}

const LimsUncertaintyPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<UncertaintyProjectWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UncertaintyProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  const initialFormData: UncertaintyProjectForm = {
    project_name: '',
    method_name: '',
    status: '草稿',
  };

  const [formData, setFormData] = useState<UncertaintyProjectForm>(initialFormData);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await limsApi.listUncertaintyProjects();
      if (response.success && response.data) {
        const data = response.data as
          LimsListResponse<UncertaintyProjectWithCount> | UncertaintyProjectWithCount[];
        let rawProjects: UncertaintyProjectWithCount[] = [];
        if (Array.isArray(data)) {
          rawProjects = data;
        } else if (data.items && Array.isArray(data.items)) {
          rawProjects = data.items;
        } else if (data.projects && Array.isArray(data.projects)) {
          rawProjects = data.projects;
        }
        setProjects(rawProjects);
      } else {
        setProjects([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载不确定度项目列表失败:', err);
      setProjects([]);
      addNotification({
        title: '错误',
        message: '加载不确定度项目列表失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      草稿: { bg: 'grey.100', color: 'text.secondary' },
      计算中: { bg: 'primary.100', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.700' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<UncertaintyProjectWithCount>[] = [
    { id: 'project_no', label: '项目编号', sortable: true },
    { id: 'project_name', label: '项目名称', sortable: true },
    {
      id: 'method_name',
      label: '检测方法',
      render: (row) => row.method_name || '-',
    },
    {
      id: 'sources_count',
      label: '不确定度来源数',
      render: (row) => row.sources_count || '-',
    },
    {
      id: 'combined_uncertainty',
      label: '合成不确定度',
      render: (row) =>
        row.combined_uncertainty !== undefined && row.combined_uncertainty !== null
          ? row.combined_uncertainty.toFixed(4)
          : '-',
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    {
      id: 'created_at',
      label: '创建时间',
      render: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const rowActions: RowAction<UncertaintyProjectWithCount>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部状态', value: 'all' },
        { label: '草稿', value: '草稿' },
        { label: '计算中', value: '计算中' },
        { label: '已完成', value: '已完成' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredProjects.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (project: UncertaintyProject) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const handleEdit = (project: UncertaintyProject) => {
    setSelectedProject(project);
    setIsEditing(true);
    setFormData({
      project_name: project.project_name,
      method_id: project.method_id,
      method_name: project.method_name,
      testitem: project.testitem,
      measurand: project.measurand,
      measurement_range: project.measurement_range,
      unit: project.unit,
      evaluator: project.evaluator,
      notes: project.notes,
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setIsEditing(false);
    setFormData(initialFormData);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.project_name?.trim()) {
      addNotification({
        title: '错误',
        message: '请输入项目名称',
        type: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      if (isEditing && selectedProject) {
        const updateData: UpdateUncertaintyProjectRequest = {
          project_name: formData.project_name,
          method_id: formData.method_id,
          method_name: formData.method_name,
          testitem: formData.testitem,
          measurand: formData.measurand,
          measurement_range: formData.measurement_range,
          unit: formData.unit,
          evaluator: formData.evaluator,
          notes: formData.notes,
        };
        const response = await limsApi.updateUncertaintyProject(selectedProject.id, updateData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '不确定度项目更新成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadProjects();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '更新失败，请稍后重试',
            type: 'error',
          });
        }
      } else {
        const response = await limsApi.createUncertaintyProject(formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '不确定度项目创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadProjects();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '创建失败，请稍后重试',
            type: 'error',
          });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('保存不确定度项目失败:', err);
      addNotification({
        title: '错误',
        message: isEditing
          ? '更新不确定度项目失败，请稍后重试'
          : '创建不确定度项目失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === '草稿').length,
    calculating: projects.filter((p) => p.status === '计算中').length,
    completed: projects.filter((p) => p.status === '已完成').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: ct.orange[50] }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: ct.orange[100],
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calculator sx={{ width: 20, height: 20, color: 'warning.600' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                项目总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.total}
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
                background: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary[600]})`,
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calculator sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                草稿
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.draft}
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
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calculator sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                计算中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.calculating}
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
                background: `linear-gradient(135deg, ${ct.success.main}, ${ct.success[600]})`,
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calculator sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.orange[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: ct.orange[300],
              borderTopColor: 'warning.600',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='不确定度评定'
      subtitle='Uncertainty Evaluation'
      headerProps={{
        pageIcon: <Calculator style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.orange.main} 0%, ${ct.orange.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '不确定度评定' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索项目编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredProjects.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新建项目',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      {/* 创建/编辑 Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑不确定度项目' : '新建不确定度项目'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='项目编号 *'
                value={formData.project_no || ''}
                onChange={(e) => setFormData({ ...formData, project_no: e.target.value })}
                placeholder='请输入项目编号'
                disabled={isEditing}
              />
              <TextField
                fullWidth
                label='项目名称 *'
                value={formData.project_name || ''}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder='请输入项目名称'
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>检测方法</InputLabel>
              <Select
                value={formData.method_name || ''}
                label='检测方法'
                onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
              >
                <MenuItem value=''>请选择检测方法</MenuItem>
                <MenuItem value='GB/T 5009.11-2014'>GB/T 5009.11-2014</MenuItem>
                <MenuItem value='GB/T 5009.12-2017'>GB/T 5009.12-2017</MenuItem>
                <MenuItem value='GB/T 5009.15-2014'>GB/T 5009.15-2014</MenuItem>
                <MenuItem value='SN/T 0449-2010'>SN/T 0449-2010</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='描述'
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder='请输入项目描述'
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || '草稿'}
                label='状态'
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='草稿'>草稿</MenuItem>
                <MenuItem value='计算中'>计算中</MenuItem>
                <MenuItem value='已完成'>已完成</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: 'warning.600' }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 查看 Dialog */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>不确定度项目详情</DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  项目编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedProject.project_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  项目名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedProject.project_name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测方法
                </Box>
                <Box>{selectedProject.method_name || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedProject.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  被测量
                </Box>
                <Box>{selectedProject.measurand || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  测量范围
                </Box>
                <Box>{selectedProject.measurement_range || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  单位
                </Box>
                <Box>{selectedProject.unit || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  合成不确定度
                </Box>
                <Box>
                  {selectedProject.combined_uncertainty !== undefined &&
                  selectedProject.combined_uncertainty !== null
                    ? selectedProject.combined_uncertainty.toFixed(4)
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  扩展不确定度
                </Box>
                <Box>
                  {selectedProject.expanded_uncertainty !== undefined &&
                  selectedProject.expanded_uncertainty !== null
                    ? selectedProject.expanded_uncertainty.toFixed(4)
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  评定人
                </Box>
                <Box>{selectedProject.evaluator || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  评定日期
                </Box>
                <Box>
                  {selectedProject.evaluation_date
                    ? new Date(selectedProject.evaluation_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Box>
                  {selectedProject.created_at
                    ? new Date(selectedProject.created_at).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  备注
                </Box>
                <Box>{selectedProject.notes || '-'}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedProject) handleEdit(selectedProject);
            }}
            sx={{ bgcolor: 'warning.600' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LimsUncertaintyPage;
