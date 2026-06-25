import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Eye, AlertTriangle } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { qmsApi, type QualityIssue } from '@/api/qms';
import { useAppStore } from '@/store';

const SEVERITY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: '严重', bg: 'error.lighter', color: 'error.dark' },
  medium: { label: '一般', bg: '#fef9c3', color: '#ca8a04' },
  low: { label: '轻微', bg: 'success.lighter', color: 'success.dark' },
  critical: { label: '危急', bg: 'error.lighter', color: 'error.dark' },
};

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: '待评审', bg: '#fef9c3', color: '#ca8a04' },
  in_progress: { label: '处理中', bg: '#dbeafe', color: 'primary.dark' },
  resolved: { label: '已解决', bg: '#dbeafe', color: 'primary.dark' },
  closed: { label: '已关闭', bg: 'success.lighter', color: 'success.dark' },
  pending: { label: '待处理', bg: '#fef9c3', color: '#ca8a04' },
};

const CATEGORY_MAP: Record<string, string> = {
  appearance: '外观缺陷',
  dimension: '尺寸偏差',
  performance: '性能不达标',
  packaging: '包装破损',
  material: '材料混用',
  incoming: '来料检验',
  process: '过程检验',
  final: '成品检验',
};

const getSeverityLabel = (severity: string): string => {
  return SEVERITY_MAP[severity]?.label || severity;
};

const getCategoryLabel = (category: string): string => {
  return CATEGORY_MAP[category] || category;
};

const QmsNonconformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'appearance',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const response = await qmsApi.listIssues();
      if (response.success && response.data) {
        setIssues(response.data);
      } else if (!response.success) {
        addNotification({
          title: '加载失败',
          message: response.message || '加载不合格品数据失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to load issues:', error);
      addNotification({
        title: '加载失败',
        message: '加载不合格品数据失败',
        type: 'error',
      });
    }
    setLoading(false);
  };

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_MAP[severity] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: severity,
    };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{
          backgroundColor: config.bg,
          color: config.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{
          backgroundColor: config.bg,
          color: config.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<QualityIssue>[] = [
    { id: 'issue_no', label: '不合格单号' },
    { id: 'title', label: '问题标题' },
    {
      id: 'category',
      label: '不合格类型',
      render: (row) => getCategoryLabel(row.category),
    },
    {
      id: 'severity',
      label: '严重程度',
      render: (row) => getSeverityBadge(row.severity),
    },
    { id: 'assignee', label: '负责人' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions: RowAction<QualityIssue>[] = [
    {
      label: '详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '关闭',
      icon: <AlertTriangle style={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status !== 'closed',
      onClick: (row) => handleClose(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'category',
      label: '不合格类型',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '外观缺陷', value: 'appearance' },
        { label: '尺寸偏差', value: 'dimension' },
        { label: '性能不达标', value: 'performance' },
        { label: '包装破损', value: 'packaging' },
        { label: '材料混用', value: 'material' },
      ],
      value: categoryFilter,
      onChange: (value) => setCategoryFilter(value),
    },
    {
      id: 'severity',
      label: '严重程度',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '严重', value: 'high' },
        { label: '一般', value: 'medium' },
        { label: '轻微', value: 'low' },
      ],
      value: severityFilter,
      onChange: (value) => setSeverityFilter(value),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待评审', value: 'open' },
        { label: '处理中', value: 'in_progress' },
        { label: '已关闭', value: 'closed' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value),
    },
  ];

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issue_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const paginatedData = filteredIssues.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (issue: QualityIssue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      category: 'appearance',
    });
    setShowCreateModal(true);
  };

  const handleClose = async (issue: QualityIssue) => {
    try {
      const response = await qmsApi.updateIssue(issue.id, {
        issue_no: issue.issue_no,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        category: issue.category,
        status: 'closed',
        assignee: issue.assignee,
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '不合格品已关闭',
          type: 'success',
        });
        loadIssues();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '关闭失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to close issue:', error);
      addNotification({
        title: '错误',
        message: '关闭时发生错误',
        type: 'error',
      });
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const response = await qmsApi.createIssue({
        issue_no: `ISS-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        category: formData.category,
        status: 'open',
        assignee: '',
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '不合格品创建成功',
          type: 'success',
        });
        loadIssues();
        setShowCreateModal(false);
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to create issue:', error);
      addNotification({
        title: '错误',
        message: '创建不合格品时发生错误',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'open' || i.status === 'pending').length,
    inProgress: issues.filter((i) => i.status === 'in_progress').length,
    closed: issues.filter((i) => i.status === 'closed').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'primary.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'error.lighter',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                不合格品总数
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
                bgcolor: 'warning.light',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: '#ca8a04' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待评审
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.open}
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
                bgcolor: '#dbeafe',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                处理中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgress}
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
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已关闭
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.closed}
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
          background: 'linear-gradient(135deg, primary.light 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'primary.main',
              borderTopColor: 'primary.dark',
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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, primary.light 0%, #f8fafc 100%)',
      }}
    >
      <ListPageTemplate
        title='不合格品管理'
        subtitle='Nonconformance Management'
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'QMS' },
          { label: '不合格品管理' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索问题标题或单号...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredIssues.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新建不合格单',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建不合格单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='问题标题 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder='请输入问题标题'
            />
            <TextField
              fullWidth
              label='问题描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入问题描述'
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>不合格类型</InputLabel>
              <Select
                value={formData.category}
                label='不合格类型'
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value='appearance'>外观缺陷</MenuItem>
                <MenuItem value='dimension'>尺寸偏差</MenuItem>
                <MenuItem value='performance'>性能不达标</MenuItem>
                <MenuItem value='packaging'>包装破损</MenuItem>
                <MenuItem value='material'>材料混用</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={formData.severity}
                label='严重程度'
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <MenuItem value='low'>轻微</MenuItem>
                <MenuItem value='medium'>一般</MenuItem>
                <MenuItem value='high'>严重</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'primary.main' }}
            disabled={submitting}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>不合格品详情</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  不合格单号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedIssue.issue_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  问题标题
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedIssue.title}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  不合格类型
                </Box>
                <Box>{getCategoryLabel(selectedIssue.category)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  严重程度
                </Box>
                <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedIssue.severity)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  负责人
                </Box>
                <Box>{selectedIssue.assignee || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedIssue.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  问题描述
                </Box>
                <Box>{selectedIssue.description || '-'}</Box>
              </Box>
              {selectedIssue.resolution && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    解决方案
                  </Box>
                  <Box>{selectedIssue.resolution}</Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedIssue && selectedIssue.status !== 'closed' && (
            <Button
              variant='contained'
              onClick={async () => {
                await handleClose(selectedIssue);
                setShowDetailModal(false);
              }}
              sx={{ bgcolor: 'success.dark' }}
            >
              关闭
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QmsNonconformancePage;
